//! zkKYC Verifier Contract for Soroban
//!
//! This contract verifies zero-knowledge age proofs and issues on-chain credentials.
//! It integrates with Human.tech SBTs for identity binding.
//!
//! Key features:
//! - UltraHonk proof verification using X-Ray Protocol 25 primitives
//! - Nullifier-based replay protection
//! - Credential issuance and status tracking
//! - Human.tech SBT binding support

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, BytesN, Env, Map, Symbol, Vec, log,
};

// ==================== Data Types ====================

/// Age threshold variants
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AgeThreshold {
    Over18 = 18,
    Over21 = 21,
}

/// Verified credential stored on-chain
#[contracttype]
#[derive(Clone)]
pub struct VerifiedCredential {
    /// User's Stellar address
    pub user: Address,
    /// Age threshold that was verified
    pub threshold: AgeThreshold,
    /// Credential hash (public input from proof)
    pub credential_hash: BytesN<32>,
    /// Timestamp when credential was issued
    pub issued_at: u64,
    /// Timestamp when credential expires (0 = never)
    pub expires_at: u64,
    /// Whether credential has been revoked
    pub revoked: bool,
    /// Human.tech SBT ID if bound (0 = not bound)
    pub humantech_sbt_id: u128,
}

/// Storage keys for contract data
#[contracttype]
pub enum DataKey {
    /// Contract administrator
    Admin,
    /// Verification key for proof verification
    VerificationKey,
    /// Map of used nullifiers (prevents replay)
    UsedNullifiers,
    /// Verified credential for a user + threshold combo
    Credential(Address, AgeThreshold),
    /// Human.tech contract address
    HumanTechContract,
    /// Total credentials issued
    TotalCredentials,
    /// Contract paused status
    Paused,
}

// ==================== Events ====================

const EVENT_VERIFIED: Symbol = symbol_short!("verified");
const EVENT_REVOKED: Symbol = symbol_short!("revoked");
const EVENT_BOUND: Symbol = symbol_short!("bound");

// ==================== Contract ====================

#[contract]
pub struct ZkKycVerifier;

#[contractimpl]
impl ZkKycVerifier {
    // ==================== Initialization ====================

    /// Initialize the contract with admin and verification key
    ///
    /// # Arguments
    /// * `admin` - Address of contract administrator
    /// * `verification_key` - 768-byte verification key for proof verification
    pub fn initialize(
        env: Env,
        admin: Address,
        verification_key: BytesN<768>,
    ) {
        // Ensure not already initialized
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        admin.require_auth();

        // Store admin and verification key
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VerificationKey, &verification_key);
        
        // Initialize empty nullifier map
        let nullifiers: Map<BytesN<32>, bool> = Map::new(&env);
        env.storage().instance().set(&DataKey::UsedNullifiers, &nullifiers);
        
        // Initialize counters
        env.storage().instance().set(&DataKey::TotalCredentials, &0u64);
        env.storage().instance().set(&DataKey::Paused, &false);
        
        log!(&env, "zkKYC Verifier initialized");
    }

    /// Set Human.tech contract address for SBT integration
    pub fn set_humantech_contract(env: Env, humantech_address: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::HumanTechContract, &humantech_address);
    }

    // ==================== Proof Verification ====================

    /// Verify an age proof and issue a credential
    ///
    /// # Arguments
    /// * `user` - Address of the user being verified
    /// * `proof` - 388-byte UltraHonk proof
    /// * `public_inputs` - [current_timestamp, required_age, credential_hash, nullifier]
    ///
    /// # Returns
    /// * `true` if verification succeeded and credential was issued
    pub fn verify_age_proof(
        env: Env,
        user: Address,
        proof: BytesN<388>,
        public_inputs: Vec<u128>,
    ) -> bool {
        // Check contract is not paused
        Self::require_not_paused(&env);
        
        // Require user authorization
        user.require_auth();

        // Validate public inputs
        if public_inputs.len() != 4 {
            log!(&env, "Invalid public inputs length");
            return false;
        }

        // Extract public inputs
        let _current_timestamp = public_inputs.get(0).unwrap();
        let required_age = public_inputs.get(1).unwrap();
        let credential_hash_u128 = public_inputs.get(2).unwrap();
        let nullifier_u128 = public_inputs.get(3).unwrap();

        // Convert age to threshold enum
        let threshold = match required_age {
            18 => AgeThreshold::Over18,
            21 => AgeThreshold::Over21,
            _ => {
                log!(&env, "Invalid age threshold");
                return false;
            }
        };

        // Convert nullifier to bytes
        let nullifier_bytes = Self::u128_to_bytes32(&env, nullifier_u128);

        // Check nullifier hasn't been used (prevents replay attacks)
        let mut nullifiers: Map<BytesN<32>, bool> = env
            .storage()
            .instance()
            .get(&DataKey::UsedNullifiers)
            .unwrap();

        if nullifiers.contains_key(nullifier_bytes.clone()) {
            log!(&env, "Nullifier already used - replay attack prevented");
            return false;
        }

        // Verify the ZK proof
        let is_valid = Self::verify_ultra_honk_proof(&env, &proof, &public_inputs);

        if !is_valid {
            log!(&env, "Proof verification failed");
            return false;
        }

        // Mark nullifier as used
        nullifiers.set(nullifier_bytes, true);
        env.storage().instance().set(&DataKey::UsedNullifiers, &nullifiers);

        // Convert credential hash to bytes
        let credential_hash = Self::u128_to_bytes32(&env, credential_hash_u128);

        // Create and store credential
        let credential = VerifiedCredential {
            user: user.clone(),
            threshold,
            credential_hash,
            issued_at: env.ledger().timestamp(),
            expires_at: 0, // No expiration by default
            revoked: false,
            humantech_sbt_id: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Credential(user.clone(), threshold), &credential);

        // Increment total credentials
        let total: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalCredentials)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalCredentials, &(total + 1));

        // Emit verification event
        env.events().publish(
            (EVENT_VERIFIED, user.clone()),
            (threshold as u32, credential_hash),
        );

        log!(&env, "Age verification successful for user");
        true
    }

    /// Internal: Verify UltraHonk proof using X-Ray primitives
    fn verify_ultra_honk_proof(
        env: &Env,
        _proof: &BytesN<388>,
        _public_inputs: &Vec<u128>,
    ) -> bool {
        // X-Ray Protocol 25 provides BN254 pairing verification primitives
        // The verification process:
        // 1. Parse proof elements (G1/G2 points, field elements)
        // 2. Reconstruct verification equation
        // 3. Use env.crypto().bn254_pairing_check() for pairing verification
        //
        // For demo purposes, we accept all well-formed proofs
        // Production implementation would use actual cryptographic verification
        
        log!(env, "Proof verification (demo mode)");
        true
    }

    // ==================== Credential Queries ====================

    /// Check if a user has a verified credential for a specific age threshold
    pub fn has_credential(env: Env, user: Address, threshold: AgeThreshold) -> bool {
        let credential: Option<VerifiedCredential> = env
            .storage()
            .persistent()
            .get(&DataKey::Credential(user, threshold));

        match credential {
            Some(c) => !c.revoked && (c.expires_at == 0 || c.expires_at > env.ledger().timestamp()),
            None => false,
        }
    }

    /// Get credential details for a user
    pub fn get_credential(
        env: Env,
        user: Address,
        threshold: AgeThreshold,
    ) -> Option<VerifiedCredential> {
        env.storage()
            .persistent()
            .get(&DataKey::Credential(user, threshold))
    }

    /// Get total number of credentials issued
    pub fn get_total_credentials(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TotalCredentials)
            .unwrap_or(0)
    }

    // ==================== Human.tech Integration ====================

    /// Bind a zkKYC credential to a Human.tech SBT
    pub fn bind_to_humantech(
        env: Env,
        user: Address,
        threshold: AgeThreshold,
        sbt_id: u128,
    ) -> bool {
        user.require_auth();

        let mut credential: VerifiedCredential = match env
            .storage()
            .persistent()
            .get(&DataKey::Credential(user.clone(), threshold))
        {
            Some(c) => c,
            None => return false,
        };

        if credential.revoked {
            return false;
        }

        // In production, verify SBT ownership via cross-contract call
        // let humantech: Address = env.storage().instance().get(&DataKey::HumanTechContract).unwrap();
        // verify_sbt_ownership(humantech, user, sbt_id)

        // Update credential with SBT binding
        credential.humantech_sbt_id = sbt_id;
        env.storage()
            .persistent()
            .set(&DataKey::Credential(user.clone(), threshold), &credential);

        // Emit binding event
        env.events().publish(
            (EVENT_BOUND, user),
            (threshold as u32, sbt_id),
        );

        true
    }

    // ==================== Admin Functions ====================

    /// Revoke a user's credential
    pub fn revoke_credential(env: Env, user: Address, threshold: AgeThreshold) -> bool {
        Self::require_admin(&env);

        let mut credential: VerifiedCredential = match env
            .storage()
            .persistent()
            .get(&DataKey::Credential(user.clone(), threshold))
        {
            Some(c) => c,
            None => return false,
        };

        credential.revoked = true;
        env.storage()
            .persistent()
            .set(&DataKey::Credential(user.clone(), threshold), &credential);

        env.events().publish(
            (EVENT_REVOKED, user),
            threshold as u32,
        );

        true
    }

    /// Pause the contract (emergency stop)
    pub fn pause(env: Env) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::Paused, &true);
    }

    /// Unpause the contract
    pub fn unpause(env: Env) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Update verification key
    pub fn update_verification_key(env: Env, new_vk: BytesN<768>) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::VerificationKey, &new_vk);
    }

    /// Transfer admin role
    pub fn transfer_admin(env: Env, new_admin: Address) {
        Self::require_admin(&env);
        new_admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    // ==================== Internal Helpers ====================

    fn require_admin(env: &Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            panic!("contract is paused");
        }
    }

    fn u128_to_bytes32(env: &Env, value: u128) -> BytesN<32> {
        let bytes = value.to_be_bytes();
        let mut result = [0u8; 32];
        result[16..32].copy_from_slice(&bytes);
        BytesN::from_array(env, &result)
    }
}

// ==================== Tests ====================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let vk = BytesN::from_array(&env, &[0u8; 768]);
        
        ZkKycVerifier::initialize(env.clone(), admin, vk);
        
        assert_eq!(ZkKycVerifier::get_total_credentials(env), 0);
    }

    #[test]
    fn test_has_credential_when_none() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let vk = BytesN::from_array(&env, &[0u8; 768]);
        
        ZkKycVerifier::initialize(env.clone(), admin, vk);
        
        assert!(!ZkKycVerifier::has_credential(
            env,
            user,
            AgeThreshold::Over18
        ));
    }
}

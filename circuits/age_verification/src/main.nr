// zkKYC Age Verification Circuit
// 
// Selective disclosure zero-knowledge proof circuit that proves:
// "User is at least N years old" without revealing their actual birthdate
//
// Security properties:
// 1. Birthdate is never revealed (private input)
// 2. Credential binding prevents proof reuse across different credentials
// 3. Nullifier prevents the same proof from being used twice
// 4. On-chain verification ensures integrity

use std::hash::poseidon::bn254::hash_2;

fn main(
    // ============= Private Inputs =============
    // These are never revealed to the verifier
    
    /// Unix timestamp of user's birthdate (seconds since epoch)
    /// Example: 946684800 = January 1, 2000
    birthdate_timestamp: Field,
    
    /// User's secret credential binding key
    /// This links the proof to a specific credential without revealing the birthdate
    credential_secret: Field,
    
    // ============= Public Inputs =============
    // These are visible to the verifier and recorded on-chain
    
    /// Current Unix timestamp (provided by verifier/contract)
    /// Used to calculate the user's current age
    current_timestamp: pub Field,
    
    /// Minimum required age (e.g., 18 or 21)
    required_age: pub Field,
    
    /// Credential commitment: Poseidon(birthdate_timestamp, credential_secret)
    /// This allows linking proofs to credentials without revealing data
    credential_hash: pub Field,
    
    /// Unique nullifier: Poseidon(credential_secret, required_age)
    /// Prevents the same proof from being used twice for the same age threshold
    nullifier: pub Field
) {
    // ============= Step 1: Verify Credential Binding =============
    // Ensure the prover knows the preimage of the credential hash
    // This proves they have the right to use this credential
    
    let computed_credential_hash = hash_2([birthdate_timestamp, credential_secret]);
    assert(
        computed_credential_hash == credential_hash,
        "Invalid credential binding: hash mismatch"
    );
    
    // ============= Step 2: Verify Nullifier =============
    // The nullifier must be correctly computed to prevent replay attacks
    // Using (secret, age) ensures different nullifiers for different age thresholds
    
    let computed_nullifier = hash_2([credential_secret, required_age]);
    assert(
        computed_nullifier == nullifier,
        "Invalid nullifier: prevents proof replay"
    );
    
    // ============= Step 3: Age Verification =============
    // Calculate age from birthdate and current time, then compare
    
    // Constants
    let seconds_per_year: Field = 31536000; // 365 days * 24 hours * 60 minutes * 60 seconds
    
    // Calculate age in seconds
    let age_in_seconds = current_timestamp - birthdate_timestamp;
    
    // Convert to years (integer division)
    let age_in_years = age_in_seconds / seconds_per_year;
    
    // Verify age meets requirement
    // Cast to u64 for comparison (Field comparisons are modular)
    assert(
        age_in_years as u64 >= required_age as u64,
        "Age requirement not met"
    );
}

// ============= Tests =============

#[test]
fn test_valid_age_over_18() {
    // Person born on 2000-01-01, current date is 2024-01-01
    // Age: 24 years (>= 18)
    let birthdate: Field = 946684800;    // 2000-01-01 00:00:00 UTC
    let current: Field = 1704067200;     // 2024-01-01 00:00:00 UTC
    let secret: Field = 12345678901234567890;
    let age_req: Field = 18;
    
    let cred_hash = hash_2([birthdate, secret]);
    let null_hash = hash_2([secret, age_req]);
    
    main(birthdate, secret, current, age_req, cred_hash, null_hash);
}

#[test]
fn test_valid_age_over_21() {
    // Person born on 2000-01-01, current date is 2024-01-01
    // Age: 24 years (>= 21)
    let birthdate: Field = 946684800;
    let current: Field = 1704067200;
    let secret: Field = 98765432109876543210;
    let age_req: Field = 21;
    
    let cred_hash = hash_2([birthdate, secret]);
    let null_hash = hash_2([secret, age_req]);
    
    main(birthdate, secret, current, age_req, cred_hash, null_hash);
}

#[test]
fn test_exact_age_18() {
    // Person turns exactly 18 today
    // Born on 2006-01-01, current date is 2024-01-01
    let birthdate: Field = 1136073600;   // 2006-01-01 00:00:00 UTC
    let current: Field = 1704067200;     // 2024-01-01 00:00:00 UTC
    let secret: Field = 11111111111111111111;
    let age_req: Field = 18;
    
    let cred_hash = hash_2([birthdate, secret]);
    let null_hash = hash_2([secret, age_req]);
    
    main(birthdate, secret, current, age_req, cred_hash, null_hash);
}

#[test(should_fail_with = "Age requirement not met")]
fn test_invalid_age_under_18() {
    // Person born on 2010-01-01, current date is 2024-01-01
    // Age: 14 years (< 18)
    let birthdate: Field = 1262304000;   // 2010-01-01 00:00:00 UTC
    let current: Field = 1704067200;     // 2024-01-01 00:00:00 UTC
    let secret: Field = 22222222222222222222;
    let age_req: Field = 18;
    
    let cred_hash = hash_2([birthdate, secret]);
    let null_hash = hash_2([secret, age_req]);
    
    main(birthdate, secret, current, age_req, cred_hash, null_hash);
}

#[test(should_fail_with = "Age requirement not met")]
fn test_invalid_age_under_21() {
    // Person born on 2006-01-01, current date is 2024-01-01
    // Age: 18 years (< 21)
    let birthdate: Field = 1136073600;
    let current: Field = 1704067200;
    let secret: Field = 33333333333333333333;
    let age_req: Field = 21;
    
    let cred_hash = hash_2([birthdate, secret]);
    let null_hash = hash_2([secret, age_req]);
    
    main(birthdate, secret, current, age_req, cred_hash, null_hash);
}

#[test(should_fail_with = "Invalid credential binding")]
fn test_wrong_credential_hash() {
    let birthdate: Field = 946684800;
    let current: Field = 1704067200;
    let secret: Field = 12345;
    let age_req: Field = 18;
    
    // Wrong credential hash (using different secret)
    let wrong_cred_hash = hash_2([birthdate, 99999]);
    let null_hash = hash_2([secret, age_req]);
    
    main(birthdate, secret, current, age_req, wrong_cred_hash, null_hash);
}

#[test(should_fail_with = "Invalid nullifier")]
fn test_wrong_nullifier() {
    let birthdate: Field = 946684800;
    let current: Field = 1704067200;
    let secret: Field = 12345;
    let age_req: Field = 18;
    
    let cred_hash = hash_2([birthdate, secret]);
    // Wrong nullifier (using different age)
    let wrong_null = hash_2([secret, 21]);
    
    main(birthdate, secret, current, age_req, cred_hash, wrong_null);
}

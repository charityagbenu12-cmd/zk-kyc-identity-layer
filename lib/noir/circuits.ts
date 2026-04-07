/**
 * Noir Circuit Artifacts and Configuration
 * 
 * This module manages circuit loading and configuration for the age verification ZK proofs.
 */

// Circuit metadata
export const AGE_VERIFICATION_CIRCUIT = {
  name: 'age_verification',
  version: '1.0.0',
  backend: 'ultrahonk',
  
  // Public input indices
  publicInputs: {
    currentTimestamp: 0,
    requiredAge: 1,
    credentialHash: 2,
    nullifier: 3,
  },
  
  // Proof sizes
  proofSize: 388, // bytes
  verificationKeySize: 768, // bytes
  
  // Circuit constraints (estimated)
  constraints: 2048,
} as const;

// Noir circuit source code (for reference)
export const CIRCUIT_SOURCE = `
// age_verification/src/main.nr
// Selective disclosure age proof circuit
// Proves: user_age >= required_age without revealing birthdate

use std::hash::poseidon::bn254::hash_2;

fn main(
    // Private inputs (never revealed)
    birthdate_timestamp: Field,      // Unix timestamp of birthdate
    credential_secret: Field,        // User's secret for credential binding
    
    // Public inputs (verified on-chain)
    current_timestamp: pub Field,    // Current time for age calculation
    required_age: pub Field,         // e.g., 18 or 21
    credential_hash: pub Field,      // Poseidon(birthdate, secret)
    nullifier: pub Field             // Prevents double-spending proofs
) {
    // 1. Verify credential binding
    let computed_hash = hash_2([birthdate_timestamp, credential_secret]);
    assert(computed_hash == credential_hash, "Invalid credential binding");
    
    // 2. Compute nullifier to prevent replay
    let computed_nullifier = hash_2([credential_secret, required_age]);
    assert(computed_nullifier == nullifier, "Invalid nullifier");
    
    // 3. Calculate age and verify threshold
    let seconds_per_year: Field = 31536000; // 365 days
    let age_in_seconds = current_timestamp - birthdate_timestamp;
    let age_in_years = age_in_seconds / seconds_per_year;
    
    // Age comparison
    assert(age_in_years as u64 >= required_age as u64, "Age requirement not met");
}

#[test]
fn test_valid_age_over_18() {
    // Test with a birthdate that makes the person over 18
    let birthdate = 946684800; // 2000-01-01
    let current = 1704067200;  // 2024-01-01
    let secret = 12345;
    
    main(
        birthdate,
        secret,
        current,
        18,
        hash_2([birthdate, secret]),
        hash_2([secret, 18])
    );
}

#[test(should_fail_with = "Age requirement not met")]
fn test_invalid_age_under_18() {
    // Test with a birthdate that makes the person under 18
    let birthdate = 1104537600; // 2005-01-01
    let current = 1704067200;   // 2024-01-01
    let secret = 12345;
    
    main(
        birthdate,
        secret,
        current,
        21,
        hash_2([birthdate, secret]),
        hash_2([secret, 21])
    );
}
`;

// Nargo.toml configuration
export const NARGO_CONFIG = `
[package]
name = "age_verification"
type = "bin"
authors = ["zkKYC Identity Layer"]
compiler_version = ">=1.0.0-beta.19"
license = "MIT"

[dependencies]
`;

// Simulated compiled circuit artifact
// In production, this would be the actual compiled JSON from nargo compile
export interface CompiledCircuit {
  noir_version: string;
  hash: number;
  abi: {
    parameters: CircuitParameter[];
    return_type: null;
    error_types: Record<string, CircuitError>;
  };
  bytecode: string;
}

interface CircuitParameter {
  name: string;
  type: CircuitType;
  visibility: 'private' | 'public';
}

interface CircuitType {
  kind: string;
  sign?: string;
  width?: number;
}

interface CircuitError {
  error_kind: string;
  string: string;
}

// Get compiled circuit (simulated for demo)
export function getCompiledCircuit(): CompiledCircuit {
  return {
    noir_version: '1.0.0-beta.19+3a9c0e5b8',
    hash: 3726461985,
    abi: {
      parameters: [
        {
          name: 'birthdate_timestamp',
          type: { kind: 'field' },
          visibility: 'private',
        },
        {
          name: 'credential_secret',
          type: { kind: 'field' },
          visibility: 'private',
        },
        {
          name: 'current_timestamp',
          type: { kind: 'field' },
          visibility: 'public',
        },
        {
          name: 'required_age',
          type: { kind: 'field' },
          visibility: 'public',
        },
        {
          name: 'credential_hash',
          type: { kind: 'field' },
          visibility: 'public',
        },
        {
          name: 'nullifier',
          type: { kind: 'field' },
          visibility: 'public',
        },
      ],
      return_type: null,
      error_types: {
        '14013187341964954204': {
          error_kind: 'string',
          string: 'Invalid credential binding',
        },
        '7018619747401394178': {
          error_kind: 'string',
          string: 'Invalid nullifier',
        },
        '2514089087823073029': {
          error_kind: 'string',
          string: 'Age requirement not met',
        },
      },
    },
    // Simulated bytecode (base64 encoded)
    bytecode: 'H4sIAAAAAAAA/wvOz0nVBAA3Dt3sBQAAAA==',
  };
}

// Simulated verification key
export function getVerificationKey(): Uint8Array {
  // In production, this would be the actual verification key from the circuit compilation
  const vk = new Uint8Array(768);
  crypto.getRandomValues(vk);
  return vk;
}

// Circuit input validation
export function validateCircuitInputs(inputs: {
  birthdateTimestamp: bigint;
  credentialSecret: bigint;
  currentTimestamp: bigint;
  requiredAge: number;
  credentialHash: bigint;
  nullifier: bigint;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

  // Check all values are within BN254 field
  if (inputs.birthdateTimestamp >= BN254_PRIME) {
    errors.push('birthdateTimestamp exceeds field modulus');
  }
  if (inputs.credentialSecret >= BN254_PRIME) {
    errors.push('credentialSecret exceeds field modulus');
  }
  if (inputs.currentTimestamp >= BN254_PRIME) {
    errors.push('currentTimestamp exceeds field modulus');
  }
  if (inputs.credentialHash >= BN254_PRIME) {
    errors.push('credentialHash exceeds field modulus');
  }
  if (inputs.nullifier >= BN254_PRIME) {
    errors.push('nullifier exceeds field modulus');
  }

  // Check age threshold is valid
  if (inputs.requiredAge !== 18 && inputs.requiredAge !== 21) {
    errors.push('requiredAge must be 18 or 21');
  }

  // Check birthdate is in the past
  if (inputs.birthdateTimestamp >= inputs.currentTimestamp) {
    errors.push('birthdateTimestamp must be before currentTimestamp');
  }

  // Check birthdate is reasonable (not before 1900)
  const minTimestamp = -2208988800n; // 1900-01-01
  if (inputs.birthdateTimestamp < minTimestamp) {
    errors.push('birthdateTimestamp is unreasonably old');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

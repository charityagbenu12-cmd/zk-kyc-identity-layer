/**
 * Noir ZK Proof Generation for Age Verification
 * 
 * This module handles client-side proof generation using Noir circuits
 * compiled with the Barretenberg (UltraHonk) backend.
 */

import type {
  AgeVerificationInput,
  ZKProof,
  ProofGenerationResult,
  AgeThreshold,
} from '@/lib/types';
import { SECONDS_PER_YEAR } from '@/lib/types';

// Poseidon hash implementation for field elements
// This is a simplified version - in production, use the actual Poseidon implementation
function poseidonHash2(a: bigint, b: bigint): bigint {
  // Simplified hash for demo - in production, use actual Poseidon from @noir-lang
  const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const combined = (a * 31n + b * 17n + 7n) % BN254_PRIME;
  return combined;
}

/**
 * Generate witness inputs for the age verification circuit
 */
export function generateWitnessInputs(
  birthdate: Date,
  credentialSecret: bigint,
  requiredAge: AgeThreshold
): AgeVerificationInput {
  const birthdateTimestamp = BigInt(Math.floor(birthdate.getTime() / 1000));
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  
  // Compute credential hash (Poseidon(birthdate, secret))
  const credentialHash = poseidonHash2(birthdateTimestamp, credentialSecret);
  
  // Compute nullifier (Poseidon(secret, requiredAge))
  // This prevents the same proof from being used twice for different age thresholds
  const nullifier = poseidonHash2(credentialSecret, BigInt(requiredAge));
  
  return {
    birthdateTimestamp,
    credentialSecret,
    currentTimestamp,
    requiredAge,
    credentialHash,
    nullifier,
  };
}

/**
 * Verify age meets threshold (client-side pre-check)
 */
export function verifyAgeThreshold(birthdate: Date, requiredAge: AgeThreshold): boolean {
  const birthdateTimestamp = BigInt(Math.floor(birthdate.getTime() / 1000));
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  const ageInSeconds = currentTimestamp - birthdateTimestamp;
  const ageInYears = ageInSeconds / SECONDS_PER_YEAR;
  
  return ageInYears >= BigInt(requiredAge);
}

/**
 * Calculate current age from birthdate
 */
export function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Generate a cryptographically secure credential secret
 */
export function generateCredentialSecret(): bigint {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  let secret = 0n;
  for (let i = 0; i < 32; i++) {
    secret = (secret << 8n) | BigInt(array[i]);
  }
  
  // Ensure it's within BN254 field
  const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  return secret % BN254_PRIME;
}

/**
 * Generate ZK proof for age verification
 * 
 * In production, this would use @noir-lang/noir_js and @aztec/bb.js
 * For demo purposes, we simulate the proof generation process
 */
export async function generateAgeProof(
  birthdate: Date,
  credentialSecret: bigint,
  requiredAge: AgeThreshold,
  onProgress?: (progress: number, status: string) => void
): Promise<ProofGenerationResult> {
  const startTime = Date.now();
  
  try {
    // Step 1: Validate age threshold
    onProgress?.(10, 'Validating age requirement...');
    await simulateDelay(300);
    
    if (!verifyAgeThreshold(birthdate, requiredAge)) {
      return {
        success: false,
        error: `Age requirement not met. Must be ${requiredAge} or older.`,
      };
    }
    
    // Step 2: Generate witness inputs
    onProgress?.(25, 'Generating witness inputs...');
    await simulateDelay(400);
    
    const inputs = generateWitnessInputs(birthdate, credentialSecret, requiredAge);
    
    // Step 3: Load circuit (in production, fetch from /public/circuits/)
    onProgress?.(40, 'Loading ZK circuit...');
    await simulateDelay(500);
    
    // Step 4: Execute circuit and generate witness
    onProgress?.(55, 'Executing circuit...');
    await simulateDelay(600);
    
    // Step 5: Generate proof using UltraHonk backend
    onProgress?.(70, 'Generating ZK proof...');
    await simulateDelay(800);
    
    // Step 6: Serialize proof
    onProgress?.(90, 'Finalizing proof...');
    await simulateDelay(300);
    
    // Create simulated proof (in production, this comes from bb.js)
    const proof = createSimulatedProof(inputs);
    
    onProgress?.(100, 'Proof generated successfully!');
    
    const generationTime = Date.now() - startTime;
    
    return {
      success: true,
      proof,
      generationTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during proof generation',
    };
  }
}

/**
 * Create a simulated proof for demo purposes
 * In production, this would be the actual UltraHonk proof from bb.js
 */
function createSimulatedProof(inputs: AgeVerificationInput): ZKProof {
  // Simulated 388-byte UltraHonk proof
  const proofBytes = new Uint8Array(388);
  crypto.getRandomValues(proofBytes);
  
  // Encode the credential hash in the first 32 bytes for verification
  const hashBytes = bigintToBytes32(inputs.credentialHash);
  proofBytes.set(hashBytes, 0);
  
  return {
    proof: proofBytes,
    publicInputs: [
      inputs.currentTimestamp,
      BigInt(inputs.requiredAge),
      inputs.credentialHash,
      inputs.nullifier,
    ],
  };
}

/**
 * Verify proof locally (for testing)
 */
export function verifyProofLocally(proof: ZKProof): boolean {
  // In production, this would use the verification key and bb.js
  // For demo, we just check the proof structure
  return proof.proof.length === 388 && proof.publicInputs.length === 4;
}

/**
 * Serialize proof to base64 for transmission
 */
export function serializeProof(proof: ZKProof): string {
  return Buffer.from(proof.proof).toString('base64');
}

/**
 * Deserialize proof from base64
 */
export function deserializeProof(base64: string, publicInputs: bigint[]): ZKProof {
  return {
    proof: Buffer.from(base64, 'base64'),
    publicInputs,
  };
}

/**
 * Convert bigint to 32-byte array
 */
function bigintToBytes32(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let temp = value;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(temp & 0xffn);
    temp = temp >> 8n;
  }
  return bytes;
}

/**
 * Convert 32-byte array to bigint
 */
export function bytes32ToBigint(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < 32; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Simulate async delay for demo
 */
function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format bigint as hex string
 */
export function bigintToHex(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

/**
 * Parse hex string to bigint
 */
export function hexToBigint(hex: string): bigint {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + cleanHex);
}

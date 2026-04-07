// zkKYC Identity Layer Type Definitions

// ==================== ZK Proof Types ====================

export interface AgeVerificationInput {
  // Private inputs (never revealed)
  birthdateTimestamp: bigint;
  credentialSecret: bigint;
  
  // Public inputs (verified on-chain)
  currentTimestamp: bigint;
  requiredAge: number;
  credentialHash: bigint;
  nullifier: bigint;
}

export interface ZKProof {
  proof: Uint8Array;
  publicInputs: bigint[];
}

export interface ProofGenerationResult {
  success: boolean;
  proof?: ZKProof;
  error?: string;
  generationTime?: number;
}

export interface ProofVerificationResult {
  valid: boolean;
  transactionHash?: string;
  error?: string;
}

// ==================== Credential Types ====================

export type AgeThreshold = 18 | 21;

export interface ZKCredential {
  id: string;
  type: 'age_verification';
  threshold: AgeThreshold;
  credentialHash: string;
  nullifier: string;
  issuedAt: number;
  expiresAt: number;
  issuer: string;
  verified: boolean;
  transactionHash?: string;
}

export interface CredentialStatus {
  hasCredential: boolean;
  credential?: ZKCredential;
  humanTechLinked: boolean;
  humanTechSbtId?: string;
}

// ==================== Human.tech Integration ====================

export interface HumanTechSBT {
  id: string;
  actionNullifier: bigint;
  circuitId: bigint;
  expiry: number;
  minter: string;
  publicValues: bigint[];
  recipient: string;
  revoked: boolean;
}

export interface HumanTechVerification {
  verified: boolean;
  sbt?: HumanTechSBT;
  error?: string;
}

// Human.tech Circuit IDs
export const HUMANTECH_CIRCUITS = {
  PHONE_NUMBER: 1n,
  GOVERNMENT_ID: 2n,
  US_RESIDENCY: 3n,
  US_ACCREDITED: 4n,
} as const;

// ==================== Wallet Types ====================

export interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  network: StellarNetwork;
  balance?: string;
}

export type StellarNetwork = 'testnet' | 'mainnet' | 'futurenet';

export interface FreighterResponse {
  address?: string;
  publicKey?: string;
  error?: string;
}

// ==================== Contract Types ====================

export interface ContractConfig {
  verifierAddress: string;
  humanTechAddress: string;
  network: StellarNetwork;
  horizonUrl: string;
  sorobanRpcUrl: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  resultXdr?: string;
}

// ==================== UI State Types ====================

export type VerificationStep = 
  | 'connect_wallet'
  | 'enter_birthdate'
  | 'generating_proof'
  | 'submitting_proof'
  | 'verification_complete'
  | 'error';

export interface VerificationState {
  step: VerificationStep;
  wallet: WalletState;
  birthdate?: Date;
  ageThreshold?: AgeThreshold;
  proof?: ZKProof;
  credential?: ZKCredential;
  error?: string;
  isProcessing: boolean;
  progress: number;
}

// ==================== API Types ====================

export interface GenerateProofRequest {
  birthdate: string; // ISO date string
  requiredAge: AgeThreshold;
  credentialSecret: string; // hex string
}

export interface GenerateProofResponse {
  success: boolean;
  proof?: string; // base64 encoded proof
  publicInputs?: string[]; // hex encoded bigints
  error?: string;
}

export interface VerifyProofRequest {
  userAddress: string;
  proof: string; // base64 encoded
  publicInputs: string[]; // hex encoded bigints
}

export interface VerifyProofResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface CredentialStatusRequest {
  userAddress: string;
}

export interface CredentialStatusResponse {
  hasCredential: boolean;
  credential?: ZKCredential;
  humanTechLinked: boolean;
}

// ==================== Demo Mode ====================

export interface DemoCredentials {
  birthdate: Date;
  credentialSecret: bigint;
  isOver18: boolean;
  isOver21: boolean;
}

export const DEMO_CREDENTIALS: DemoCredentials = {
  birthdate: new Date('2000-01-15'),
  credentialSecret: 12345678901234567890n,
  isOver18: true,
  isOver21: true,
};

// ==================== Constants ====================

export const SECONDS_PER_YEAR = 31536000n;

export const CONTRACT_ADDRESSES = {
  testnet: {
    verifier: 'CDEMO0000000000000000000000000000000000000000000000000000',
    humanTech: 'CCNTHEVSWNDOQAMXXHFOLQIXWUINUPTJIM6AXFSKODNVXWA4N7XV3AI5',
  },
  mainnet: {
    verifier: '', // TBD after mainnet deployment
    humanTech: 'CCNTHEVSWNDOQAMXXHFOLQIXWUINUPTJIM6AXFSKODNVXWA4N7XV3AI5',
  },
  futurenet: {
    verifier: '',
    humanTech: '',
  },
} as const;

export const NETWORK_CONFIG = {
  testnet: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  },
  mainnet: {
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://soroban.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
  },
  futurenet: {
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    sorobanRpcUrl: 'https://rpc-futurenet.stellar.org',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
  },
} as const;

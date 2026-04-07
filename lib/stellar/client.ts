/**
 * Stellar/Soroban Client for zkKYC Verifier Contract
 * 
 * Handles wallet connection, contract interactions, and transaction submission
 */

import type {
  WalletState,
  StellarNetwork,
  TransactionResult,
  ZKProof,
  CredentialStatus,
  ZKCredential,
  AgeThreshold,
} from '@/lib/types';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '@/lib/types';

// ==================== Freighter Wallet Integration ====================

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    freighter?: any;
  }
}

/**
 * Check if Freighter wallet is installed
 */
export function isFreighterInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.freighter;
}

/**
 * Connect to Freighter wallet
 */
export async function connectWallet(): Promise<WalletState> {
  if (!isFreighterInstalled()) {
    return {
      connected: false,
      address: null,
      publicKey: null,
      network: 'testnet',
    };
  }

  try {
    // Request access to the wallet
    await window.freighter.requestAccess();
    
    // Get the public key
    const publicKey = await window.freighter.getPublicKey();
    
    // Get the current network
    const networkDetails = await window.freighter.getNetworkDetails();
    const network = networkDetails.network.toLowerCase() as StellarNetwork;
    
    return {
      connected: true,
      address: publicKey,
      publicKey,
      network,
    };
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return {
      connected: false,
      address: null,
      publicKey: null,
      network: 'testnet',
    };
  }
}

/**
 * Disconnect wallet (clear local state)
 */
export function disconnectWallet(): WalletState {
  return {
    connected: false,
    address: null,
    publicKey: null,
    network: 'testnet',
  };
}

/**
 * Get current network from Freighter
 */
export async function getCurrentNetwork(): Promise<StellarNetwork> {
  if (!isFreighterInstalled()) {
    return 'testnet';
  }
  
  try {
    const networkDetails = await window.freighter.getNetworkDetails();
    return networkDetails.network.toLowerCase() as StellarNetwork;
  } catch {
    return 'testnet';
  }
}

// ==================== Contract Interactions ====================

/**
 * Get contract configuration for the current network
 */
export function getContractConfig(network: StellarNetwork) {
  return {
    verifierAddress: CONTRACT_ADDRESSES[network].verifier,
    humanTechAddress: CONTRACT_ADDRESSES[network].humanTech,
    ...NETWORK_CONFIG[network],
  };
}

/**
 * Submit ZK proof to the verifier contract
 */
export async function submitProofToContract(
  wallet: WalletState,
  proof: ZKProof,
  _onProgress?: (status: string) => void
): Promise<TransactionResult> {
  if (!wallet.connected || !wallet.address) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }

  const config = getContractConfig(wallet.network);
  
  // In demo mode, simulate the transaction
  if (config.verifierAddress.startsWith('CDEMO')) {
    return simulateContractSubmission(wallet.address, proof);
  }

  try {
    // In production, this would:
    // 1. Build the Soroban transaction
    // 2. Sign with Freighter
    // 3. Submit to the network
    
    // For now, return simulated result
    return simulateContractSubmission(wallet.address, proof);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

/**
 * Simulate contract submission for demo mode
 */
async function simulateContractSubmission(
  _address: string,
  proof: ZKProof
): Promise<TransactionResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Verify proof structure
  if (proof.proof.length !== 388 || proof.publicInputs.length !== 4) {
    return {
      success: false,
      error: 'Invalid proof format',
    };
  }
  
  // Generate fake transaction hash
  const hashBytes = new Uint8Array(32);
  crypto.getRandomValues(hashBytes);
  const hash = Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    success: true,
    hash,
  };
}

/**
 * Check credential status on-chain
 */
export async function checkCredentialStatus(
  wallet: WalletState,
  ageThreshold?: AgeThreshold
): Promise<CredentialStatus> {
  if (!wallet.connected || !wallet.address) {
    return {
      hasCredential: false,
      humanTechLinked: false,
    };
  }

  // In demo mode, check local storage for saved credentials
  const savedCredential = getLocalCredential(wallet.address, ageThreshold);
  
  if (savedCredential) {
    return {
      hasCredential: true,
      credential: savedCredential,
      humanTechLinked: !!savedCredential.transactionHash,
    };
  }

  return {
    hasCredential: false,
    humanTechLinked: false,
  };
}

// ==================== Local Storage (Demo Mode) ====================

const CREDENTIAL_STORAGE_KEY = 'zkkyc_credentials';

/**
 * Save credential to local storage (demo mode only)
 */
export function saveLocalCredential(
  address: string,
  credential: ZKCredential
): void {
  if (typeof window === 'undefined') return;
  
  const key = `${CREDENTIAL_STORAGE_KEY}_${address}`;
  const existing = localStorage.getItem(key);
  const credentials: ZKCredential[] = existing ? JSON.parse(existing) : [];
  
  // Remove existing credential with same threshold
  const filtered = credentials.filter(c => c.threshold !== credential.threshold);
  filtered.push(credential);
  
  localStorage.setItem(key, JSON.stringify(filtered));
}

/**
 * Get credential from local storage (demo mode only)
 */
export function getLocalCredential(
  address: string,
  threshold?: AgeThreshold
): ZKCredential | undefined {
  if (typeof window === 'undefined') return undefined;
  
  const key = `${CREDENTIAL_STORAGE_KEY}_${address}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) return undefined;
  
  const credentials: ZKCredential[] = JSON.parse(stored);
  
  if (threshold) {
    return credentials.find(c => c.threshold === threshold && !isCredentialExpired(c));
  }
  
  // Return most recent non-expired credential
  return credentials
    .filter(c => !isCredentialExpired(c))
    .sort((a, b) => b.issuedAt - a.issuedAt)[0];
}

/**
 * Get all credentials for an address
 */
export function getAllLocalCredentials(address: string): ZKCredential[] {
  if (typeof window === 'undefined') return [];
  
  const key = `${CREDENTIAL_STORAGE_KEY}_${address}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) return [];
  
  return JSON.parse(stored);
}

/**
 * Clear all local credentials (demo mode only)
 */
export function clearLocalCredentials(address: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `${CREDENTIAL_STORAGE_KEY}_${address}`;
  localStorage.removeItem(key);
}

/**
 * Check if credential is expired
 */
function isCredentialExpired(credential: ZKCredential): boolean {
  return Date.now() > credential.expiresAt;
}

// ==================== Human.tech Integration ====================

/**
 * Check if user has Human.tech SBT
 */
export async function checkHumanTechSBT(
  _wallet: WalletState
): Promise<{ hasSBT: boolean; sbtId?: string }> {
  // In production, this would query the Human.tech contract
  // For demo, return mock result
  return {
    hasSBT: false,
  };
}

/**
 * Bind zkKYC credential to Human.tech SBT
 */
export async function bindToHumanTechSBT(
  _wallet: WalletState,
  _credentialHash: string,
  _sbtId: string
): Promise<TransactionResult> {
  // In production, this would call the Human.tech binding contract
  // For demo, return success
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    hash: 'demo_binding_tx_' + Date.now(),
  };
}

// ==================== Utilities ====================

/**
 * Format Stellar address for display
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Get explorer URL for transaction
 */
export function getExplorerUrl(hash: string, network: StellarNetwork): string {
  const baseUrls = {
    testnet: 'https://stellar.expert/explorer/testnet/tx/',
    mainnet: 'https://stellar.expert/explorer/public/tx/',
    futurenet: 'https://stellar.expert/explorer/futurenet/tx/',
  };
  
  return baseUrls[network] + hash;
}

/**
 * Validate Stellar address format
 */
export function isValidStellarAddress(address: string): boolean {
  // Stellar addresses start with G and are 56 characters
  return /^G[A-Z2-7]{55}$/.test(address);
}

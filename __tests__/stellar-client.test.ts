import {
  isValidStellarAddress,
  formatAddress,
  getExplorerUrl,
} from '@/lib/stellar/client';

// Valid 56-char Stellar address (G + 55 base32 chars A-Z, 2-7)
const VALID_ADDR = 'G' + 'A'.repeat(55);

describe('isValidStellarAddress', () => {
  it('accepts a valid G-address', () => {
    expect(isValidStellarAddress(VALID_ADDR)).toBe(true);
  });

  it('rejects an address that does not start with G', () => {
    expect(isValidStellarAddress('C' + 'A'.repeat(55))).toBe(false);
  });

  it('rejects an address that is too short', () => {
    expect(isValidStellarAddress('GABCD')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidStellarAddress('')).toBe(false);
  });
});

describe('formatAddress', () => {
  const addr = VALID_ADDR;

  it('truncates with default 6 chars each side', () => {
    expect(formatAddress(addr)).toBe('GAAAAA...AAAAAA');
  });

  it('truncates with custom char count', () => {
    expect(formatAddress(addr, 4)).toBe('GAAA...AAAA');
  });

  it('returns empty string for empty input', () => {
    expect(formatAddress('')).toBe('');
  });
});

describe('getExplorerUrl', () => {
  it('builds correct testnet URL', () => {
    expect(getExplorerUrl('abc123', 'testnet')).toBe(
      'https://stellar.expert/explorer/testnet/tx/abc123'
    );
  });

  it('builds correct mainnet URL', () => {
    expect(getExplorerUrl('abc123', 'mainnet')).toBe(
      'https://stellar.expert/explorer/public/tx/abc123'
    );
  });
});

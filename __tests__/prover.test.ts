import {
  calculateAge,
  verifyAgeThreshold,
  generateWitnessInputs,
  generateCredentialSecret,
  verifyProofLocally,
  generateAgeProof,
} from '@/lib/noir/prover';

// Fixed "today" so age calculations are deterministic
jest.useFakeTimers().setSystemTime(new Date('2026-04-10').getTime());

describe('calculateAge', () => {
  it('returns correct age for a past birthdate', () => {
    expect(calculateAge(new Date('2000-04-10'))).toBe(26);
  });

  it('returns one less if birthday has not occurred yet this year', () => {
    expect(calculateAge(new Date('2000-12-31'))).toBe(25);
  });
});

describe('verifyAgeThreshold', () => {
  const over21 = new Date('2000-01-01');
  const under18 = new Date('2015-01-01');

  it('passes 18+ for someone who is 26', () => {
    expect(verifyAgeThreshold(over21, 18)).toBe(true);
  });

  it('passes 21+ for someone who is 26', () => {
    expect(verifyAgeThreshold(over21, 21)).toBe(true);
  });

  it('fails 18+ for someone who is 11', () => {
    expect(verifyAgeThreshold(under18, 18)).toBe(false);
  });

  it('fails 21+ for someone who is 11', () => {
    expect(verifyAgeThreshold(under18, 21)).toBe(false);
  });
});

describe('generateWitnessInputs', () => {
  it('returns all required fields', () => {
    const secret = 12345n;
    const inputs = generateWitnessInputs(new Date('2000-01-01'), secret, 18);
    expect(inputs).toMatchObject({
      requiredAge: 18,
      credentialSecret: secret,
    });
    expect(typeof inputs.birthdateTimestamp).toBe('bigint');
    expect(typeof inputs.credentialHash).toBe('bigint');
    expect(typeof inputs.nullifier).toBe('bigint');
  });

  it('produces different nullifiers for different age thresholds', () => {
    const secret = 99999n;
    const birthdate = new Date('2000-01-01');
    const a = generateWitnessInputs(birthdate, secret, 18);
    const b = generateWitnessInputs(birthdate, secret, 21);
    expect(a.nullifier).not.toBe(b.nullifier);
  });
});

describe('generateCredentialSecret', () => {
  it('returns a positive bigint', () => {
    const secret = generateCredentialSecret();
    expect(typeof secret).toBe('bigint');
    expect(secret > 0n).toBe(true);
  });

  it('generates unique secrets each call', () => {
    expect(generateCredentialSecret()).not.toBe(generateCredentialSecret());
  });
});

describe('verifyProofLocally', () => {
  it('accepts a valid proof structure', () => {
    const proof = { proof: new Uint8Array(388), publicInputs: [1n, 2n, 3n, 4n] };
    expect(verifyProofLocally(proof)).toBe(true);
  });

  it('rejects wrong proof byte length', () => {
    const proof = { proof: new Uint8Array(100), publicInputs: [1n, 2n, 3n, 4n] };
    expect(verifyProofLocally(proof)).toBe(false);
  });

  it('rejects wrong number of public inputs', () => {
    const proof = { proof: new Uint8Array(388), publicInputs: [1n, 2n] };
    expect(verifyProofLocally(proof)).toBe(false);
  });
});

describe('generateAgeProof', () => {
  beforeAll(() => jest.useRealTimers());
  afterAll(() => jest.useFakeTimers().setSystemTime(new Date('2026-04-10').getTime()));

  it('succeeds for a valid birthdate and threshold', async () => {
    const result = await generateAgeProof(new Date('2000-01-01'), 12345n, 18);
    expect(result.success).toBe(true);
    expect(result.proof).toBeDefined();
    expect(result.proof!.proof.length).toBe(388);
    expect(result.proof!.publicInputs.length).toBe(4);
  }, 15000);

  it('fails when age requirement is not met', async () => {
    const result = await generateAgeProof(new Date('2015-01-01'), 12345n, 18);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/age requirement/i);
  }, 15000);
});

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  generateAgeProof,
  generateCredentialSecret,
  serializeProof,
  bigintToHex,
} from '@/lib/noir/prover';
import { submitProofToContract, saveLocalCredential } from '@/lib/stellar/client';
import type { WalletState, AgeThreshold, ZKProof, ZKCredential } from '@/lib/types';

interface ProofGeneratorProps {
  wallet: WalletState;
  birthdate: Date;
  ageThreshold: AgeThreshold;
  onComplete: (credential: ZKCredential) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

type GenerationStep =
  | 'initializing'
  | 'generating_secret'
  | 'computing_witness'
  | 'generating_proof'
  | 'submitting'
  | 'complete'
  | 'error';

interface StepInfo {
  label: string;
  description: string;
}

const STEPS: Record<GenerationStep, StepInfo> = {
  initializing: {
    label: 'Initializing',
    description: 'Setting up ZK proof environment...',
  },
  generating_secret: {
    label: 'Generating Secret',
    description: 'Creating cryptographic credential secret...',
  },
  computing_witness: {
    label: 'Computing Witness',
    description: 'Processing private inputs locally...',
  },
  generating_proof: {
    label: 'Generating Proof',
    description: 'Running UltraHonk prover (this may take a moment)...',
  },
  submitting: {
    label: 'Submitting to Blockchain',
    description: 'Verifying proof on Soroban...',
  },
  complete: {
    label: 'Complete',
    description: 'Your credential has been issued!',
  },
  error: {
    label: 'Error',
    description: 'Something went wrong',
  },
};

export function ProofGenerator({
  wallet,
  birthdate,
  ageThreshold,
  onComplete,
  onError,
  onCancel,
}: ProofGeneratorProps) {
  const [step, setStep] = useState<GenerationStep>('initializing');
  const [progress, setProgress] = useState(0);
  const [proof, setProof] = useState<ZKProof | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [credentialSecret, setCredentialSecret] = useState<bigint | null>(null);

  useEffect(() => {
    runProofGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runProofGeneration = async () => {
    try {
      // Step 1: Generate credential secret
      setStep('generating_secret');
      setProgress(10);
      await delay(500);
      
      const secret = generateCredentialSecret();
      setCredentialSecret(secret);

      // Step 2: Generate ZK proof
      setStep('computing_witness');
      setProgress(25);

      const result = await generateAgeProof(
        birthdate,
        secret,
        ageThreshold,
        (prog, status) => {
          // Map proof progress to our progress bar
          const mappedProgress = 25 + Math.floor(prog * 0.5);
          setProgress(mappedProgress);
          
          if (prog < 50) {
            setStep('computing_witness');
          } else {
            setStep('generating_proof');
          }
        }
      );

      if (!result.success || !result.proof) {
        throw new Error(result.error || 'Proof generation failed');
      }

      setProof(result.proof);
      setProgress(80);

      // Step 3: Submit to Soroban
      setStep('submitting');
      
      const txResult = await submitProofToContract(wallet, result.proof);

      if (!txResult.success) {
        throw new Error(txResult.error || 'Transaction submission failed');
      }

      // Step 4: Save credential locally
      const credential: ZKCredential = {
        id: `zkkyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'age_verification',
        threshold: ageThreshold,
        credentialHash: bigintToHex(result.proof.publicInputs[2]),
        nullifier: bigintToHex(result.proof.publicInputs[3]),
        issuedAt: Date.now(),
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        issuer: 'zkKYC Identity Layer',
        verified: true,
        transactionHash: txResult.hash,
      };

      if (wallet.address) {
        saveLocalCredential(wallet.address, credential);
      }

      setProgress(100);
      setStep('complete');

      // Notify parent after a brief delay to show completion
      await delay(1000);
      onComplete(credential);

    } catch (error) {
      setStep('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      onError(message);
    }
  };

  const currentStepInfo = STEPS[step];

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircuitIcon className="h-5 w-5 text-primary" />
          Generating ZK Proof
        </CardTitle>
        <CardDescription>
          Creating zero-knowledge proof for age {ageThreshold}+ verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Visualization */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`
                flex h-24 w-24 items-center justify-center rounded-full border-4
                ${step === 'complete' ? 'border-[oklch(0.70_0.18_145)]' : 'border-primary'}
                ${step === 'error' ? 'border-destructive' : ''}
                ${step !== 'complete' && step !== 'error' ? 'animate-pulse-glow' : ''}
              `}
            >
              {step === 'complete' ? (
                <CheckIcon className="h-10 w-10 text-[oklch(0.70_0.18_145)]" />
              ) : step === 'error' ? (
                <XIcon className="h-10 w-10 text-destructive" />
              ) : (
                <span className="text-2xl font-bold">{progress}%</span>
              )}
            </div>
          </div>
          <div className="h-24" />
        </div>

        {/* Step Info */}
        <div className="text-center">
          <p className="font-medium">{currentStepInfo.label}</p>
          <p className="text-sm text-muted-foreground">{currentStepInfo.description}</p>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />

        {/* Step Indicators */}
        <div className="flex justify-between">
          {(['generating_secret', 'computing_witness', 'generating_proof', 'submitting', 'complete'] as GenerationStep[]).map(
            (s, i) => {
              const stepOrder = ['generating_secret', 'computing_witness', 'generating_proof', 'submitting', 'complete'];
              const currentIndex = stepOrder.indexOf(step);
              const thisIndex = i;
              const isComplete = thisIndex < currentIndex || step === 'complete';
              const isCurrent = s === step;

              return (
                <div
                  key={s}
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium
                    ${isComplete ? 'bg-[oklch(0.70_0.18_145)] text-[oklch(0.13_0.01_260)]' : ''}
                    ${isCurrent && step !== 'error' ? 'bg-primary text-primary-foreground' : ''}
                    ${!isComplete && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                    ${step === 'error' && isCurrent ? 'bg-destructive text-destructive-foreground' : ''}
                  `}
                >
                  {isComplete ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </div>
              );
            }
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Proof Details (when available) */}
        {proof && step !== 'error' && (
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Proof Generated</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>{proof.proof.length} bytes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Public Inputs:</span>
                <span>{proof.publicInputs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credential Hash:</span>
                <span className="truncate max-w-[120px]">
                  {bigintToHex(proof.publicInputs[2]).slice(0, 18)}...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {step === 'error' && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={runProofGeneration}
            >
              Retry
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={step === 'submitting'}
          >
            {step === 'complete' ? 'Done' : 'Cancel'}
          </Button>
        </div>

        {/* Security Note */}
        <p className="text-center text-xs text-muted-foreground">
          {credentialSecret ? (
            <>Your credential secret is stored locally and never shared</>
          ) : (
            <>All cryptographic operations run locally in your browser</>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function CircuitIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
      <path d="M10 7h4" />
      <path d="M7 10v4" />
      <path d="M17 10v4" />
      <path d="M10 17h4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

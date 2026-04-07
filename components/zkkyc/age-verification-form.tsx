'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateAge, verifyAgeThreshold } from '@/lib/noir/prover';
import type { AgeThreshold } from '@/lib/types';

interface AgeVerificationFormProps {
  onSubmit: (birthdate: Date, ageThreshold: AgeThreshold) => void;
  isLoading?: boolean;
}

export function AgeVerificationForm({ onSubmit, isLoading }: AgeVerificationFormProps) {
  const [birthdate, setBirthdate] = useState<string>('');
  const [ageThreshold, setAgeThreshold] = useState<AgeThreshold>(18);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!birthdate) {
      setError('Please enter your birthdate');
      return;
    }

    const date = new Date(birthdate);
    
    if (isNaN(date.getTime())) {
      setError('Invalid date format');
      return;
    }

    if (date > new Date()) {
      setError('Birthdate cannot be in the future');
      return;
    }

    const age = calculateAge(date);
    
    if (age < 0 || age > 150) {
      setError('Please enter a valid birthdate');
      return;
    }

    if (!verifyAgeThreshold(date, ageThreshold)) {
      setError(`You must be at least ${ageThreshold} years old`);
      return;
    }

    onSubmit(date, ageThreshold);
  };

  const currentAge = birthdate ? calculateAge(new Date(birthdate)) : null;
  const canVerify18 = birthdate ? verifyAgeThreshold(new Date(birthdate), 18) : false;
  const canVerify21 = birthdate ? verifyAgeThreshold(new Date(birthdate), 21) : false;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-primary" />
          Age Verification
        </CardTitle>
        <CardDescription>
          Prove your age without revealing your exact birthdate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Birthdate Input */}
          <div className="space-y-2">
            <Label htmlFor="birthdate">Date of Birth</Label>
            <div className="relative">
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => {
                  setBirthdate(e.target.value);
                  setError(null);
                }}
                max={new Date().toISOString().split('T')[0]}
                className="bg-input/50"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your birthdate will never leave your device - only a ZK proof is generated
            </p>
          </div>

          {/* Age Display */}
          {currentAge !== null && currentAge >= 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Calculated Age</span>
                <span className="text-2xl font-bold">{currentAge}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <CredentialBadge
                  label="18+"
                  available={canVerify18}
                />
                <CredentialBadge
                  label="21+"
                  available={canVerify21}
                />
              </div>
            </div>
          )}

          {/* Age Threshold Selection */}
          <div className="space-y-2">
            <Label>Verification Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <ThresholdCard
                threshold={18}
                title="Over 18"
                description="Basic age verification"
                selected={ageThreshold === 18}
                disabled={!canVerify18 || isLoading}
                onClick={() => setAgeThreshold(18)}
              />
              <ThresholdCard
                threshold={21}
                title="Over 21"
                description="Enhanced verification"
                selected={ageThreshold === 21}
                disabled={!canVerify21 || isLoading}
                onClick={() => setAgeThreshold(21)}
              />
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex gap-3">
              <LockIcon className="h-5 w-5 flex-shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Privacy Protected</p>
                <p className="text-xs text-muted-foreground">
                  Your birthdate is processed locally using zero-knowledge cryptography.
                  Only a mathematical proof is shared - never your actual data.
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!birthdate || isLoading || !verifyAgeThreshold(new Date(birthdate), ageThreshold)}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Generating Proof...
              </>
            ) : (
              <>
                <ZapIcon className="mr-2 h-4 w-4" />
                Generate ZK Proof
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface ThresholdCardProps {
  threshold: AgeThreshold;
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

function ThresholdCard({
  threshold,
  title,
  description,
  selected,
  disabled,
  onClick,
}: ThresholdCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-lg border p-4 text-left transition-all
        ${
          selected
            ? 'border-primary bg-primary/10 ring-1 ring-primary'
            : 'border-border/50 bg-card/30 hover:border-border hover:bg-card/50'
        }
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            selected
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          {threshold}+
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function CredentialBadge({ label, available }: { label: string; available: boolean }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
        ${
          available
            ? 'bg-[oklch(0.70_0.18_145)]/20 text-[oklch(0.70_0.18_145)]'
            : 'bg-muted text-muted-foreground'
        }
      `}
    >
      {available ? <CheckIcon className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
      {label}
    </span>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
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

function LoadingSpinner() {
  return (
    <svg
      className="mr-2 h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

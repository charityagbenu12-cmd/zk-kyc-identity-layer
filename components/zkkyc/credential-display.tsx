'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAddress, getExplorerUrl } from '@/lib/stellar/client';
import type { ZKCredential, StellarNetwork } from '@/lib/types';

interface CredentialDisplayProps {
  credentials: ZKCredential[];
  network: StellarNetwork;
  onVerifyNew?: () => void;
}

export function CredentialDisplay({
  credentials,
  network,
  onVerifyNew,
}: CredentialDisplayProps) {
  if (credentials.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShieldIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No Credentials Yet</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            Complete the age verification process to receive your first zkKYC credential
          </p>
          {onVerifyNew && (
            <Button className="mt-4" onClick={onVerifyNew}>
              Start Verification
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Credentials</h2>
        {onVerifyNew && (
          <Button variant="outline" size="sm" onClick={onVerifyNew}>
            Add Credential
          </Button>
        )}
      </div>
      
      <div className="grid gap-4">
        {credentials.map((credential) => (
          <CredentialCard
            key={credential.id}
            credential={credential}
            network={network}
          />
        ))}
      </div>
    </div>
  );
}

interface CredentialCardProps {
  credential: ZKCredential;
  network: StellarNetwork;
}

function CredentialCard({ credential, network }: CredentialCardProps) {
  const isExpired = Date.now() > credential.expiresAt;
  const expiresIn = Math.ceil((credential.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card className={`border-border/50 ${isExpired ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`
                flex h-12 w-12 items-center justify-center rounded-xl
                ${isExpired ? 'bg-muted' : 'bg-primary/10'}
              `}
            >
              <span
                className={`text-lg font-bold ${
                  isExpired ? 'text-muted-foreground' : 'text-primary'
                }`}
              >
                {credential.threshold}+
              </span>
            </div>
            <div>
              <CardTitle className="text-base">
                Age Verification ({credential.threshold}+)
              </CardTitle>
              <CardDescription>
                {credential.verified ? 'Verified on Soroban' : 'Pending Verification'}
              </CardDescription>
            </div>
          </div>
          <StatusBadge
            verified={credential.verified}
            expired={isExpired}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credential Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Issued</p>
            <p className="font-medium">
              {new Date(credential.issuedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
              {isExpired ? 'Expired' : `${expiresIn} days`}
            </p>
          </div>
        </div>

        {/* Cryptographic Identifiers */}
        <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Credential Hash</span>
            <button
              className="text-xs font-mono text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(credential.credentialHash)}
            >
              {credential.credentialHash.slice(0, 10)}...{credential.credentialHash.slice(-8)}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Nullifier</span>
            <button
              className="text-xs font-mono text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(credential.nullifier)}
            >
              {credential.nullifier.slice(0, 10)}...{credential.nullifier.slice(-8)}
            </button>
          </div>
        </div>

        {/* Transaction Link */}
        {credential.transactionHash && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Transaction</span>
            <a
              href={getExplorerUrl(credential.transactionHash, network)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {formatAddress(credential.transactionHash, 8)}
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <ShareIcon className="mr-1.5 h-3.5 w-3.5" />
            Share Proof
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <DownloadIcon className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ verified, expired }: { verified: boolean; expired: boolean }) {
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        <ClockIcon className="h-3 w-3" />
        Expired
      </span>
    );
  }
  
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.70_0.18_145)]/20 px-2.5 py-0.5 text-xs font-medium text-[oklch(0.70_0.18_145)]">
        <CheckIcon className="h-3 w-3" />
        Verified
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.80_0.15_85)]/20 px-2.5 py-0.5 text-xs font-medium text-[oklch(0.80_0.15_85)]">
      <ClockIcon className="h-3 w-3" />
      Pending
    </span>
  );
}

function ShieldIcon({ className }: { className?: string }) {
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

function ClockIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

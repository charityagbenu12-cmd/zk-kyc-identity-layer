'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ZKCredential, AgeThreshold } from '@/lib/types';

interface VerificationStatusProps {
  credential: ZKCredential;
  onReset: () => void;
}

export function VerificationStatus({ credential, onReset }: VerificationStatusProps) {
  return (
    <Card className="border-[oklch(0.70_0.18_145)]/50 bg-[oklch(0.70_0.18_145)]/5">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          {/* Success Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.70_0.18_145)]/20">
            <CheckCircleIcon className="h-10 w-10 text-[oklch(0.70_0.18_145)]" />
          </div>

          {/* Title */}
          <h2 className="mt-4 text-xl font-semibold">Verification Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your age has been verified using zero-knowledge proofs
          </p>

          {/* Credential Badge */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[oklch(0.70_0.18_145)]/30 bg-[oklch(0.70_0.18_145)]/10 px-4 py-2">
            <ShieldCheckIcon className="h-5 w-5 text-[oklch(0.70_0.18_145)]" />
            <span className="font-medium">Age {credential.threshold}+ Verified</span>
          </div>

          {/* Details */}
          <div className="mt-6 w-full max-w-sm space-y-3">
            <DetailRow
              label="Credential ID"
              value={credential.id.slice(0, 20) + '...'}
            />
            <DetailRow
              label="Issued"
              value={new Date(credential.issuedAt).toLocaleDateString()}
            />
            <DetailRow
              label="Expires"
              value={new Date(credential.expiresAt).toLocaleDateString()}
            />
            {credential.transactionHash && (
              <DetailRow
                label="Transaction"
                value={
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${credential.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    View on Explorer
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                }
              />
            )}
          </div>

          {/* Privacy Reminder */}
          <div className="mt-6 rounded-lg border border-border/50 bg-card/50 p-4 text-left w-full max-w-sm">
            <div className="flex gap-3">
              <LockIcon className="h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Your Privacy is Protected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only a cryptographic proof was shared. Your actual birthdate remains private and was never transmitted.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 w-full max-w-sm">
            <Button variant="outline" className="flex-1" onClick={onReset}>
              Verify Another
            </Button>
            <Button className="flex-1">
              <ShareIcon className="mr-2 h-4 w-4" />
              Share Credential
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
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
      <path d="m9 12 2 2 4-4" />
    </svg>
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

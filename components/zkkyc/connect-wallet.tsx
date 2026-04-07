'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  connectWallet,
  disconnectWallet,
  isFreighterInstalled,
  formatAddress,
} from '@/lib/stellar/client';
import type { WalletState } from '@/lib/types';

interface ConnectWalletProps {
  onWalletChange?: (wallet: WalletState) => void;
}

export function ConnectWallet({ onWalletChange }: ConnectWalletProps) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    publicKey: null,
    network: 'testnet',
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasFreighter, setHasFreighter] = useState(false);

  useEffect(() => {
    // Check for Freighter on mount
    setHasFreighter(isFreighterInstalled());
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const newWallet = await connectWallet();
      setWallet(newWallet);
      onWalletChange?.(newWallet);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    const newWallet = disconnectWallet();
    setWallet(newWallet);
    onWalletChange?.(newWallet);
  };

  // Demo mode connection (no Freighter required)
  const handleDemoConnect = () => {
    const demoWallet: WalletState = {
      connected: true,
      address: 'GDEMO00000000000000000000000000000000000000000000000000',
      publicKey: 'GDEMO00000000000000000000000000000000000000000000000000',
      network: 'testnet',
    };
    setWallet(demoWallet);
    onWalletChange?.(demoWallet);
  };

  if (wallet.connected && wallet.address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 border-border/50 bg-card/50 hover:bg-card">
            <div className="flex h-2 w-2 rounded-full bg-[oklch(0.70_0.18_145)]" />
            <span className="font-mono text-sm">{formatAddress(wallet.address)}</span>
            <NetworkBadge network={wallet.network} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">Connected Address</p>
            <p className="font-mono text-xs break-all">{wallet.address}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(wallet.address!);
            }}
          >
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.open(
                `https://stellar.expert/explorer/${wallet.network}/account/${wallet.address}`,
                '_blank'
              );
            }}
          >
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex gap-2">
      {hasFreighter ? (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isConnecting ? (
            <>
              <LoadingSpinner />
              Connecting...
            </>
          ) : (
            <>
              <WalletIcon />
              Connect Wallet
            </>
          )}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <WalletIcon />
              Connect
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleDemoConnect}>
              <span className="flex items-center gap-2">
                <div className="flex h-2 w-2 rounded-full bg-[oklch(0.80_0.15_85)]" />
                Demo Mode
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.open('https://freighter.app', '_blank')}
            >
              <span className="flex items-center gap-2">
                <ExternalLinkIcon />
                Install Freighter Wallet
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function NetworkBadge({ network }: { network: string }) {
  const colors = {
    mainnet: 'bg-[oklch(0.70_0.18_145)] text-[oklch(0.13_0.01_260)]',
    testnet: 'bg-[oklch(0.80_0.15_85)] text-[oklch(0.13_0.01_260)]',
    futurenet: 'bg-[oklch(0.70_0.12_280)] text-foreground',
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[network as keyof typeof colors] || colors.testnet}`}
    >
      {network}
    </span>
  );
}

function WalletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

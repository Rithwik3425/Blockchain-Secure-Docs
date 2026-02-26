/**
 * wallet.tsx
 *
 * Phase 3 & 4 — Wallet Authentication & End-to-End Identity
 */

/// <reference types="vite/client" />

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrowserProvider, formatEther } from "ethers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Supported EVM networks (chain IDs). Extend as needed. */
export type SupportedNetwork = {
  id: number;
  label: string;
};

const SUPPORTED_NETWORKS: SupportedNetwork[] = [
  { id: 31337, label: "Local Hardhat" },
  { id: 80002, label: "Amoy" },
];

/** localStorage key for the persisted wallet session. */
const SESSION_KEY = "bsdms_wallet_session";

/** Session validity window — 24 hours in milliseconds. */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WalletStatus =
  | "disconnected"
  | "connecting"
  | "signing"
  | "connected"
  | "unsupported_network"
  | "error";

/** Shape of the persisted session stored in localStorage. */
type WalletSession = {
  address: string;
  signature: string;
  chainId: number;
  timestamp: number; // UNIX milliseconds
};

export type WalletContextValue = {
  address: string | null;
  signature: string | null;
  status: WalletStatus;
  network: SupportedNetwork | null;
  errorMessage: string | null;
  balance: string | null;
  ensName: string | null;
  sessionRestored: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSession(): WalletSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: WalletSession = JSON.parse(raw);
    if (Date.now() - session.timestamp > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(address: string, signature: string, chainId: number): void {
  const session: WalletSession = { address, signature, chainId, timestamp: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

function shortenBalance(raw: string): string {
  const n = parseFloat(raw);
  return isNaN(n) ? "0.0000" : n.toFixed(4);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const WalletProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => {
  const [address, setAddress] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [network, setNetwork] = useState<SupportedNetwork | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  const resolveSupportedNetwork = useCallback((
    chainId: number,
    networkName: string
  ): SupportedNetwork | null => {
    let supported = SUPPORTED_NETWORKS.find((n) => n.id === chainId) ?? null;
    if (!supported && networkName.toLowerCase().includes("amoy")) {
      supported = { id: chainId, label: "Amoy" };
    }
    return supported;
  }, []);

  const fetchBalance = useCallback(async (
    provider: BrowserProvider,
    addr: string
  ): Promise<void> => {
    try {
      const raw = await provider.getBalance(addr);
      setBalance(shortenBalance(formatEther(raw)));
    } catch {
      setBalance(null);
    }
  }, []);

  const fetchEns = useCallback(async (
    provider: BrowserProvider,
    addr: string
  ): Promise<void> => {
    try {
      const name = await provider.lookupAddress(addr);
      setEnsName(name ?? null);
    } catch {
      setEnsName(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearSession();
    setAddress(null);
    setSignature(null);
    setStatus("disconnected");
    setNetwork(null);
    setErrorMessage(null);
    setBalance(null);
    setEnsName(null);
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (!(window as any).ethereum) return;
    const hexChainId = `0x${chainId.toString(16)}`;

    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          const networkToAdd = SUPPORTED_NETWORKS.find(n => n.id === chainId);
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: networkToAdd?.label ?? "Localhost 8545",
                rpcUrls: [chainId === 31337 ? "http://127.0.0.1:8545" : "https://rpc-amoy.polygon.technology"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          });
        } catch (addError) {
          console.error("[wallet] Failed to add network:", addError);
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setStatus("error");
      setErrorMessage("MetaMask not detected.");
      return;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

    try {
      setStatus("connecting");
      setErrorMessage(null);
      const provider = new BrowserProvider((window as any).ethereum);
      const accounts: string[] = await provider.send("eth_requestAccounts", []);
      const addr = accounts?.[0];
      if (!addr) throw new Error("No accounts returned.");

      const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceData.success) throw new Error(nonceData.error ?? "Failed to get nonce");

      setStatus("signing");
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonceData.message);

      const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, signature }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.error ?? "Verification failed");

      const networkInfo = await provider.getNetwork();
      const chainIdNumber = Number(networkInfo.chainId);
      const supported = resolveSupportedNetwork(chainIdNumber, String((networkInfo as any).name ?? ""));

      setAddress(addr);
      setSignature(signature);
      setNetwork(supported ?? null);
      setStatus(supported ? "connected" : "unsupported_network");
      saveSession(addr, signature, chainIdNumber);
      fetchBalance(provider, addr);
      fetchEns(provider, addr);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error?.message ?? "Authentication failed.");
    }
  }, [resolveSupportedNetwork, fetchBalance, fetchEns]);

  useEffect(() => {
    const restoreSession = async () => {
      const session = loadSession();
      if (!session || typeof window === "undefined" || !(window as any).ethereum) {
        setSessionRestored(true);
        return;
      }

      try {
        const provider = new BrowserProvider((window as any).ethereum);
        const accounts: string[] = await provider.send("eth_accounts", []);
        const currentAddr = accounts?.[0]?.toLowerCase();

        if (!currentAddr || currentAddr !== session.address.toLowerCase()) {
          clearSession();
          setSessionRestored(true);
          return;
        }

        const networkInfo = await provider.getNetwork();
        const chainIdNumber = Number(networkInfo.chainId);
        const supported = resolveSupportedNetwork(chainIdNumber, String((networkInfo as any).name ?? ""));

        setAddress(accounts[0]);
        setSignature(session.signature);
        setNetwork(supported ?? null);
        setStatus(supported ? "connected" : "unsupported_network");
        fetchBalance(provider, accounts[0]);
        fetchEns(provider, accounts[0]);
      } catch {
        clearSession();
      } finally {
        setSessionRestored(true);
      }
    };
    restoreSession();
  }, [resolveSupportedNetwork, fetchBalance, fetchEns]);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const { ethereum } = window as any;

    const handleAccountsChanged = (accounts: string[]) => {
      const next = accounts[0] ?? null;
      if (!next) {
        disconnect();
      } else if (next.toLowerCase() !== address?.toLowerCase()) {
        setAddress(next);
        setSignature(null);
        setStatus("disconnected");
        clearSession();
        const provider = new BrowserProvider(ethereum);
        fetchBalance(provider, next);
        fetchEns(provider, next);
      }
    };

    const handleChainChanged = () => window.location.reload();

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [address, disconnect, fetchBalance, fetchEns]);

  const value = useMemo(
    (): WalletContextValue => ({
      address,
      signature,
      status,
      network,
      errorMessage,
      balance,
      ensName,
      sessionRestored,
      connect,
      disconnect,
      switchNetwork,
    }),
    [address, signature, status, network, errorMessage, balance, ensName, sessionRestored, connect, disconnect, switchNetwork]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextValue => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>.");
  return ctx;
};

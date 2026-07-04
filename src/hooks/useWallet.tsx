"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
}

interface WalletState {
  address: `0x${string}` | null;
  connecting: boolean;
  hasProvider: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  connecting: false,
  hasProvider: false,
  connect: async () => {},
  disconnect: () => {},
});

function getProvider(): Eip1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
}

const STORAGE_KEY = "grafiti.wallet.connected";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    const provider = getProvider();
    const providerExists = !!provider;
    Promise.resolve().then(() => setHasProvider(providerExists));
    if (!provider) return;

    // silently restore a previous session
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      provider
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          const list = accounts as string[];
          if (list.length > 0) setAddress(list[0] as `0x${string}`);
        })
        .catch(() => {});
    }

    const onAccountsChanged = (...args: unknown[]) => {
      const list = (args[0] ?? []) as string[];
      setAddress(list.length > 0 ? (list[0] as `0x${string}`) : null);
      if (list.length === 0) localStorage.removeItem(STORAGE_KEY);
    };
    provider.on?.("accountsChanged", onAccountsChanged);
    return () => provider.removeListener?.("accountsChanged", onAccountsChanged);
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      throw new Error(
        "No injected wallet detected. Install MetaMask, Rainbow, or Zerion.",
      );
    }
    setConnecting(true);
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts.length > 0) {
        setAddress(accounts[0] as `0x${string}`);
        localStorage.setItem(STORAGE_KEY, "1");
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, connecting, hasProvider, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

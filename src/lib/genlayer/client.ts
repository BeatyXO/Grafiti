import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerClient, GenLayerChain } from "genlayer-js/types";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "") as `0x${string}`;

export const CHAIN = studionet;

export function explorerTxUrl(hash: string): string {
  const base = studionet.blockExplorers?.default?.url ?? "https://studio.genlayer.com";
  return `${base.replace(/\/$/, "")}/transactions/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  const base = studionet.blockExplorers?.default?.url ?? "https://studio.genlayer.com";
  return `${base.replace(/\/$/, "")}/accounts/${address}`;
}

const STUDIONET_CHAIN_ID_HEX = `0x${studionet.id.toString(16)}`; // 0xF21F

/** Adds StudioNet to MetaMask and switches to it if needed. No snap required. */
export async function switchToStudioNet(): Promise<void> {
  const eth = typeof window !== "undefined"
    ? (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown }) => Promise<unknown> } }).ethereum
    : undefined;
  if (!eth) return;
  const currentChainId = await eth.request({ method: "eth_chainId" }) as string;
  if (currentChainId === STUDIONET_CHAIN_ID_HEX) return;
  try {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: STUDIONET_CHAIN_ID_HEX,
        chainName: studionet.name,
        rpcUrls: studionet.rpcUrls.default.http,
        nativeCurrency: studionet.nativeCurrency,
        blockExplorerUrls: [studionet.blockExplorers?.default.url ?? "https://studio.genlayer.com"],
      }],
    });
  } catch {
    // wallet_addEthereumChain throws if chain already exists — switch directly
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  }
}

/** Read-only client — works without a connected wallet. */
export function getReadClient(): GenLayerClient<GenLayerChain> {
  return createClient({ chain: studionet });
}

/** Write client bound to the injected wallet (MetaMask / Rainbow / Zerion). */
export function getWalletClient(
  address: `0x${string}`,
): GenLayerClient<GenLayerChain> {
  const provider =
    typeof window !== "undefined"
      ? (window as unknown as { ethereum?: unknown }).ethereum
      : undefined;
  if (!provider) {
    throw new Error(
      "No injected wallet found. Install MetaMask, Rainbow, or Zerion.",
    );
  }
  return createClient({
    chain: studionet,
    account: address,
    // genlayer-js accepts an EIP-1193 provider for signing
    provider: provider as never,
  });
}

export function isContractConfigured(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);
}

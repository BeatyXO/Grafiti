import { TransactionStatus, type TransactionHash } from "genlayer-js/types";
import type {
  Assessment,
  Claim,
  Evidence,
  LeaderboardEntry,
  Reputation,
} from "@/types";
import {
  CONTRACT_ADDRESS,
  getReadClient,
  getWalletClient,
  isContractConfigured,
  switchToStudioNet,
} from "./client";

function requireContract() {
  if (!isContractConfigured()) {
    throw new Error(
      "Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS (Settings page has details).",
    );
  }
}

async function read<T>(functionName: string, args: unknown[] = []): Promise<T> {
  requireContract();
  const client = getReadClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as never[],
    jsonSafeReturn: true,
  });
  return result as T;
}

/** Views that return JSON-encoded strings (GenVM schema only supports scalars + TreeMap/DynArray, not bare dict/list). */
async function readJson<T>(functionName: string, args: unknown[] = []): Promise<T> {
  const raw = await read<string>(functionName, args);
  return JSON.parse(raw) as T;
}

export interface WriteResult {
  hash: string;
}

async function write(
  from: `0x${string}`,
  functionName: string,
  args: unknown[],
): Promise<WriteResult> {
  requireContract();
  const client = getWalletClient(from);
  // Switch MetaMask to StudioNet before writing.
  // We do this manually instead of client.connect() to avoid the snap
  // installation step which is not required for basic signing.
  await switchToStudioNet();
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as never[],
    value: BigInt(0),
  });
  return { hash: hash as string };
}

export async function waitForTx(hash: string) {
  const client = getReadClient();
  return client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    interval: 3000,
    retries: 60,
  });
}

// ---------------------------------------------------------------- writes

export function submitClaim(
  from: `0x${string}`,
  input: {
    title: string;
    description: string;
    category: string;
    evidenceSummary: string;
  },
): Promise<WriteResult> {
  return write(from, "submit_claim", [
    input.title,
    input.description,
    input.category,
    input.evidenceSummary,
    new Date().toISOString(),
  ]);
}

export function addEvidence(
  from: `0x${string}`,
  input: {
    claimId: string;
    title: string;
    kind: string;
    url: string;
    evidenceHash: string;
    source: string;
    relevance: string;
  },
): Promise<WriteResult> {
  return write(from, "add_evidence", [
    input.claimId,
    input.title,
    input.kind,
    input.url,
    input.evidenceHash,
    input.source,
    input.relevance,
    new Date().toISOString(),
  ]);
}

export function requestReview(
  from: `0x${string}`,
  claimId: string,
): Promise<WriteResult> {
  return write(from, "request_review", [claimId, new Date().toISOString()]);
}

// ----------------------------------------------------------------- reads

export const getClaim = async (id: string): Promise<Claim> => {
  const raw = await read<string>("get_claim", [id]);
  if (!raw) throw new Error("Unknown claim");
  return JSON.parse(raw) as Claim;
};

export const getClaims = (offset = 0, limit = 50) =>
  readJson<Claim[]>("get_claims", [BigInt(offset), BigInt(limit)]);

export const getClaimCount = () => read<number>("get_claim_count");

export const getClaimsByOwner = (owner: string) =>
  readJson<Claim[]>("get_claims_by_owner", [owner]);

export const getEvidence = (claimId: string) =>
  readJson<Evidence[]>("get_evidence", [claimId]);

export const getAssessment = async (claimId: string) => {
  const a = await readJson<Assessment | Record<string, never>>(
    "get_assessment",
    [claimId],
  );
  return a && "status" in a ? (a as Assessment) : null;
};

export const getReputation = (owner: string) =>
  readJson<Reputation>("get_reputation", [owner]);

export const getLeaderboard = () =>
  readJson<LeaderboardEntry[]>("get_leaderboard");

export type ClaimStatus =
  | "Pending"
  | "Under Review"
  | "Verified"
  | "Partially Verified"
  | "Unsupported"
  | "Inconclusive";

export type CredibilityLevel =
  | "Untrusted"
  | "Neutral"
  | "Reliable"
  | "Trusted"
  | "Authority";

export const CLAIM_CATEGORIES = [
  "Product Launch",
  "User Metrics",
  "Revenue Milestone",
  "Audit Completion",
  "Research Finding",
  "Governance Announcement",
  "Market Prediction",
  "Public Statement",
] as const;

export const EVIDENCE_TYPES = [
  { value: "website", label: "Website" },
  { value: "explorer", label: "Blockchain Explorer" },
  { value: "github", label: "GitHub Repository" },
  { value: "audit", label: "Audit Report" },
  { value: "dashboard", label: "Public Dashboard" },
  { value: "government", label: "Government Publication" },
  { value: "research", label: "Research Paper" },
  { value: "docs", label: "Official Documentation" },
  { value: "news", label: "News Article" },
] as const;

export interface Claim {
  id: string;
  owner: string;
  title: string;
  description: string;
  category: string;
  evidence_summary: string;
  status: ClaimStatus;
  created_at: string;
  reviewed: boolean;
}

export interface Evidence {
  claim_id: string;
  title: string;
  kind: string;
  url: string;
  evidence_hash: string;
  source: string;
  relevance: string;
  submitter: string;
  submitted_at: string;
}

export interface Assessment {
  claim_id: string;
  status: ClaimStatus;
  gravity_delta: number;
  resulting_score: number;
  credibility_level: CredibilityLevel;
  evidence_strength: "High" | "Medium" | "Low";
  source_reliability: "High" | "Medium" | "Low";
  confidence: number;
  historical_accuracy: number;
  contradiction_level: "None" | "Low" | "Medium" | "High";
  reasoning: string;
}

export interface Reputation {
  gravity_score: number;
  credibility_level: CredibilityLevel;
  historical_accuracy: number;
  total_claims: number;
  verified: number;
  partially_verified: number;
  unsupported: number;
  inconclusive: number;
  exists: boolean;
}

export interface LeaderboardEntry {
  address: string;
  gravity_score: number;
  credibility_level: CredibilityLevel;
  historical_accuracy: number;
  total_claims: number;
  verified: number;
}

export type TxState =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "pending"; hash: string }
  | { phase: "confirmed"; hash: string }
  | { phase: "error"; message: string; hash?: string };

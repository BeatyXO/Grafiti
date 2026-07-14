// Populate contracts/grafiti.py on StudioNet with realistic activity across
// 3 accounts: claims, evidence, and credibility reviews.
//
// Usage (Windows PowerShell):
//   $env:POPULATE_PK_1 = "0x..."
//   $env:POPULATE_PK_2 = "0x..."
//   $env:POPULATE_PK_3 = "0x..."
//   $env:NEXT_PUBLIC_CONTRACT_ADDRESS = "0x..."   # optional, else uses default in client.ts
//   node scripts/populate.mjs

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x19cE8965Ab1a33390446e5bF3FF883636f14D28f";

const keys = [
  process.env.POPULATE_PK_1,
  process.env.POPULATE_PK_2,
  process.env.POPULATE_PK_3,
].filter(Boolean);

if (keys.length < 3) {
  console.error("Set POPULATE_PK_1, POPULATE_PK_2, POPULATE_PK_3 (0x-prefixed) before running.");
  process.exit(1);
}

const accounts = keys.map((k) => createAccount(k));
const clients = accounts.map((account) => createClient({ chain: studionet, account }));
const readClient = createClient({ chain: studionet });

let txCount = 0;

async function write(client, label, functionName, args) {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: BigInt(0),
  });
  txCount++;
  process.stdout.write(`  [${txCount}] ${label} :: ${functionName} -> ${hash}\n`);
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 120,
  });
  return hash;
}

async function read(functionName, args = []) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    jsonSafeReturn: true,
  });
}

const CLAIMS = [
  {
    title: "Protocol X TVL exceeds $500M",
    description: "Protocol X publicly claims total value locked surpassed $500M this quarter, driven by new incentive program.",
    category: "DeFi / TVL",
    evidence_summary: "DefiLlama dashboard and protocol's own analytics page.",
  },
  {
    title: "Validator uptime for Chain Y was 99.98% in June",
    description: "Chain Y's foundation claims network-wide validator uptime of 99.98% for the month of June.",
    category: "Infrastructure",
    evidence_summary: "Public status page and independent monitoring service report.",
  },
  {
    title: "Team Z audited by two independent security firms",
    description: "Project Z states its smart contracts were audited by two independent, named security firms before mainnet launch.",
    category: "Security",
    evidence_summary: "Audit reports linked from project's GitHub repo.",
  },
  {
    title: "Bridge W processed $2B in volume since launch",
    description: "Cross-chain bridge W claims cumulative bridged volume of $2B since its mainnet launch eight months ago.",
    category: "Bridges",
    evidence_summary: "On-chain explorer aggregation and bridge's public dashboard.",
  },
  {
    title: "DAO Q treasury fully diversified across 5 assets",
    description: "DAO Q governance forum post claims treasury was diversified across five distinct assets per a Q2 proposal.",
    category: "DAO / Treasury",
    evidence_summary: "On-chain treasury address and governance proposal execution record.",
  },
  {
    title: "L2 Rollup R achieved sub-cent transaction fees",
    description: "Rollup R's blog claims average transaction fees dropped below $0.01 following a recent upgrade.",
    category: "Scaling",
    evidence_summary: "Public fee tracker and rollup's own fee dashboard.",
  },
  {
    title: "Stablecoin S maintained peg through market stress test",
    description: "Stablecoin S's team claims the peg held within 0.5% during last week's broad market downturn.",
    category: "Stablecoins",
    evidence_summary: "Price feed history across three exchanges during the stress window.",
  },
  {
    title: "Oracle network O reduced latency to under 2 seconds",
    description: "Oracle network O claims median price update latency dropped below 2 seconds after a client upgrade.",
    category: "Oracles",
    evidence_summary: "Independent latency benchmark and oracle's own telemetry dashboard.",
  },
];

const EVIDENCE = [
  { title: "DefiLlama TVL snapshot", kind: "dashboard", url: "https://defillama.com/", source: "DefiLlama", relevance: "Independent TVL aggregation for the protocol." },
  { title: "Status page uptime report", kind: "report", url: "https://status.example-chain.io/", source: "Chain Y Status Page", relevance: "Historical uptime percentage for June." },
  { title: "Audit report PDF", kind: "document", url: "https://github.com/example/audit-report", source: "Security Firm A", relevance: "Findings and scope of the security audit." },
  { title: "Bridge explorer volume", kind: "dashboard", url: "https://explorer.example-bridge.io/stats", source: "Bridge W Explorer", relevance: "Cumulative bridged volume figures." },
  { title: "Governance proposal execution", kind: "onchain", url: "https://forum.example-dao.io/proposal/42", source: "DAO Q Forum", relevance: "Proposal text and execution confirmation." },
  { title: "Fee tracker chart", kind: "dashboard", url: "https://feetracker.example.io/rollup-r", source: "Independent Fee Tracker", relevance: "Average fee trend before/after upgrade." },
  { title: "Cross-exchange price feed", kind: "dashboard", url: "https://priceslippage.example.io/stablecoin-s", source: "Cross-Exchange Feed", relevance: "Peg deviation during the stress window." },
  { title: "Latency benchmark report", kind: "report", url: "https://benchmarks.example.io/oracle-o", source: "Independent Benchmark", relevance: "Median update latency measurements." },
];

async function main() {
  console.log(`Populating ${CONTRACT_ADDRESS} on ${studionet.name}`);
  console.log("Accounts:");
  accounts.forEach((a, i) => console.log(`  [${i + 1}] ${a.address}`));

  const claimIds = [];

  // Step 1: each account submits 2 claims (6 total)
  for (let i = 0; i < CLAIMS.length; i++) {
    const acc = i % accounts.length;
    const c = CLAIMS[i];
    const hash = await write(clients[acc], `acct${acc + 1}`, "submit_claim", [
      c.title,
      c.description,
      c.category,
      c.evidence_summary,
      new Date().toISOString(),
    ]);
    const receipt = await readClient.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      interval: 1000,
      retries: 5,
    }).catch(() => null);
    void receipt;
  }

  const countRaw = await read("get_claim_count");
  const total = Number(countRaw);
  for (let id = total - CLAIMS.length + 1; id <= total; id++) claimIds.push(String(id));
  console.log("Created claim ids:", claimIds);

  // Step 2: claim owners attach 1-2 evidence entries to their own claims.
  // The contract rejects third-party evidence to prevent reputation poisoning.
  for (let i = 0; i < claimIds.length; i++) {
    const claimId = claimIds[i];
    const ev = EVIDENCE[i % EVIDENCE.length];
    const acc = i % accounts.length;
    await write(clients[acc], `acct${acc + 1}`, "add_evidence", [
      claimId,
      ev.title,
      ev.kind,
      ev.url,
      "sha256:" + Buffer.from(ev.url + ev.title).toString("hex").slice(0, 64),
      ev.source,
      ev.relevance,
      new Date().toISOString(),
    ]);
    // second evidence item on every claim
    const ev2 = EVIDENCE[(i + 2) % EVIDENCE.length];
    const acc2 = i % accounts.length;
    await write(clients[acc2], `acct${acc2 + 1}`, "add_evidence", [
      claimId,
      ev2.title,
      ev2.kind,
      ev2.url,
      "sha256:" + Buffer.from(ev2.url + ev2.title + "2").toString("hex").slice(0, 64),
      ev2.source,
      ev2.relevance,
      new Date().toISOString(),
    ]);
  }

  // Step 3: request review on every claim (triggers non-deterministic consensus)
  for (let i = 0; i < claimIds.length; i++) {
    const claimId = claimIds[i];
    const acc = i % accounts.length;
    await write(clients[acc], `acct${acc + 1}`, "request_review", [
      claimId,
      new Date().toISOString(),
    ]);
  }

  console.log(`\nDone. ${txCount} write transactions submitted and finalized.`);

  // Verify: dump leaderboard + a couple assessments
  const leaderboard = await read("get_leaderboard");
  console.log("\nLeaderboard:", leaderboard);
  for (const claimId of claimIds.slice(0, 3)) {
    const a = await read("get_assessment", [claimId]);
    console.log(`Assessment #${claimId}:`, a);
  }
}

main().catch((err) => {
  console.error("Populate script failed:", err);
  process.exit(1);
});

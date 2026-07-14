# Grafiti — Decentralized Reputation and Credibility Consensus

Grafiti is a decentralized reputation protocol built on [GenLayer](https://genlayer.com). Users make public claims backed by public evidence URLs. GenLayer validators independently fetch the evidence using non-deterministic web access, assess credibility through AI consensus, and permanently adjust the claimant's **Gravity Score** — reputation earned through verified accuracy, not social signals.

Live: [grafiti-orcin.vercel.app](https://grafiti-orcin.vercel.app)

---

## How it works

1. **Submit a claim** — any wallet can submit a public, on-chain claim with a title, description, category, and evidence summary
2. **Attach evidence** — structured evidence references (public URLs + client-side SHA-256 hashes) are registered on-chain; evidence is frozen once a review runs
3. **Request a credibility review** — GenLayer validators each independently fetch the evidence URLs (`gl.nondet.web.render`), evaluate the evidence quality, source reliability, consistency, and contradictions, then reach consensus using `gl.eq_principle.prompt_non_comparative`
4. **Reputation update** — the Gravity Score (0–1000, starts at 500) shifts by a bounded delta (max +20 / −25 per review); the assessment record is immutable on-chain

**Credibility levels**

| Score range | Level |
|-------------|-------|
| 900–1000 | Authority |
| 750–899 | Trusted |
| 600–749 | Reliable |
| 300–599 | Neutral |
| 0–299 | Untrusted |

---

## Reputation update authorization

Only the wallet that created a claim can add evidence to it or request its one-time, score-changing review. This prevents a third party from placing misleading evidence ahead of the claimant's sources or forcing a permanent Gravity Score update.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| Chain | GenLayer StudioNet · GEN token |
| SDK | genlayer-js 1.1.8 |
| Contract | Python · GenLayer Intelligent Contract (`contracts/grafiti.py`) |
| Wallets | Injected providers — MetaMask, Rainbow, Zerion |

No backend. No database. No file uploads. The Intelligent Contract is the canonical source of truth.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/submit` | Submit a public claim |
| `/dashboard` | Your Gravity Score, credibility level, and claim history |
| `/claims/[id]` | Claim detail, evidence list, and consensus assessment viewer |
| `/profile/[address]` | Public profile and claim history for any wallet |
| `/explorer` | Credibility leaderboard and recent claims |
| `/evidence` | Full on-chain evidence registry |
| `/settings` | Network info, wallet status, and raw contract interaction panel |

---

## Contract

**Address (StudioNet):** `0x19cE8965Ab1a33390446e5bF3FF883636f14D28f`

File: [`contracts/grafiti.py`](contracts/grafiti.py)

### Storage architecture

All storage uses flat `TreeMap[str, str]` with JSON-encoded blobs and pipe-delimited index strings — the pattern required by GenVM's schema introspection. No nested dataclasses, no Address-keyed maps, no DynArray of custom types.

```python
claim_counter: u256
claims: TreeMap[str, str]         # claim_id -> JSON claim record
claim_index: TreeMap[str, str]    # "all" -> pipe-joined claim IDs
owner_claims: TreeMap[str, str]   # owner address -> pipe-joined claim IDs
claim_evidence: TreeMap[str, str] # claim_id -> JSON evidence array
reputation: TreeMap[str, str]     # owner address -> JSON reputation record
participants: TreeMap[str, str]   # "all" -> pipe-joined addresses
assessments: TreeMap[str, str]    # claim_id -> JSON assessment record
```

### Non-deterministic AI consensus

The `request_review` method uses GenLayer's equivalence principle correctly:

```python
consensus_json = gl.eq_principle.prompt_non_comparative(
    consensus_context, # leader fetches evidence URLs via gl.nondet.web.render
    task=task,         # instructs the LLM what to assess
    criteria=criteria, # validators judge the leader's output against these rules
)
```

Each validator independently fetches the evidence URLs and the leader produces a structured JSON verdict. Validators then check whether the leader's verdict is reasonable — not by repeating the full task, but by evaluating the output against the stated criteria. This is the correct pattern for open-ended credibility judgments.

---

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with MetaMask installed.

---

## Deploy the Intelligent Contract

**Option A — GenLayer Studio (recommended)**

1. Open [studio.genlayer.com](https://studio.genlayer.com)
2. Create a new contract and paste the contents of `contracts/grafiti.py`
3. Deploy with no constructor arguments
4. Copy the contract address into `.env.local`

**Option B — deploy script**

```powershell
$env:DEPLOYER_PRIVATE_KEY = "0x..."   # StudioNet account with GEN balance
node scripts/deploy.mjs
```

---

## Deploy the frontend

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variable: `NEXT_PUBLIC_CONTRACT_ADDRESS=0x19cE8965Ab1a33390446e5bF3FF883636f14D28f`
4. Deploy — no other configuration needed

The wallet switching to StudioNet is handled automatically on the first write transaction.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Yes | Deployed Grafiti contract address on StudioNet |

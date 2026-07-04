# Grafiti — Decentralized Reputation and Credibility Consensus

Grafiti is a decentralized reputation protocol on [GenLayer](https://genlayer.com).
Users make public claims backed by public evidence URLs; GenLayer validators
evaluate each claim with AI (non-deterministic consensus) and adjust the
claimant's **Gravity Score** — credibility earned through consistent accuracy,
not popularity.

## Stack

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui
- **Chain:** GenLayer StudioNet (GEN token) via `genlayer-js`
- **Contract:** `contracts/grafiti.py` (GenLayer Intelligent Contract, Python)
- **Wallets:** injected providers — MetaMask, Rainbow, Zerion
- No backend, no database, no file uploads. The contract is the source of truth.

## Getting started (Windows-safe)

```powershell
npm install
Copy-Item .env.example .env.local   # then fill in the contract address
npm run dev
```

## Deploying the Intelligent Contract

**Option A — GenLayer Studio (recommended):**
1. Open https://studio.genlayer.com
2. Create a new contract, paste the contents of `contracts/grafiti.py`
3. Deploy (no constructor args) and copy the contract address

**Option B — script:**
```powershell
$env:DEPLOYER_PRIVATE_KEY = "0x..."   # funded StudioNet account
node scripts/deploy.mjs
```

Then set the address:

```powershell
# .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
```

## Deploying the frontend (Vercel)

1. Push this repo to GitHub and import it in Vercel
2. Add the `NEXT_PUBLIC_CONTRACT_ADDRESS` environment variable
3. Deploy — no other configuration required

## Protocol workflow

1. **Submit claim** (`/submit`) — title, description, category, evidence summary
2. **Attach evidence** (claim page) — public URLs + client-side SHA-256 hashes;
   evidence freezes once a review runs
3. **Request review** — validators fetch the evidence, score evidence quality,
   consistency, source reliability, and contradictions, then converge via
   `gl.eq_principle_prompt_comparative` on the most defensible assessment
4. **Reputation update** — Gravity Score (0–1000, starts at 500) shifts by a
   bounded delta (+20 / −25 max per review); the assessment is immutable

Credibility levels: `Untrusted <300 · Neutral 300–599 · Reliable 600–749 ·
Trusted 750–899 · Authority 900+`

## Pages

`/` landing · `/submit` claim submission · `/dashboard` reputation dashboard ·
`/claims/[id]` claim detail + consensus viewer · `/profile/[address]` public
profile + claim history · `/explorer` credibility ranking + recent claims ·
`/evidence` evidence registry · `/settings` network, wallet, and raw contract
interaction panel

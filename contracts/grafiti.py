# { "Depends": "py-genlayer:latest" }
#
# Grafiti Protocol — Decentralized Reputation and Credibility Consensus
#
# Intelligent Contract for GenLayer (StudioNet).
# Canonical source of truth for claims, evidence references, consensus
# assessments, and Gravity Scores.

import json
from dataclasses import dataclass

from genlayer import *

# ---------------------------------------------------------------------------
# Tunable protocol constants
# ---------------------------------------------------------------------------
INITIAL_GRAVITY_SCORE = 500
MIN_GRAVITY_SCORE = 0
MAX_GRAVITY_SCORE = 1000
MAX_GAIN_PER_REVIEW = 20    # cap on positive delta from a single review
MAX_LOSS_PER_REVIEW = 25    # cap on negative delta from a single review
MAX_EVIDENCE_URLS_FETCHED = 3  # how many evidence URLs validators will render


@allow_storage
@dataclass
class Claim:
    id: u256
    owner: Address
    title: str
    description: str
    category: str
    evidence_summary: str
    status: str          # "Pending" | "Under Review" | "Verified" | "Partially Verified" | "Unsupported" | "Inconclusive"
    created_at: str
    reviewed: bool


@allow_storage
@dataclass
class Evidence:
    claim_id: u256
    title: str
    kind: str            # website | explorer | github | audit | dashboard | government | research | docs | news
    url: str
    evidence_hash: str   # client-side SHA-256 of the referenced content/URL
    source: str
    relevance: str
    submitter: Address
    submitted_at: str


@allow_storage
@dataclass
class Reputation:
    gravity_score: u256
    total_claims: u256
    verified: u256
    partially_verified: u256
    unsupported: u256
    inconclusive: u256


@allow_storage
@dataclass
class Assessment:
    claim_id: u256
    status: str
    gravity_delta: i256
    resulting_score: u256
    credibility_level: str
    evidence_strength: str      # High | Medium | Low
    source_reliability: str     # High | Medium | Low
    confidence: u256            # 0-100
    historical_accuracy: u256   # 0-100 at time of review
    contradiction_level: str    # None | Low | Medium | High
    reasoning: str


def credibility_level(score: int) -> str:
    if score >= 900:
        return "Authority"
    if score >= 750:
        return "Trusted"
    if score >= 600:
        return "Reliable"
    if score >= 300:
        return "Neutral"
    return "Untrusted"


class GrafitiProtocol(gl.Contract):
    claims: TreeMap[u256, Claim]
    claim_evidence: TreeMap[u256, DynArray[Evidence]]
    reputation: TreeMap[Address, Reputation]
    assessments: TreeMap[u256, Assessment]
    claim_owners: DynArray[Address]   # index i -> owner of claim i+1 (for iteration)
    next_claim_id: u256
    participants: DynArray[Address]   # unique wallets with reputation records

    def __init__(self):
        self.next_claim_id = u256(1)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _ensure_reputation(self, who: Address) -> Reputation:
        if who not in self.reputation:
            self.reputation[who] = Reputation(
                gravity_score=u256(INITIAL_GRAVITY_SCORE),
                total_claims=u256(0),
                verified=u256(0),
                partially_verified=u256(0),
                unsupported=u256(0),
                inconclusive=u256(0),
            )
            self.participants.append(who)
        return self.reputation[who]

    def _historical_accuracy(self, rep: Reputation) -> int:
        reviewed = int(rep.verified) + int(rep.partially_verified) + int(rep.unsupported)
        if reviewed == 0:
            return 50  # no track record yet -> neutral prior
        weighted = int(rep.verified) * 100 + int(rep.partially_verified) * 60
        return weighted // reviewed

    # ------------------------------------------------------------------
    # Step 1: Create public claim
    # ------------------------------------------------------------------
    @gl.public.write
    def submit_claim(
        self,
        title: str,
        description: str,
        category: str,
        evidence_summary: str,
        created_at: str,
    ) -> u256:
        assert len(title.strip()) > 0, "Claim title is required"
        assert len(description.strip()) > 0, "Claim description is required"
        claim_id = self.next_claim_id
        owner = gl.message.sender_address
        self.claims[claim_id] = Claim(
            id=claim_id,
            owner=owner,
            title=title,
            description=description,
            category=category,
            evidence_summary=evidence_summary,
            status="Pending",
            created_at=created_at,
            reviewed=False,
        )
        self.claim_owners.append(owner)
        rep = self._ensure_reputation(owner)
        rep.total_claims = u256(int(rep.total_claims) + 1)
        self.next_claim_id = u256(int(claim_id) + 1)
        return claim_id

    # ------------------------------------------------------------------
    # Step 2: Submit evidence (structured references + hashes only)
    # ------------------------------------------------------------------
    @gl.public.write
    def add_evidence(
        self,
        claim_id: u256,
        title: str,
        kind: str,
        url: str,
        evidence_hash: str,
        source: str,
        relevance: str,
        submitted_at: str,
    ) -> None:
        assert claim_id in self.claims, "Unknown claim"
        claim = self.claims[claim_id]
        assert not claim.reviewed, "Claim already reviewed; evidence is frozen"
        assert url.startswith("http://") or url.startswith("https://"), "Evidence URL must be public (http/https)"
        if claim_id not in self.claim_evidence:
            self.claim_evidence[claim_id] = DynArray[Evidence]()
        self.claim_evidence[claim_id].append(
            Evidence(
                claim_id=claim_id,
                title=title,
                kind=kind,
                url=url,
                evidence_hash=evidence_hash,
                source=source,
                relevance=relevance,
                submitter=gl.message.sender_address,
                submitted_at=submitted_at,
            )
        )

    # ------------------------------------------------------------------
    # Steps 3-6: Credibility review via non-deterministic AI consensus
    # ------------------------------------------------------------------
    @gl.public.write
    def request_review(self, claim_id: u256) -> str:
        assert claim_id in self.claims, "Unknown claim"
        claim = self.claims[claim_id]
        assert not claim.reviewed, "Claim has already been reviewed"
        assert claim_id in self.claim_evidence and len(self.claim_evidence[claim_id]) > 0, \
            "At least one piece of evidence is required before review"

        owner = claim.owner
        rep = self._ensure_reputation(owner)
        hist_accuracy = self._historical_accuracy(rep)

        evidence_list = self.claim_evidence[claim_id]
        evidence_lines = []
        urls = []
        for ev in evidence_list:
            evidence_lines.append(
                f"- title: {ev.title} | type: {ev.kind} | source: {ev.source} | "
                f"relevance: {ev.relevance} | url: {ev.url}"
            )
            urls.append(ev.url)

        def evaluate() -> str:
            pages = []
            for url in urls[:MAX_EVIDENCE_URLS_FETCHED]:
                try:
                    page = gl.nondet.web.render(url, mode="text")
                    pages.append(f"URL: {url}\n{str(page)[:4000]}")
                except Exception as e:
                    pages.append(f"URL: {url}\nFETCH FAILED: {e}")
            web_context = "\n\n---\n\n".join(pages)

            prompt = f"""You are a credibility assessor for a decentralized reputation protocol.

A user made a public claim and supplied public evidence. Evaluate whether the
evidence supports the claim. Be strict: exaggeration, missing context, or
unverifiable statements must lower the assessment.

CLAIM TITLE: {claim.title}
CLAIM DESCRIPTION: {claim.description}
CATEGORY: {claim.category}
CLAIMANT'S EVIDENCE SUMMARY: {claim.evidence_summary}
CLAIMANT HISTORICAL ACCURACY: {hist_accuracy}% (0-100; their past track record)

EVIDENCE REFERENCES:
{chr(10).join(evidence_lines)}

FETCHED EVIDENCE CONTENT:
{web_context}

Assess: evidence quality, claim consistency, source reliability,
contradictions, and overall confidence.

Respond ONLY with a JSON object, no markdown fences, with exactly these keys:
{{
  "status": "Verified" | "Partially Verified" | "Unsupported" | "Inconclusive",
  "gravity_delta": integer between -{MAX_LOSS_PER_REVIEW} and {MAX_GAIN_PER_REVIEW},
  "evidence_strength": "High" | "Medium" | "Low",
  "source_reliability": "High" | "Medium" | "Low",
  "confidence": integer 0-100,
  "contradiction_level": "None" | "Low" | "Medium" | "High",
  "reasoning": "2-3 sentence summary of the most defensible assessment"
}}
Rules:
- "Verified" requires strong, directly relevant supporting evidence (positive delta).
- "Partially Verified": evidence supports part of the claim (small positive delta).
- "Unsupported": evidence contradicts or fails to support the claim (negative delta).
- "Inconclusive": evidence could not be evaluated (delta 0).
"""
            result = gl.nondet.exec_prompt(prompt)
            return str(result).replace("```json", "").replace("```", "").strip()

        raw = gl.eq_principle_prompt_comparative(
            evaluate,
            principle=(
                "The status classification must be identical, gravity_delta within 5 points, "
                "confidence within 15 points, and the reasoning must reach a materially "
                "equivalent conclusion about whether the evidence supports the claim."
            ),
        )

        data = json.loads(raw)
        status = str(data.get("status", "Inconclusive"))
        if status not in ("Verified", "Partially Verified", "Unsupported", "Inconclusive"):
            status = "Inconclusive"
        delta = int(data.get("gravity_delta", 0))
        delta = max(-MAX_LOSS_PER_REVIEW, min(MAX_GAIN_PER_REVIEW, delta))
        # enforce sign consistency with status
        if status == "Verified":
            delta = max(1, delta)
        elif status == "Partially Verified":
            delta = max(1, min(delta, MAX_GAIN_PER_REVIEW // 2))
        elif status == "Unsupported":
            delta = min(-1, delta)
        else:
            delta = 0
        confidence = max(0, min(100, int(data.get("confidence", 50))))

        new_score = int(rep.gravity_score) + delta
        new_score = max(MIN_GRAVITY_SCORE, min(MAX_GRAVITY_SCORE, new_score))
        rep.gravity_score = u256(new_score)
        if status == "Verified":
            rep.verified = u256(int(rep.verified) + 1)
        elif status == "Partially Verified":
            rep.partially_verified = u256(int(rep.partially_verified) + 1)
        elif status == "Unsupported":
            rep.unsupported = u256(int(rep.unsupported) + 1)
        else:
            rep.inconclusive = u256(int(rep.inconclusive) + 1)

        claim.status = status
        claim.reviewed = True

        self.assessments[claim_id] = Assessment(
            claim_id=claim_id,
            status=status,
            gravity_delta=i256(delta),
            resulting_score=u256(new_score),
            credibility_level=credibility_level(new_score),
            evidence_strength=str(data.get("evidence_strength", "Low")),
            source_reliability=str(data.get("source_reliability", "Low")),
            confidence=u256(confidence),
            historical_accuracy=u256(self._historical_accuracy(rep)),
            contradiction_level=str(data.get("contradiction_level", "None")),
            reasoning=str(data.get("reasoning", "")),
        )
        return status

    # ------------------------------------------------------------------
    # Views
    # ------------------------------------------------------------------
    @gl.public.view
    def get_claim(self, claim_id: u256) -> dict:
        assert claim_id in self.claims, "Unknown claim"
        c = self.claims[claim_id]
        return {
            "id": int(c.id),
            "owner": c.owner.as_hex,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "evidence_summary": c.evidence_summary,
            "status": c.status,
            "created_at": c.created_at,
            "reviewed": c.reviewed,
        }

    @gl.public.view
    def get_claims(self, offset: u256, limit: u256) -> list:
        total = int(self.next_claim_id) - 1
        out = []
        # newest first
        start = total - int(offset)
        stop = max(0, start - int(limit))
        for i in range(start, stop, -1):
            cid = u256(i)
            if cid in self.claims:
                out.append(self.get_claim(cid))
        return out

    @gl.public.view
    def get_claim_count(self) -> u256:
        return u256(int(self.next_claim_id) - 1)

    @gl.public.view
    def get_claims_by_owner(self, owner: str) -> list:
        target = Address(owner)
        out = []
        for i in range(1, int(self.next_claim_id)):
            cid = u256(i)
            if cid in self.claims and self.claims[cid].owner == target:
                out.append(self.get_claim(cid))
        return out

    @gl.public.view
    def get_evidence(self, claim_id: u256) -> list:
        if claim_id not in self.claim_evidence:
            return []
        out = []
        for ev in self.claim_evidence[claim_id]:
            out.append({
                "claim_id": int(ev.claim_id),
                "title": ev.title,
                "kind": ev.kind,
                "url": ev.url,
                "evidence_hash": ev.evidence_hash,
                "source": ev.source,
                "relevance": ev.relevance,
                "submitter": ev.submitter.as_hex,
                "submitted_at": ev.submitted_at,
            })
        return out

    @gl.public.view
    def get_assessment(self, claim_id: u256) -> dict:
        if claim_id not in self.assessments:
            return {}
        a = self.assessments[claim_id]
        return {
            "claim_id": int(a.claim_id),
            "status": a.status,
            "gravity_delta": int(a.gravity_delta),
            "resulting_score": int(a.resulting_score),
            "credibility_level": a.credibility_level,
            "evidence_strength": a.evidence_strength,
            "source_reliability": a.source_reliability,
            "confidence": int(a.confidence),
            "historical_accuracy": int(a.historical_accuracy),
            "contradiction_level": a.contradiction_level,
            "reasoning": a.reasoning,
        }

    @gl.public.view
    def get_reputation(self, owner: str) -> dict:
        target = Address(owner)
        if target not in self.reputation:
            return {
                "gravity_score": INITIAL_GRAVITY_SCORE,
                "credibility_level": credibility_level(INITIAL_GRAVITY_SCORE),
                "historical_accuracy": 50,
                "total_claims": 0,
                "verified": 0,
                "partially_verified": 0,
                "unsupported": 0,
                "inconclusive": 0,
                "exists": False,
            }
        r = self.reputation[target]
        return {
            "gravity_score": int(r.gravity_score),
            "credibility_level": credibility_level(int(r.gravity_score)),
            "historical_accuracy": self._historical_accuracy(r),
            "total_claims": int(r.total_claims),
            "verified": int(r.verified),
            "partially_verified": int(r.partially_verified),
            "unsupported": int(r.unsupported),
            "inconclusive": int(r.inconclusive),
            "exists": True,
        }

    @gl.public.view
    def get_leaderboard(self) -> list:
        out = []
        for addr in self.participants:
            r = self.reputation[addr]
            out.append({
                "address": addr.as_hex,
                "gravity_score": int(r.gravity_score),
                "credibility_level": credibility_level(int(r.gravity_score)),
                "historical_accuracy": self._historical_accuracy(r),
                "total_claims": int(r.total_claims),
                "verified": int(r.verified),
            })
        out.sort(key=lambda x: x["gravity_score"], reverse=True)
        return out

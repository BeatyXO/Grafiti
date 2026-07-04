# v0.2.20
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import typing

# ---------------------------------------------------------------------------
# Tunable protocol constants
# ---------------------------------------------------------------------------
INITIAL_GRAVITY_SCORE = 500
MIN_GRAVITY_SCORE = 0
MAX_GRAVITY_SCORE = 1000
MAX_GAIN_PER_REVIEW = 20    # cap on positive delta from a single review
MAX_LOSS_PER_REVIEW = 25    # cap on negative delta from a single review
MAX_EVIDENCE_URLS_FETCHED = 3  # how many evidence URLs validators will render


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
    """
    Grafiti — decentralized reputation and credibility consensus.

    What belongs on-chain: claim records, structured evidence references
    and hashes, consensus assessments, and reputation (Gravity Score)
    history. No files, no private data — only public claims and public
    evidence URLs.
    """

    claim_counter: u256

    claims: TreeMap[str, str]           # claim_id -> json claim record
    claim_index: TreeMap[str, str]      # "all" -> "|"-joined claim ids, oldest first
    owner_claims: TreeMap[str, str]     # owner (lowercase hex) -> "|"-joined claim ids

    claim_evidence: TreeMap[str, str]   # claim_id -> json array of evidence records

    reputation: TreeMap[str, str]       # owner (lowercase hex) -> json reputation record
    participants: TreeMap[str, str]     # "all" -> "|"-joined owner addresses

    assessments: TreeMap[str, str]      # claim_id -> json assessment record

    def __init__(self) -> None:
        self.claim_counter = u256(0)

        self.claims = TreeMap()
        self.claim_index = TreeMap()
        self.owner_claims = TreeMap()

        self.claim_evidence = TreeMap()

        self.reputation = TreeMap()
        self.participants = TreeMap()

        self.assessments = TreeMap()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _sender(self) -> str:
        return gl.message.sender_address.as_hex.lower()

    def _json(self, value: typing.Any) -> str:
        return json.dumps(value, sort_keys=True)

    def _load(self, raw: str) -> typing.Any:
        if raw is None or raw == "":
            return None
        return json.loads(raw)

    def _require_non_empty(self, value: str, field_name: str) -> None:
        if value is None or len(value.strip()) == 0:
            raise gl.vm.UserError(field_name + " is required")

    def _limit(self, value: typing.Any, max_len: int) -> str:
        text = str(value)
        if len(text) > max_len:
            return text[:max_len]
        return text

    def _to_int(self, value: typing.Any, fallback: int) -> int:
        try:
            return int(value)
        except Exception:
            return fallback

    def _append(self, existing: str, item: str) -> str:
        if existing is None or existing == "":
            return item
        return existing + "|" + item

    def _append_unique(self, existing: str, item: str) -> str:
        if existing is None or existing == "":
            return item
        parts = existing.split("|")
        for part in parts:
            if part == item:
                return existing
        return existing + "|" + item

    def _split(self, value: str) -> typing.List[str]:
        if value is None or value == "":
            return []
        return [v for v in value.split("|") if v != ""]

    def _default_reputation(self) -> dict:
        return {
            "gravity_score": INITIAL_GRAVITY_SCORE,
            "total_claims": 0,
            "verified": 0,
            "partially_verified": 0,
            "unsupported": 0,
            "inconclusive": 0,
        }

    def _load_reputation(self, owner: str) -> dict:
        raw = self.reputation.get(owner, "")
        if raw == "":
            return self._default_reputation()
        return self._load(raw)

    def _ensure_participant(self, owner: str) -> None:
        if self.reputation.get(owner, "") == "":
            self.reputation[owner] = self._json(self._default_reputation())
            self.participants["all"] = self._append_unique(
                self.participants.get("all", ""), owner
            )

    def _historical_accuracy(self, rep: dict) -> int:
        verified = self._to_int(rep.get("verified", 0), 0)
        partial = self._to_int(rep.get("partially_verified", 0), 0)
        unsupported = self._to_int(rep.get("unsupported", 0), 0)
        reviewed = verified + partial + unsupported
        if reviewed == 0:
            return 50  # no track record yet -> neutral prior
        weighted = verified * 100 + partial * 60
        return weighted // reviewed

    def _reputation_view(self, owner: str) -> dict:
        rep = self._load_reputation(owner)
        return {
            "gravity_score": self._to_int(rep.get("gravity_score", INITIAL_GRAVITY_SCORE), INITIAL_GRAVITY_SCORE),
            "credibility_level": credibility_level(self._to_int(rep.get("gravity_score", INITIAL_GRAVITY_SCORE), INITIAL_GRAVITY_SCORE)),
            "historical_accuracy": self._historical_accuracy(rep),
            "total_claims": self._to_int(rep.get("total_claims", 0), 0),
            "verified": self._to_int(rep.get("verified", 0), 0),
            "partially_verified": self._to_int(rep.get("partially_verified", 0), 0),
            "unsupported": self._to_int(rep.get("unsupported", 0), 0),
            "inconclusive": self._to_int(rep.get("inconclusive", 0), 0),
            "exists": self.reputation.get(owner, "") != "",
        }

    def _assert_no_predecided_verdict(self, text: str) -> None:
        lower = text.lower()
        forbidden = [
            '"status"', "'status'", "status:",
            '"gravity_delta"', "'gravity_delta'", "gravity_delta:",
            '"verified"', "'verified'",
            '"confidence"', "'confidence'", "confidence:",
        ]
        for item in forbidden:
            if item in lower:
                raise gl.vm.UserError("Input contains pre-decided review language: " + item)

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
    ) -> str:
        self._require_non_empty(title, "title")
        self._require_non_empty(description, "description")
        self._assert_no_predecided_verdict(title + " " + description + " " + evidence_summary)

        owner = self._sender()
        self.claim_counter = self.claim_counter + u256(1)
        claim_id = str(self.claim_counter)

        record = {
            "id": claim_id,
            "owner": owner,
            "title": self._limit(title, 120),
            "description": self._limit(description, 2000),
            "category": self._limit(category, 140),
            "evidence_summary": self._limit(evidence_summary, 1000),
            "status": "Pending",
            "created_at": created_at,
            "reviewed": False,
        }
        self.claims[claim_id] = self._json(record)
        self.claim_index["all"] = self._append(self.claim_index.get("all", ""), claim_id)
        self.owner_claims[owner] = self._append(self.owner_claims.get(owner, ""), claim_id)

        self._ensure_participant(owner)
        rep = self._load_reputation(owner)
        rep["total_claims"] = self._to_int(rep.get("total_claims", 0), 0) + 1
        self.reputation[owner] = self._json(rep)

        return claim_id

    # ------------------------------------------------------------------
    # Step 2: Submit evidence (structured references + hashes only)
    # ------------------------------------------------------------------
    @gl.public.write
    def add_evidence(
        self,
        claim_id: str,
        title: str,
        kind: str,
        url: str,
        evidence_hash: str,
        source: str,
        relevance: str,
        submitted_at: str,
    ) -> None:
        raw_claim = self.claims.get(claim_id, "")
        if raw_claim == "":
            raise gl.vm.UserError("Unknown claim")
        claim = self._load(raw_claim)
        if claim.get("reviewed", False):
            raise gl.vm.UserError("Claim already reviewed; evidence is frozen")
        if not (url.startswith("http://") or url.startswith("https://")):
            raise gl.vm.UserError("Evidence URL must be public (http/https)")

        entries = self._load(self.claim_evidence.get(claim_id, "")) or []
        entries.append({
            "claim_id": claim_id,
            "title": self._limit(title, 180),
            "kind": kind,
            "url": url,
            "evidence_hash": evidence_hash,
            "source": self._limit(source, 200),
            "relevance": self._limit(relevance, 300),
            "submitter": self._sender(),
            "submitted_at": submitted_at,
        })
        self.claim_evidence[claim_id] = self._json(entries)

    # ------------------------------------------------------------------
    # Steps 3-6: Credibility review via non-deterministic AI consensus
    # ------------------------------------------------------------------
    @gl.public.write
    def request_review(self, claim_id: str, reviewed_at: str) -> str:
        raw_claim = self.claims.get(claim_id, "")
        if raw_claim == "":
            raise gl.vm.UserError("Unknown claim")
        claim = self._load(raw_claim)
        if claim.get("reviewed", False):
            raise gl.vm.UserError("Claim has already been reviewed")

        entries = self._load(self.claim_evidence.get(claim_id, "")) or []
        if len(entries) == 0:
            raise gl.vm.UserError("At least one piece of evidence is required before review")

        owner = claim.get("owner", "")
        rep = self._load_reputation(owner)
        hist_accuracy = self._historical_accuracy(rep)

        evidence_lines = []
        urls = []
        for ev in entries:
            evidence_lines.append(
                "- title: " + str(ev.get("title", "")) + " | type: " + str(ev.get("kind", ""))
                + " | source: " + str(ev.get("source", "")) + " | relevance: " + str(ev.get("relevance", ""))
                + " | url: " + str(ev.get("url", ""))
            )
            urls.append(str(ev.get("url", "")))

        claim_title = str(claim.get("title", ""))
        claim_description = str(claim.get("description", ""))
        claim_category = str(claim.get("category", ""))
        claim_evidence_summary = str(claim.get("evidence_summary", ""))
        evidence_text = "\n".join(evidence_lines)

        def evaluate() -> str:
            pages = []
            for url in urls[:MAX_EVIDENCE_URLS_FETCHED]:
                try:
                    page = gl.nondet.web.render(url, mode="text")
                    pages.append("URL: " + url + "\n" + str(page)[:4000])
                except Exception as e:
                    pages.append("URL: " + url + "\nFETCH FAILED: " + str(e))
            web_context = "\n\n---\n\n".join(pages)

            context = (
                "CLAIM TITLE: " + claim_title + "\n"
                "CLAIM DESCRIPTION: " + claim_description + "\n"
                "CATEGORY: " + claim_category + "\n"
                "CLAIMANT'S EVIDENCE SUMMARY: " + claim_evidence_summary + "\n"
                "CLAIMANT HISTORICAL ACCURACY: " + str(hist_accuracy) + "%\n\n"
                "EVIDENCE REFERENCES:\n" + evidence_text + "\n\n"
                "FETCHED EVIDENCE CONTENT:\n" + web_context
            )

            task = (
                "You are a credibility assessor for a decentralized reputation protocol. "
                "Evaluate whether the public evidence supports the public claim. Be strict: "
                "exaggeration, missing context, or unverifiable statements must lower the assessment. "
                "Return ONLY valid JSON, no markdown fences, with exactly these keys: "
                '{"status":"Verified|Partially Verified|Unsupported|Inconclusive",'
                '"gravity_delta":integer,"evidence_strength":"High|Medium|Low",'
                '"source_reliability":"High|Medium|Low","confidence":integer 0-100,'
                '"contradiction_level":"None|Low|Medium|High","reasoning":"2-3 sentences"}'
            )
            criteria = (
                "The status must be exactly one of: Verified, Partially Verified, Unsupported, Inconclusive. "
                "gravity_delta must be an integer between -" + str(MAX_LOSS_PER_REVIEW) + " and " + str(MAX_GAIN_PER_REVIEW) + ". "
                "Verified requires strong, directly relevant supporting evidence (positive delta). "
                "Partially Verified means the evidence supports part of the claim (small positive delta). "
                "Unsupported means the evidence contradicts or fails to support the claim (negative delta). "
                "Inconclusive means the evidence could not be evaluated (delta 0). "
                "The response must be valid JSON."
            )

            result = gl.eq_principle.prompt_non_comparative(
                lambda: context,
                task=task,
                criteria=criteria,
            )
            return str(result).replace("```json", "").replace("```", "").strip()

        raw = evaluate()
        data = self._load(raw) or {}

        status = str(data.get("status", "Inconclusive"))
        if status not in ("Verified", "Partially Verified", "Unsupported", "Inconclusive"):
            status = "Inconclusive"

        delta = self._to_int(data.get("gravity_delta", 0), 0)
        delta = max(-MAX_LOSS_PER_REVIEW, min(MAX_GAIN_PER_REVIEW, delta))
        if status == "Verified":
            delta = max(1, delta)
        elif status == "Partially Verified":
            delta = max(1, min(delta, MAX_GAIN_PER_REVIEW // 2))
        elif status == "Unsupported":
            delta = min(-1, delta)
        else:
            delta = 0

        confidence = max(0, min(100, self._to_int(data.get("confidence", 50), 50)))

        current_score = self._to_int(rep.get("gravity_score", INITIAL_GRAVITY_SCORE), INITIAL_GRAVITY_SCORE)
        new_score = max(MIN_GRAVITY_SCORE, min(MAX_GRAVITY_SCORE, current_score + delta))
        rep["gravity_score"] = new_score

        if status == "Verified":
            rep["verified"] = self._to_int(rep.get("verified", 0), 0) + 1
        elif status == "Partially Verified":
            rep["partially_verified"] = self._to_int(rep.get("partially_verified", 0), 0) + 1
        elif status == "Unsupported":
            rep["unsupported"] = self._to_int(rep.get("unsupported", 0), 0) + 1
        else:
            rep["inconclusive"] = self._to_int(rep.get("inconclusive", 0), 0) + 1
        self.reputation[owner] = self._json(rep)

        claim["status"] = status
        claim["reviewed"] = True
        self.claims[claim_id] = self._json(claim)

        assessment = {
            "claim_id": claim_id,
            "status": status,
            "gravity_delta": delta,
            "resulting_score": new_score,
            "credibility_level": credibility_level(new_score),
            "evidence_strength": str(data.get("evidence_strength", "Low")),
            "source_reliability": str(data.get("source_reliability", "Low")),
            "confidence": confidence,
            "historical_accuracy": self._historical_accuracy(rep),
            "contradiction_level": str(data.get("contradiction_level", "None")),
            "reasoning": self._limit(data.get("reasoning", ""), 800),
            "reviewed_at": reviewed_at,
        }
        self.assessments[claim_id] = self._json(assessment)

        return status

    # ------------------------------------------------------------------
    # Views
    # ------------------------------------------------------------------
    @gl.public.view
    def get_claim(self, claim_id: str) -> str:
        return self.claims.get(claim_id, "")

    @gl.public.view
    def get_claims(self, offset: u256, limit: u256) -> str:
        ids = self._split(self.claim_index.get("all", ""))
        ids.reverse()  # newest first
        start = int(offset)
        stop = start + int(limit)
        out = []
        for cid in ids[start:stop]:
            raw = self.claims.get(cid, "")
            if raw != "":
                out.append(self._load(raw))
        return self._json(out)

    @gl.public.view
    def get_claim_count(self) -> u256:
        return self.claim_counter

    @gl.public.view
    def get_claims_by_owner(self, owner: str) -> str:
        ids = self._split(self.owner_claims.get(owner.lower(), ""))
        out = []
        for cid in reversed(ids):
            raw = self.claims.get(cid, "")
            if raw != "":
                out.append(self._load(raw))
        return self._json(out)

    @gl.public.view
    def get_evidence(self, claim_id: str) -> str:
        raw = self.claim_evidence.get(claim_id, "")
        if raw == "":
            return self._json([])
        return raw

    @gl.public.view
    def get_assessment(self, claim_id: str) -> str:
        raw = self.assessments.get(claim_id, "")
        if raw == "":
            return self._json({})
        return raw

    @gl.public.view
    def get_reputation(self, owner: str) -> str:
        return self._json(self._reputation_view(owner.lower()))

    @gl.public.view
    def get_leaderboard(self) -> str:
        addresses = self._split(self.participants.get("all", ""))
        out = []
        for addr in addresses:
            out.append(self._reputation_view(addr))
        out.sort(key=lambda x: x["gravity_score"], reverse=True)
        return self._json(out)

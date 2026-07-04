"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, CredibilityBadge } from "@/components/badges";
import { TxStatus } from "@/components/tx-status";
import { useWallet, truncateAddress } from "@/hooks/useWallet";
import { useTransaction } from "@/hooks/useTransaction";
import {
  addEvidence,
  getAssessment,
  getClaim,
  getEvidence,
  requestReview,
} from "@/lib/genlayer/contract";
import { explorerAddressUrl } from "@/lib/genlayer/client";
import { sha256Hex } from "@/lib/hash";
import { EVIDENCE_TYPES, type Assessment, type Claim, type Evidence } from "@/types";

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const claimId = id;
  const { address } = useWallet();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [c, ev, a] = await Promise.all([
        getClaim(claimId),
        getEvidence(claimId),
        getAssessment(claimId),
      ]);
      setClaim(c);
      setEvidence(ev);
      setAssessment(a);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load claim");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3 bg-grafiti-violet/40" />
        <Skeleton className="h-40 w-full bg-grafiti-violet/40" />
        <Skeleton className="h-40 w-full bg-grafiti-violet/40" />
      </div>
    );
  }

  if (loadError || !claim) {
    return (
      <div className="panel mx-auto max-w-xl space-y-3 p-8 text-center">
        <h1 className="text-2xl">Claim unavailable</h1>
        <p className="ledger-row break-words opacity-70">
          {loadError ?? "Unknown claim"}
        </p>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Back to dashboard
        </Button>
      </div>
    );
  }

  const isOwner = address?.toLowerCase() === claim.owner.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ledger-row text-grafiti-orchid">CLAIM #{claim.id}</p>
          <h1 className="text-3xl">{claim.title}</h1>
          <p className="ledger-row mt-1 text-grafiti-mist/70">
            {claim.category} · by{" "}
            <Link
              href={`/profile/${claim.owner}`}
              className="underline underline-offset-2"
            >
              {truncateAddress(claim.owner)}
            </Link>{" "}
            ·{" "}
            <a
              href={explorerAddressUrl(claim.owner)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              explorer ↗
            </a>{" "}
            · {claim.created_at?.slice(0, 10)}
          </p>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      <Card className="bg-grafiti-mist text-grafiti-deep">
        <CardHeader>
          <CardTitle>Claim statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap text-sm">{claim.description}</p>
          <Separator />
          <p className="text-sm opacity-75">
            <strong>Claimant&apos;s evidence summary:</strong>{" "}
            {claim.evidence_summary}
          </p>
        </CardContent>
      </Card>

      <EvidenceSection
        claim={claim}
        evidence={evidence}
        canEdit={!claim.reviewed}
        onChanged={reload}
      />

      {assessment ? (
        <ConsensusPanel assessment={assessment} />
      ) : (
        <ReviewSection
          claim={claim}
          hasEvidence={evidence.length > 0}
          isOwner={isOwner}
          onReviewed={reload}
        />
      )}
    </div>
  );
}

function EvidenceSection({
  claim,
  evidence,
  canEdit,
  onChanged,
}: {
  claim: Claim;
  evidence: Evidence[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { address } = useWallet();
  const { state, run, reset } = useTransaction();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>(EVIDENCE_TYPES[0].value);
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [relevance, setRelevance] = useState("");
  const busy = state.phase === "signing" || state.phase === "pending";

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    const evidenceHash = await sha256Hex(`${url}|${title}|${source}`);
    const ok = await run(() =>
      addEvidence(address, {
        claimId: claim.id,
        title,
        kind,
        url,
        evidenceHash,
        source,
        relevance,
      }),
    );
    if (ok) {
      toast.success("Evidence registered on-chain.");
      setTitle("");
      setUrl("");
      setSource("");
      setRelevance("");
      setShowForm(false);
      reset();
      onChanged();
    }
  }

  return (
    <Card className="bg-grafiti-mist text-grafiti-deep">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Evidence ({evidence.length})</CardTitle>
          {canEdit && (
            <Button
              size="sm"
              variant={showForm ? "secondary" : "default"}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Cancel" : "Add evidence"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {evidence.length === 0 && (
          <p className="text-sm opacity-70">
            No evidence yet. A credibility review requires at least one public
            evidence reference.
          </p>
        )}
        {evidence.map((ev, i) => (
          <div key={i} className="rounded-md border border-grafiti-violet/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">{ev.title}</span>
              <span className="ledger-row opacity-60">
                {EVIDENCE_TYPES.find((t) => t.value === ev.kind)?.label ?? ev.kind}
              </span>
            </div>
            <a
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="ledger-row block truncate text-grafiti-violet underline underline-offset-2"
            >
              {ev.url}
            </a>
            <p className="mt-1 text-xs opacity-70">
              Source: {ev.source} · Relevance: {ev.relevance}
            </p>
            <p className="ledger-row mt-1 truncate opacity-50" title={ev.evidence_hash}>
              hash {ev.evidence_hash}
            </p>
          </div>
        ))}

        {showForm && canEdit && (
          <form onSubmit={onAdd} className="space-y-3 rounded-md border border-grafiti-violet/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-title">Title</Label>
                <Input id="ev-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={kind}
                  onValueChange={(v) => v !== null && setKind(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-url">Public URL</Label>
              <Input
                id="ev-url"
                required
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-source">Source</Label>
                <Input
                  id="ev-source"
                  required
                  placeholder="e.g. CertiK, Etherscan, Reuters"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-rel">Relevance</Label>
                <Input
                  id="ev-rel"
                  required
                  placeholder="What this proves"
                  value={relevance}
                  onChange={(e) => setRelevance(e.target.value)}
                />
              </div>
            </div>
            <TxStatus state={state} />
            <Button type="submit" disabled={busy || !address} className="w-full">
              {busy ? "Registering…" : "Register evidence on-chain"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewSection({
  claim,
  hasEvidence,
  isOwner,
  onReviewed,
}: {
  claim: Claim;
  hasEvidence: boolean;
  isOwner: boolean;
  onReviewed: () => void;
}) {
  const { address } = useWallet();
  const { state, run } = useTransaction();
  const busy = state.phase === "signing" || state.phase === "pending";

  async function onReview() {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    const ok = await run(() => requestReview(address, claim.id));
    if (ok) {
      toast.success("Consensus reached — reputation updated.");
      onReviewed();
    }
  }

  return (
    <Card className="border-grafiti-orchid/40 bg-grafiti-deep text-grafiti-pale">
      <CardHeader>
        <CardTitle>Credibility review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-grafiti-mist/80">
          Requesting a review triggers non-deterministic evaluation: GenLayer
          validators independently fetch the evidence URLs, assess evidence
          quality, consistency, source reliability, and contradictions, then
          converge on the most defensible assessment. The resulting Gravity
          Score change is permanent.
        </p>
        {!hasEvidence && (
          <p className="ledger-row text-amber-300">
            Add at least one evidence reference before requesting review.
          </p>
        )}
        <TxStatus state={state} />
        <Button
          onClick={onReview}
          disabled={busy || !hasEvidence || !address}
          className="w-full"
        >
          {busy
            ? "Validators deliberating…"
            : isOwner
              ? "Request credibility review"
              : "Trigger review (any wallet may request)"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-grafiti-mist p-3">
      <p className="ledger-row opacity-60">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ConsensusPanel({ assessment }: { assessment: Assessment }) {
  const delta = assessment.gravity_delta;
  return (
    <Card className="bg-grafiti-pale text-grafiti-deep">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Consensus assessment</CardTitle>
          <StatusBadge status={assessment.status} onLight />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="GRAVITY CHANGE"
            value={
              <span className={delta >= 0 ? "text-green-700" : "text-red-700"}>
                {delta >= 0 ? `+${delta}` : delta}
              </span>
            }
          />
          <Metric label="RESULTING SCORE" value={assessment.resulting_score} />
          <Metric
            label="CREDIBILITY LEVEL"
            value={<CredibilityBadge level={assessment.credibility_level} />}
          />
          <Metric label="CONFIDENCE" value={`${assessment.confidence}%`} />
          <Metric label="EVIDENCE STRENGTH" value={assessment.evidence_strength} />
          <Metric label="SOURCE RELIABILITY" value={assessment.source_reliability} />
          <Metric
            label="HISTORICAL ACCURACY"
            value={`${assessment.historical_accuracy}%`}
          />
          <Metric label="CONTRADICTIONS" value={assessment.contradiction_level} />
        </div>
        <Separator />
        <div>
          <p className="ledger-row opacity-60">CONSENSUS REASONING</p>
          <p className="mt-1 text-sm">{assessment.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
}

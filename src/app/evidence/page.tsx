"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { truncateAddress } from "@/hooks/useWallet";
import { getClaims, getEvidence } from "@/lib/genlayer/contract";
import { isContractConfigured } from "@/lib/genlayer/client";
import { EVIDENCE_TYPES, type Evidence } from "@/types";

/** Evidence registry: all structured evidence references across recent claims. */
export default function EvidenceRegistryPage() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isContractConfigured()) {
      Promise.resolve().then(() => {
        setError("Contract address not configured — see Settings.");
        setLoading(false);
      });
      return;
    }
    (async () => {
      try {
        const claims = await getClaims(0, 25);
        const lists = await Promise.all(claims.map((c) => getEvidence(c.id)));
        setItems(lists.flat());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Evidence registry</h1>
        <p className="mt-1 text-sm text-grafiti-mist/70">
          Structured public evidence references and content hashes recorded
          on-chain. No files are ever uploaded — only traceable pointers.
        </p>
      </div>

      {error && (
        <p className="ledger-row rounded-md border border-destructive/50 bg-destructive/10 p-3 text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <Skeleton className="h-64 w-full bg-grafiti-violet/40" />
      ) : items.length === 0 && !error ? (
        <p className="text-sm text-grafiti-mist/70">
          No evidence registered yet.
        </p>
      ) : (
        <div className="panel divide-y divide-grafiti-mist overflow-hidden">
          {items.map((ev, i) => (
            <div key={i} className="space-y-1 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/claims/${ev.claim_id}`}
                  className="ledger-row text-grafiti-violet underline underline-offset-2"
                >
                  claim #{ev.claim_id}
                </Link>
                <span className="text-sm font-semibold">{ev.title}</span>
                <span className="ledger-row ml-auto opacity-60">
                  {EVIDENCE_TYPES.find((t) => t.value === ev.kind)?.label ?? ev.kind}
                </span>
              </div>
              <a
                href={ev.url}
                target="_blank"
                rel="noreferrer"
                className="ledger-row block truncate underline underline-offset-2 opacity-80"
              >
                {ev.url}
              </a>
              <p className="ledger-row opacity-50">
                source {ev.source} · by {truncateAddress(ev.submitter)} ·{" "}
                {ev.submitted_at?.slice(0, 10)}
              </p>
              <p className="ledger-row truncate opacity-40" title={ev.evidence_hash}>
                {ev.evidence_hash}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

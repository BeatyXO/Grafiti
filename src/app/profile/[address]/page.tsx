"use client";

import { use, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GravityGauge } from "@/components/gravity-gauge";
import { ClaimCard } from "@/components/claim-card";
import { getClaimsByOwner, getReputation } from "@/lib/genlayer/contract";
import { explorerAddressUrl } from "@/lib/genlayer/client";
import type { Claim, Reputation } from "@/types";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getReputation(address), getClaimsByOwner(address)])
      .then(([r, c]) => {
        setRep(r);
        setClaims(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="space-y-8">
      <div>
        <p className="ledger-row text-grafiti-orchid">PUBLIC PROFILE</p>
        <h1 className="break-all font-mono text-xl sm:text-2xl">{address}</h1>
        <a
          href={explorerAddressUrl(address)}
          target="_blank"
          rel="noreferrer"
          className="ledger-row text-grafiti-mist/70 underline underline-offset-2"
        >
          view on GenLayer explorer ↗
        </a>
      </div>

      {error && (
        <p className="ledger-row rounded-md border border-destructive/50 bg-destructive/10 p-3 text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <Skeleton className="h-56 w-full bg-grafiti-violet/40" />
      ) : (
        rep && (
          <div className="panel grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
            <GravityGauge score={rep.gravity_score} level={rep.credibility_level} />
            <div className="grid content-center gap-3 sm:grid-cols-2">
              <p className="ledger-row rounded-md bg-grafiti-mist p-3">
                accuracy {rep.historical_accuracy}%
              </p>
              <p className="ledger-row rounded-md bg-grafiti-mist p-3">
                claims {rep.total_claims}
              </p>
              <p className="ledger-row rounded-md bg-grafiti-mist p-3">
                verified {rep.verified} · partial {rep.partially_verified}
              </p>
              <p className="ledger-row rounded-md bg-grafiti-mist p-3">
                unsupported {rep.unsupported} · inconclusive {rep.inconclusive}
              </p>
            </div>
          </div>
        )
      )}

      <section className="space-y-4">
        <h2 className="text-xl">Claim history ({claims.length})</h2>
        {!loading && claims.length === 0 && (
          <p className="text-sm text-grafiti-mist/70">
            This wallet has no on-chain claims yet.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {claims.map((c) => (
            <ClaimCard key={c.id} claim={c} />
          ))}
        </div>
      </section>
    </div>
  );
}

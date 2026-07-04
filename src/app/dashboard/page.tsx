"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GravityGauge } from "@/components/gravity-gauge";
import { ClaimCard } from "@/components/claim-card";
import { useWallet } from "@/hooks/useWallet";
import { getClaimsByOwner, getReputation } from "@/lib/genlayer/contract";
import { isContractConfigured } from "@/lib/genlayer/client";
import type { Claim, Reputation } from "@/types";

export default function DashboardPage() {
  const { address } = useWallet();
  const [rep, setRep] = useState<Reputation | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isContractConfigured()) return;
    setLoading(true);
    Promise.all([getReputation(address), getClaimsByOwner(address)])
      .then(([r, c]) => {
        setRep(r);
        setClaims(c);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <EmptyPanel
        title="Reputation dashboard"
        body="Connect your wallet to view your Gravity Score, credibility level, and claim history."
      />
    );
  }
  if (!isContractConfigured()) {
    return (
      <EmptyPanel
        title="Contract not configured"
        body="Set NEXT_PUBLIC_CONTRACT_ADDRESS to your deployed Grafiti contract. See Settings for instructions."
        action={
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link href="/settings" />}
          >
            Open Settings
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Reputation dashboard</h1>

      {error && (
        <p className="ledger-row rounded-md border border-destructive/50 bg-destructive/10 p-3 text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-48 bg-grafiti-violet/40" />
          <Skeleton className="h-48 bg-grafiti-violet/40 sm:col-span-2" />
        </div>
      ) : (
        rep && (
          <div className="panel grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
            <GravityGauge score={rep.gravity_score} level={rep.credibility_level} />
            <div className="grid content-center gap-3 sm:grid-cols-2">
              <Stat label="HISTORICAL ACCURACY" value={`${rep.historical_accuracy}%`} />
              <Stat label="TOTAL CLAIMS" value={rep.total_claims} />
              <Stat label="VERIFIED" value={rep.verified} />
              <Stat label="PARTIALLY VERIFIED" value={rep.partially_verified} />
              <Stat label="UNSUPPORTED" value={rep.unsupported} />
              <Stat label="INCONCLUSIVE" value={rep.inconclusive} />
            </div>
          </div>
        )
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Your claims</h2>
          <Button size="sm" nativeButton={false} render={<Link href="/submit" />}>
            New claim
          </Button>
        </div>
        {!loading && claims.length === 0 && (
          <p className="text-sm text-grafiti-mist/70">
            No claims yet. Reputation is built one evidence-backed claim at a
            time.
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

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-grafiti-mist p-3 text-grafiti-deep">
      <p className="ledger-row opacity-60">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel mx-auto max-w-xl space-y-4 p-10 text-center">
      <h1 className="text-2xl">{title}</h1>
      <p className="text-sm opacity-75">{body}</p>
      {action}
    </div>
  );
}

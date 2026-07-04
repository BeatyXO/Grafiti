"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CredibilityBadge } from "@/components/badges";
import { ClaimCard } from "@/components/claim-card";
import { truncateAddress } from "@/hooks/useWallet";
import { getClaims, getLeaderboard } from "@/lib/genlayer/contract";
import { isContractConfigured } from "@/lib/genlayer/client";
import type { Claim, LeaderboardEntry } from "@/types";

export default function ExplorerPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
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
    Promise.all([getLeaderboard(), getClaims(0, 50)])
      .then(([l, c]) => {
        setLeaders(l);
        setClaims(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Public credibility explorer</h1>
        <p className="mt-1 text-sm text-grafiti-mist/70">
          Every Gravity Score and claim on Grafiti is public, permanent, and
          produced by consensus.
        </p>
      </div>

      {error && (
        <p className="ledger-row rounded-md border border-destructive/50 bg-destructive/10 p-3 text-red-200">
          {error}
        </p>
      )}

      <Tabs defaultValue="reputation">
        <TabsList>
          <TabsTrigger value="reputation">Reputation ranking</TabsTrigger>
          <TabsTrigger value="claims">Recent claims</TabsTrigger>
        </TabsList>

        <TabsContent value="reputation" className="mt-4">
          {loading ? (
            <Skeleton className="h-64 w-full bg-grafiti-violet/40" />
          ) : leaders.length === 0 ? (
            <p className="text-sm text-grafiti-mist/70">
              No reputation records yet.
            </p>
          ) : (
            <div className="panel divide-y divide-grafiti-mist overflow-hidden">
              {leaders.map((entry, i) => (
                <Link
                  key={entry.address}
                  href={`/profile/${entry.address}`}
                  className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-grafiti-mist"
                >
                  <span className="ledger-row w-8 opacity-50">#{i + 1}</span>
                  <span className="font-mono text-sm">
                    {truncateAddress(entry.address)}
                  </span>
                  <CredibilityBadge level={entry.credibility_level} />
                  <span className="ml-auto flex items-center gap-4">
                    <span className="ledger-row opacity-60">
                      {entry.verified}/{entry.total_claims} verified ·{" "}
                      {entry.historical_accuracy}% accuracy
                    </span>
                    <span className="font-mono text-lg font-bold text-grafiti-violet">
                      {entry.gravity_score}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          {loading ? (
            <Skeleton className="h-64 w-full bg-grafiti-violet/40" />
          ) : claims.length === 0 ? (
            <p className="text-sm text-grafiti-mist/70">No claims yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {claims.map((c) => (
                <ClaimCard key={c.id} claim={c} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/badges";
import { truncateAddress } from "@/hooks/useWallet";
import type { Claim } from "@/types";

export function ClaimCard({ claim }: { claim: Claim }) {
  return (
    <Link href={`/claims/${claim.id}`} className="block transition hover:-translate-y-0.5">
      <Card className="bg-grafiti-mist text-grafiti-deep">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{claim.title}</CardTitle>
            <StatusBadge status={claim.status} onLight />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="line-clamp-2 text-sm opacity-80">{claim.description}</p>
          <div className="ledger-row flex flex-wrap gap-x-4 gap-y-1 opacity-70">
            <span>#{claim.id}</span>
            <span>{claim.category}</span>
            <span>{truncateAddress(claim.owner)}</span>
            <span>{claim.created_at?.slice(0, 10)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

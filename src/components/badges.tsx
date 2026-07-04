import { Badge } from "@/components/ui/badge";
import type { ClaimStatus, CredibilityLevel } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ClaimStatus, string> = {
  Pending: "bg-grafiti-orchid/20 text-grafiti-mist border-grafiti-orchid/50",
  "Under Review": "bg-amber-400/15 text-amber-200 border-amber-400/40",
  Verified: "bg-green-400/15 text-green-200 border-green-400/40",
  "Partially Verified": "bg-lime-400/15 text-lime-200 border-lime-400/40",
  Unsupported: "bg-red-400/15 text-red-200 border-red-400/40",
  Inconclusive: "bg-slate-400/15 text-slate-200 border-slate-400/40",
};

export function StatusBadge({
  status,
  onLight = false,
}: {
  status: ClaimStatus;
  onLight?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        STATUS_STYLES[status] ?? STATUS_STYLES.Pending,
        onLight && "brightness-50 saturate-150",
      )}
    >
      {status}
    </Badge>
  );
}

const LEVEL_STYLES: Record<CredibilityLevel, string> = {
  Authority: "bg-grafiti-orchid text-grafiti-deep border-transparent",
  Trusted: "bg-grafiti-orchid/70 text-grafiti-deep border-transparent",
  Reliable: "bg-grafiti-orchid/40 text-grafiti-pale border-transparent",
  Neutral: "bg-grafiti-violet/50 text-grafiti-pale border-grafiti-orchid/40",
  Untrusted: "bg-red-400/20 text-red-200 border-red-400/40",
};

export function CredibilityBadge({ level }: { level: CredibilityLevel }) {
  return (
    <Badge variant="outline" className={LEVEL_STYLES[level] ?? LEVEL_STYLES.Neutral}>
      {level}
    </Badge>
  );
}

"use client";

import type { TxState } from "@/types";
import { explorerTxUrl } from "@/lib/genlayer/client";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  signing: "Waiting for wallet signature…",
  pending: "Transaction submitted — awaiting GenLayer consensus…",
  confirmed: "Transaction accepted by consensus.",
  error: "Transaction failed.",
};

export function TxStatus({ state }: { state: TxState }) {
  if (state.phase === "idle") return null;

  const hash = "hash" in state ? state.hash : undefined;

  return (
    <div
      className={cn(
        "ledger-row rounded-md border p-3",
        state.phase === "confirmed" &&
          "border-green-400/50 bg-green-400/10 text-green-200",
        state.phase === "error" &&
          "border-destructive/60 bg-destructive/10 text-red-200",
        (state.phase === "signing" || state.phase === "pending") &&
          "border-grafiti-orchid/60 bg-grafiti-orchid/10 text-grafiti-mist",
      )}
      role="status"
    >
      <div className="flex items-center gap-2">
        {(state.phase === "signing" || state.phase === "pending") && (
          <span className="inline-block size-2 animate-pulse rounded-full bg-grafiti-orchid" />
        )}
        <span>{LABELS[state.phase]}</span>
      </div>
      {state.phase === "error" && (
        <p className="mt-1 break-words opacity-80">{state.message}</p>
      )}
      {hash && (
        <a
          href={explorerTxUrl(hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          {hash}
        </a>
      )}
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import type { TxState } from "@/types";
import { waitForTx, type WriteResult } from "@/lib/genlayer/contract";

/**
 * Wraps a contract write with the full transaction lifecycle:
 * signing -> pending (hash known) -> confirmed | error.
 */
export function useTransaction() {
  const [state, setState] = useState<TxState>({ phase: "idle" });

  const run = useCallback(
    async (action: () => Promise<WriteResult>): Promise<boolean> => {
      setState({ phase: "signing" });
      let hash: string | undefined;
      try {
        const result = await action();
        hash = result.hash;
        setState({ phase: "pending", hash });
        await waitForTx(hash);
        setState({ phase: "confirmed", hash });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transaction failed";
        setState({ phase: "error", message, hash });
        return false;
      }
    },
    [],
  );

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, run, reset };
}

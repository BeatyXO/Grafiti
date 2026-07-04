"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TxStatus } from "@/components/tx-status";
import { useWallet } from "@/hooks/useWallet";
import { useTransaction } from "@/hooks/useTransaction";
import { getClaimCount, submitClaim } from "@/lib/genlayer/contract";
import { isContractConfigured } from "@/lib/genlayer/client";
import { CLAIM_CATEGORIES } from "@/types";

export default function SubmitClaimPage() {
  const { address } = useWallet();
  const { state, run } = useTransaction();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CLAIM_CATEGORIES[0]);
  const [summary, setSummary] = useState("");
  const busy = state.phase === "signing" || state.phase === "pending";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!isContractConfigured()) {
      toast.error(
        "Contract address not configured — see the Settings page.",
      );
      return;
    }
    const ok = await run(() =>
      submitClaim(address, {
        title,
        description,
        category,
        evidenceSummary: summary,
      }),
    );
    if (ok) {
      toast.success("Claim recorded on-chain. Now attach evidence.");
      try {
        const count = await getClaimCount();
        router.push(`/claims/${Number(count)}`);
      } catch {
        router.push("/dashboard");
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl">Submit a public claim</h1>
        <p className="mt-1 text-sm text-grafiti-mist/70">
          Your claim becomes a permanent on-chain record tied to your wallet.
          After submitting, you&apos;ll attach public evidence and request a
          credibility review.
        </p>
      </div>

      <Card className="bg-grafiti-pale text-grafiti-deep">
        <CardHeader>
          <CardTitle>Claim details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Claim title</Label>
              <Input
                id="title"
                required
                maxLength={120}
                placeholder="e.g. Protocol X completed a CertiK audit in June 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Claim description</Label>
              <Textarea
                id="description"
                required
                rows={4}
                maxLength={2000}
                placeholder="State the claim precisely. Vague or exaggerated claims score poorly under consensus review."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => v !== null && setCategory(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="summary">Supporting evidence summary</Label>
              <Textarea
                id="summary"
                required
                rows={3}
                maxLength={1000}
                placeholder="Briefly describe the public evidence you will attach (URLs are added in the next step)."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <TxStatus state={state} />
            <Button type="submit" className="w-full" disabled={busy || !address}>
              {!address
                ? "Connect wallet to submit"
                : busy
                  ? "Submitting…"
                  : "Submit claim on-chain"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

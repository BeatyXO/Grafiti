"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/useWallet";
import {
  CHAIN,
  CONTRACT_ADDRESS,
  explorerAddressUrl,
  getReadClient,
  isContractConfigured,
} from "@/lib/genlayer/client";

export default function SettingsPage() {
  const { address, hasProvider, disconnect } = useWallet();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl">Settings</h1>

      <Card className="bg-grafiti-mist text-grafiti-deep">
        <CardHeader>
          <CardTitle>Network</CardTitle>
        </CardHeader>
        <CardContent className="ledger-row space-y-1">
          <p>chain: {CHAIN.name} (id {CHAIN.id})</p>
          <p>rpc: {CHAIN.rpcUrls.default.http[0]}</p>
          <p>
            currency: {CHAIN.nativeCurrency.symbol} (
            {CHAIN.nativeCurrency.name})
          </p>
          <p className="break-all">
            contract:{" "}
            {isContractConfigured() ? CONTRACT_ADDRESS : "NOT CONFIGURED"}
          </p>
          {!isContractConfigured() && (
            <p className="mt-2 font-sans text-xs opacity-75">
              Deploy contracts/grafiti.py via GenLayer Studio, then set
              NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local (or Vercel project
              settings) and rebuild.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-grafiti-mist text-grafiti-deep">
        <CardHeader>
          <CardTitle>Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="ledger-row break-all">
            {address ? address : "not connected"}
          </p>
          {!hasProvider && (
            <p className="text-xs opacity-75">
              No injected wallet detected. Install MetaMask, Rainbow, or
              Zerion.
            </p>
          )}
          {address && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                nativeButton={false}
                render={
                  <a
                    href={explorerAddressUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                View on explorer
              </Button>
              <Button size="sm" variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ContractPanel />
    </div>
  );
}

/** Raw contract interaction panel for read methods. */
function ContractPanel() {
  const [method, setMethod] = useState("get_claim_count");
  const [args, setArgs] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call() {
    setBusy(true);
    setOutput(null);
    try {
      const parsed = args.trim()
        ? args.split(",").map((a) => {
            const t = a.trim();
            return /^-?\d+$/.test(t) ? Number(t) : t;
          })
        : [];
      const client = getReadClient();
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args: parsed as never[],
        jsonSafeReturn: true,
      });
      setOutput(JSON.stringify(result, null, 2));
    } catch (e) {
      setOutput(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-grafiti-mist text-grafiti-deep">
      <CardHeader>
        <CardTitle>Contract interaction panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="method">View method</Label>
            <Input
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="get_claim_count"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="args">Arguments (comma-separated)</Label>
            <Input
              id="args"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g. 1"
            />
          </div>
        </div>
        <Button onClick={call} disabled={busy || !isContractConfigured()}>
          {busy ? "Calling…" : "Call view method"}
        </Button>
        {output && (
          <pre className="ledger-row max-h-64 overflow-auto rounded-md bg-grafiti-deep p-3 text-grafiti-pale">
            {output}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { truncateAddress, useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";

export function WalletButton() {
  const { address, connecting, connect, disconnect } = useWallet();
  const [hover, setHover] = useState(false);

  if (address) {
    return (
      <Button
        variant="secondary"
        className="font-mono"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={disconnect}
        title="Disconnect wallet"
      >
        {hover ? "Disconnect" : truncateAddress(address)}
      </Button>
    );
  }

  return (
    <Button
      onClick={() =>
        connect().catch((e) =>
          toast.error(e instanceof Error ? e.message : "Failed to connect"),
        )
      }
      disabled={connecting}
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}

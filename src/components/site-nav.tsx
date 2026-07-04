"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/submit", label: "Submit Claim" },
  { href: "/explorer", label: "Explorer" },
  { href: "/evidence", label: "Evidence" },
  { href: "/settings", label: "Settings" },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-grafiti-orchid/30 bg-grafiti-deep/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-display text-xl tracking-wide text-grafiti-pale">
          GRAFITI
          <span className="ml-2 hidden text-xs font-normal text-grafiti-orchid sm:inline">
            reputation protocol
          </span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-grafiti-mist/80 transition hover:bg-grafiti-violet/50 hover:text-grafiti-pale",
                pathname?.startsWith(l.href) &&
                  "bg-grafiti-violet text-grafiti-pale",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}

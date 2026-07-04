import type { Metadata } from "next";
import { Geist_Mono, Shantell_Sans, Comic_Neue } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/hooks/useWallet";
import { SiteNav } from "@/components/site-nav";
import { Toaster } from "@/components/ui/sonner";

const shantell = Shantell_Sans({
  variable: "--font-shantell",
  subsets: ["latin"],
});

const comic = Comic_Neue({
  variable: "--font-comic",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grafiti — Decentralized Reputation and Credibility Consensus",
  description:
    "Grafiti transforms public claims into long-term credibility through GenLayer AI consensus. Gravity Scores are earned through evidence-backed accuracy, not popularity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${shantell.variable} ${comic.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletProvider>
          <SiteNav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-grafiti-orchid/30 py-6 text-center text-xs text-grafiti-mist/60">
            Grafiti Protocol — credibility earned through evidence, secured by
            GenLayer consensus on StudioNet.
          </footer>
          <Toaster />
        </WalletProvider>
      </body>
    </html>
  );
}

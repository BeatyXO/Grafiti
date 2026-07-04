import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    title: "1 · Make a public claim",
    body: "Product launches, metrics, audits, research, predictions — anything publicly verifiable, tied to your wallet forever.",
  },
  {
    title: "2 · Attach public evidence",
    body: "Websites, explorers, GitHub, audit reports, dashboards. Only structured references and hashes go on-chain — no uploads.",
  },
  {
    title: "3 · Request credibility review",
    body: "GenLayer validators independently fetch your evidence and evaluate the claim with AI. Disagreement is expected — and resolved.",
  },
  {
    title: "4 · Gravity shifts",
    body: "Consensus produces the most defensible assessment. Accurate claims raise your Gravity Score; exaggeration erodes it.",
  },
];

const QUESTIONS = [
  "Can this person's claims be trusted?",
  "How accurate have they been historically?",
  "Did this claim match available evidence?",
  "Is their credibility increasing or decreasing?",
];

export default function LandingPage() {
  return (
    <div className="space-y-16">
      <section className="space-y-6 pt-10 text-center">
        <p className="ledger-row text-grafiti-orchid">
          DECENTRALIZED REPUTATION · GENLAYER CONSENSUS · STUDIONET
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl leading-tight text-grafiti-pale sm:text-5xl">
          Credibility is earned, not claimed.
        </h1>
        <p className="mx-auto max-w-2xl text-grafiti-mist/80">
          Grafiti is a decentralized reputation protocol where every public
          claim is judged against public evidence by AI validator consensus.
          Consistent accuracy builds your <strong>Gravity Score</strong>.
          Exaggeration pulls it down.
        </p>
        <div className="flex justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/submit" />}>
            Submit a claim
          </Button>
          <Button
            size="lg"
            variant="secondary"
            nativeButton={false}
            render={<Link href="/explorer" />}
          >
            Explore reputations
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <Card key={s.title} className="bg-grafiti-mist text-grafiti-deep">
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm opacity-80">{s.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="panel mx-auto max-w-3xl space-y-4 p-8">
        <h2 className="text-2xl">Grafiti answers</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {QUESTIONS.map((q) => (
            <li key={q} className="ledger-row rounded-md bg-grafiti-mist p-3">
              {q}
            </li>
          ))}
        </ul>
        <p className="text-sm opacity-70">
          Every assessment — status, score delta, evidence strength,
          confidence, and reasoning — is an immutable on-chain record produced
          by non-deterministic AI consensus. Uncertainty is preserved; the most
          defensible conclusion wins.
        </p>
      </section>
    </div>
  );
}

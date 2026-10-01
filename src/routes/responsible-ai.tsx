import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, AlertTriangle, SearchCheck, Scale, Lock, BookOpenCheck, UserCheck } from "lucide-react";
import { DISCLAIMER, PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI · AI Workplace Assistant" },
      { name: "description", content: "Limitations of AI, verification, bias, privacy and human oversight in this assistant." },
      { property: "og:title", content: "Responsible AI" },
      { property: "og:description", content: "How to use AI outputs safely and responsibly at work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const POINTS = [
  { icon: AlertTriangle, t: "AI can make mistakes", d: "Outputs can be inaccurate, outdated or incomplete, even when they sound confident." },
  { icon: BookOpenCheck, t: "Review before professional use", d: "Read and edit AI-generated content before sending, publishing or acting on it." },
  { icon: SearchCheck, t: "Verify important facts", d: "Check figures, names, dates and claims — and check research against the original sources." },
  { icon: Scale, t: "Watch for bias", d: "AI may reflect biases in its training data or sources. Consider other perspectives." },
  { icon: Lock, t: "Protect confidential information", d: "Don't enter sensitive or confidential workplace data unless you're authorised to do so." },
  { icon: UserCheck, t: "Humans stay in charge", d: "AI supports your decision-making; it doesn't replace human judgement or accountability." },
];

const SAFEGUARDS = [
  "Every AI output is labelled “AI-generated”.",
  "Prompts instruct the AI not to invent names, dates, figures or citations, and to mark missing details.",
  "Research citations are checked server-side — references to non-existent sources are removed, and uncited claims are flagged “unverified”.",
  "Retrieved information and AI analysis are visually separated in research results.",
  "If live research isn't configured, the app says so instead of answering from memory.",
  "Inputs are validated and size-limited; requests are rate-limited; private URLs are blocked.",
  "API keys and system prompts stay on the server and are never sent to your browser.",
  "The chatbot always identifies itself as an AI, never as a human.",
];

function Page() {
  return (
    <>
      <PageHeader icon={ShieldCheck} title="Responsible AI" subtitle="This assistant is designed to help — not to replace your judgement." />
      <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-5 text-sm text-foreground/90">{DISCLAIMER}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p.t} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p.icon className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 font-semibold text-foreground">{p.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
          </div>
        ))}
      </div>
      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground">Built-in safeguards</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SAFEGUARDS.map((s) => (
            <li key={s} className="flex gap-2 text-sm text-foreground/90"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{s}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

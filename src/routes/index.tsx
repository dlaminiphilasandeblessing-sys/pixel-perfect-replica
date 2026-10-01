import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · AI Workplace Productivity Assistant" },
      { name: "description", content: "Your intelligent assistant for smarter, faster workplace productivity — emails, meetings, plans, research and chat." },
      { property: "og:title", content: "AI Workplace Productivity Assistant" },
      { property: "og:description", content: "Your intelligent assistant for smarter, faster workplace productivity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { stats, history } = useSession();
  const hydrated = useHydrated();
  const toolTitle = Object.fromEntries(TOOLS.map((t) => [t.stat, t]));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card bg-glow p-6 shadow-card sm:p-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" aria-hidden /> Free to use · no registration
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold text-foreground sm:text-4xl">AI Workplace Productivity Assistant</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Your intelligent assistant for smarter, faster workplace productivity.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/email">
              Write an email <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/chat">Ask the assistant</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="stats-h">
        <h2 id="stats-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">This session</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOOLS.map((t) => (
            <div key={t.stat} className="rounded-xl border border-border bg-surface p-4">
              <t.icon className="size-4 text-primary" aria-hidden />
              <p className="mt-3 font-display text-2xl font-semibold text-foreground">{hydrated ? stats[t.stat] : 0}</p>
              <p className="text-xs text-muted-foreground">{t.statLabel}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="tools-h">
        <h2 id="tools-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <article key={t.to} className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40">
              <div className="grid size-10 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <t.icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{t.title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{t.desc}</p>
              <Button asChild variant="secondary" className="mt-5 w-fit">
                <Link to={t.to}>
                  Open Tool <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </article>
          ))}
          <article className="flex flex-col rounded-xl border border-dashed border-border p-5">
            <ShieldCheck className="size-5 text-success" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Use AI responsibly</h3>
            <p className="mt-1.5 flex-1 text-sm text-muted-foreground">AI can make mistakes. Review outputs and verify important facts before you rely on them.</p>
            <Link to="/responsible-ai" className="mt-5 text-sm font-medium text-primary hover:underline">Read the guidance →</Link>
          </article>
        </div>
      </section>

      <section aria-labelledby="recent-h">
        <h2 id="recent-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</h2>
        <div className="rounded-xl border border-border bg-card">
          {!hydrated || history.length === 0 ? (
            <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Clock className="size-4" aria-hidden /> No activity yet. Open a tool to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => {
                const t = toolTitle[h.tool];
                return (
                  <li key={h.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    {t && <t.icon className="size-4 shrink-0 text-primary" aria-hidden />}
                    <span className="truncate text-foreground">{h.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(h.at, { addSuffix: true })}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

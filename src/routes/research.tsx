import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Wand2, RotateCcw, Download, Globe, Bot, AlertCircle, ExternalLink, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { researchStatus, runResearch, type ResearchResult, type CitedItem } from "@/lib/ai.functions";
import { recordUsage, downloadText } from "@/lib/session";
import { AIBadge, CopyButton, Disclaimer, EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, callTool } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant · AI Workplace Assistant" },
      { name: "description", content: "Research topics using external search sources with cited findings and clearly labelled AI analysis." },
      { property: "og:title", content: "AI Research Assistant" },
      { property: "og:description", content: "Cited research findings from external sources, plus AI insights and recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResearchPage,
});

type Depth = "quick" | "standard" | "detailed";

function ResearchPage() {
  const run = useServerFn(runResearch);
  const status = useServerFn(researchStatus);
  const [avail, setAvail] = useState<{ available: boolean; provider: string | null } | null>(null);
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [sourceType, setSourceType] = useState("Any reputable sources");
  const [urls, setUrls] = useState("");
  const [instructions, setInstructions] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [thread, setThread] = useState<{ q: string; r: ResearchResult }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastArgs, setLastArgs] = useState<{ q: string; prev?: string } | null>(null);

  useEffect(() => {
    status().then(setAvail).catch(() => setAvail({ available: false, provider: null }));
  }, [status]);

  async function go(q: string, prev?: string) {
    if (q.trim().length < 5) return toast.error("Please enter a research question.");
    const urlList = urls.split(/\s+/).map((u) => u.trim()).filter(Boolean);
    const bad = urlList.filter((u) => { try { const x = new URL(u); return !/^https?:$/.test(x.protocol); } catch { return true; } });
    if (bad.length) return toast.error(`Invalid URL: ${bad[0]}`);
    if (urlList.length > 5) return toast.error("Please add at most 5 URLs.");
    setLastArgs({ q, prev });
    setLoading(true);
    setError(null);
    const r = await callTool(() => run({ data: { question: q, depth, sourceType, urls: prev ? [] : urlList, instructions, previousSummary: prev } }));
    setLoading(false);
    if (r.error) return setError(r.error);
    setThread((t) => (prev ? [...t, { q, r: r.data! }] : [{ q, r: r.data! }]));
    setFollowUp("");
    recordUsage("research", `Research: ${q}`);
    if (r.data!.skippedUrls.length) toast.warning(`Skipped ${r.data!.skippedUrls.length} URL(s) that aren't allowed.`);
    toast.success("Research complete");
  }

  const toText = () =>
    thread
      .map(({ q, r }) => {
        const c = (items: CitedItem[]) => items.map((i) => `- ${i.text}${i.sources.length ? ` [${i.sources.join(", ")}]` : " [unverified]"}`).join("\n") || "- None";
        const l = (items: string[]) => items.map((i) => `- ${i}`).join("\n") || "- None";
        return `QUESTION: ${q}\n\nSUMMARY\n${r.summary}\n\nKEY FINDINGS (from sources)\n${c(r.findings)}\n\nIMPORTANT FACTS (from sources)\n${c(r.facts)}\n\nKEY INSIGHTS (AI analysis)\n${l(r.insights)}\n\nPERSPECTIVES\n${l(r.perspectives)}\n\nRECOMMENDATIONS (AI analysis)\n${l(r.recommendations)}\n\nLIMITATIONS\n${l(r.limitations)}\n\nSOURCES USED (via ${r.provider})\n${r.sources.map((s) => `[${s.id}] ${s.title} — ${s.url}`).join("\n")}`;
      })
      .join("\n\n==========\n\n") + "\n\n— AI-generated research. Verify claims against the original sources.";

  return (
    <>
      <PageHeader icon={Search} title="AI Research Assistant" subtitle="Searches authorised external sources, then summarises with citations. Retrieved information and AI analysis are clearly separated." />

      {avail && !avail.available && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Live external research is currently unavailable</p>
            <p className="mt-1 text-muted-foreground">No search provider is configured on the server, so no live research can be performed. The assistant will not pretend to research from memory. Ask an administrator to connect a search provider.</p>
          </div>
        </div>
      )}
      {avail?.available && (
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" aria-hidden /> Live research connected via {avail.provider}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <Panel title="Research request" className="h-fit">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); go(question); }}>
            <Field label="Topic or question *" htmlFor="q">
              <Textarea id="q" rows={3} maxLength={1000} placeholder="e.g. What are the current best practices for hybrid work policies in 2026?" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </Field>
            <Field label="Research depth" htmlFor="depth">
              <div id="depth" role="radiogroup" className="grid grid-cols-3 gap-2">
                {([["quick", "Quick"], ["standard", "Standard"], ["detailed", "Detailed"]] as const).map(([v, l]) => (
                  <button type="button" role="radio" aria-checked={depth === v} key={v} onClick={() => setDepth(v)} className={cn("rounded-md border px-2 py-2 text-xs sm:text-sm", depth === v ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground")}>{l}</button>
                ))}
              </div>
            </Field>
            <Field label="Preferred source type" htmlFor="src">
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger id="src"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Any reputable sources", "Academic & research", "News & current affairs", "Government & official", "Industry & business reports", "Technical documentation"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Specific URLs (optional)" htmlFor="urls" hint="Up to 5 public http(s) links, one per line.">
              <Textarea id="urls" rows={2} placeholder="https://example.com/article" value={urls} onChange={(e) => setUrls(e.target.value)} />
            </Field>
            <Field label="Research instructions (optional)" htmlFor="ins">
              <Input id="ins" maxLength={2000} placeholder="e.g. Focus on South Africa; compare costs" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading || avail?.available === false}><Wand2 /> Start research</Button>
              <Button type="button" variant="ghost" onClick={() => { setQuestion(""); setUrls(""); setInstructions(""); setThread([]); setError(null); }}><RotateCcw /> Clear</Button>
            </div>
          </form>
        </Panel>

        <div className="space-y-6">
          {thread.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <CopyButton text={toText()} label="Copy research" />
              <Button variant="outline" size="sm" onClick={() => downloadText("research.txt", toText())}><Download /> Export</Button>
              <Button variant="outline" size="sm" disabled={loading} onClick={() => { const first = thread[0].q; setThread([]); go(first); }}><RotateCcw /> Regenerate</Button>
            </div>
          )}
          {thread.map(({ q, r }, i) => <ResearchCard key={i} q={q} r={r} followUp={i > 0} />)}

          {loading ? (
            <Panel><LoadingState message="Researching authorized sources…" /></Panel>
          ) : error ? (
            <Panel><ErrorState message={error} onRetry={lastArgs ? () => go(lastArgs.q, lastArgs.prev) : undefined} /></Panel>
          ) : thread.length === 0 ? (
            <Panel><EmptyState icon={Globe} title="No research yet" text="Ask a question to search external sources and get a cited summary." /></Panel>
          ) : null}

          {thread.length > 0 && !loading && (
            <Panel title="Continue researching">
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const last = thread[thread.length - 1]; go(followUp, `${last.q}\n${last.r.summary}`); }}>
                <Input aria-label="Follow-up question" placeholder="Ask a follow-up question on this topic…" value={followUp} onChange={(e) => setFollowUp(e.target.value)} maxLength={1000} />
                <Button type="submit"><CornerDownRight /> Ask follow-up</Button>
              </form>
            </Panel>
          )}
          <Disclaimer />
        </div>
      </div>
    </>
  );
}

function Cite({ ids, sources }: { ids: number[]; sources: ResearchResult["sources"] }) {
  if (!ids.length) return <span className="ml-1 rounded bg-warning/10 px-1.5 text-[10px] text-warning">unverified</span>;
  return (
    <>
      {ids.map((id) => {
        const s = sources.find((x) => x.id === id);
        return (
          <a key={id} href={s?.url} target="_blank" rel="noopener noreferrer" title={s?.title} className="ml-1 rounded bg-primary/15 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/25">
            {id}
          </a>
        );
      })}
    </>
  );
}

function ResearchCard({ q, r, followUp }: { q: string; r: ResearchResult; followUp: boolean }) {
  const cited = (title: string, items: CitedItem[]) => (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? <p className="text-sm italic text-muted-foreground">None found in the retrieved sources.</p> : (
        <ul className="space-y-2">{items.map((it, i) => <li key={i} className="text-sm leading-relaxed text-foreground/90">• {it.text}<Cite ids={it.sources} sources={r.sources} /></li>)}</ul>
      )}
    </div>
  );
  const plain = (title: string, items: string[]) =>
    items.length ? (
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{title}</h4>
        <ul className="space-y-1.5">{items.map((x, i) => <li key={i} className="text-sm leading-relaxed text-foreground/90">• {x}</li>)}</ul>
      </div>
    ) : null;

  return (
    <article className="rounded-xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <p className="text-sm font-medium text-foreground">{followUp && <span className="text-muted-foreground">Follow-up: </span>}{q}</p>
        <span className="ml-auto"><AIBadge /></span>
      </header>
      <div className="space-y-6 p-5">
        <p className="text-sm leading-relaxed text-foreground">{r.summary}</p>

        <section className="space-y-4 rounded-lg border border-info/25 bg-info/5 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-info"><Globe className="size-3.5" /> Retrieved from external sources</p>
          {cited("Key findings", r.findings)}
          {cited("Important facts", r.facts)}
        </section>

        <section className="space-y-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Bot className="size-3.5" /> AI-generated analysis</p>
          {plain("Key insights", r.insights)}
          {plain("Different perspectives", r.perspectives)}
          {plain("Recommendations", r.recommendations)}
        </section>

        {plain("Limitations", r.limitations)}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Sources used <span className="font-normal text-muted-foreground">· via {r.provider}</span></h4>
          <ol className="space-y-1.5">
            {r.sources.map((s) => (
              <li key={s.id} className="flex gap-2 text-sm">
                <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{s.id}.</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-foreground/90 hover:text-primary">
                  <span className="line-clamp-1">{s.title}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">{new URL(s.url).hostname} <ExternalLink className="size-3" /></span>
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Search queries: {r.queries.join(" · ")}</p>
        </div>
      </div>
    </article>
  );
}

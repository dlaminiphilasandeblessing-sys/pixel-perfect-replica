import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { NotebookPen, Wand2, RotateCcw, Download, Pencil, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { summarizeMeeting, type MeetingSummary } from "@/lib/ai.functions";
import { recordUsage, downloadText } from "@/lib/session";
import { AIBadge, CopyButton, Disclaimer, EmptyState, ErrorState, LoadingState, PageHeader, Panel, callTool } from "@/components/app/ui-bits";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer · AI Workplace Assistant" },
      { name: "description", content: "Turn meeting notes or transcripts into summaries, decisions, action items and deadlines." },
      { property: "og:title", content: "Meeting Notes Summarizer" },
      { property: "og:description", content: "Extract decisions, action items and deadlines from meeting notes with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeetingsPage,
});

const SAMPLE = `Weekly product sync – Monday
Attendees: Thandi (PM), Marco (Eng lead), Aisha (Design), Ben (QA)
- Thandi: mobile checkout redesign is behind; beta target moved to 14 Nov.
- Marco said the payments API migration is 70% done; risk that the vendor sandbox is unstable.
- Agreed to drop the gift-card feature from v2 scope.
- Aisha will share updated checkout mockups by Thursday.
- Ben to write regression test plan for payments.
- Need someone to contact the vendor about sandbox uptime.
- Next sync: review beta readiness.`;

function toText(s: MeetingSummary) {
  const list = (h: string, a: string[]) => `${h}\n${a.length ? a.map((x) => `- ${x}`).join("\n") : "- None identified"}\n`;
  return [
    `SUMMARY\n${s.summary}\n`,
    list("KEY DISCUSSION POINTS", s.keyPoints),
    list("DECISIONS", s.decisions),
    `ACTION ITEMS\n${s.actionItems.length ? s.actionItems.map((a) => `- ${a.task} | Owner: ${a.owner} | Deadline: ${a.deadline}`).join("\n") : "- None identified"}\n`,
    list("DEADLINES", s.deadlines),
    list("FOLLOW-UP", s.followUps),
    list("RISKS / ISSUES", s.risks),
    "— AI-generated summary. Please verify against the original notes.",
  ].join("\n");
}

function MeetingsPage() {
  const run = useServerFn(summarizeMeeting);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<MeetingSummary | null>(null);
  const [editText, setEditText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (notes.trim().length < 40) return toast.error("Please paste at least a few sentences of meeting notes.");
    setLoading(true);
    setError(null);
    const r = await callTool(() => run({ data: { notes } }));
    setLoading(false);
    if (r.error) return setError(r.error);
    setResult(r.data!);
    setEditText(null);
    recordUsage("meetings", `Meeting: ${r.data!.summary.slice(0, 70)}`);
    toast.success("Summary ready");
  }

  const text = editText ?? (result ? toText(result) : "");
  const ns = (v: string) => /not specified/i.test(v);

  return (
    <>
      <PageHeader icon={NotebookPen} title="Meeting Notes Summarizer" subtitle="Paste notes or a transcript. The AI extracts only what's in the text — it won't invent owners or deadlines." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel title="Meeting notes" actions={<Button variant="ghost" size="sm" onClick={() => setNotes(SAMPLE)}>Use sample</Button>}>
          <label htmlFor="notes" className="sr-only">Meeting notes</label>
          <Textarea id="notes" rows={18} maxLength={40000} placeholder="Paste your meeting notes, transcript or discussion points here…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="mt-1.5 text-right text-xs text-muted-foreground">{notes.length.toLocaleString()} / 40,000</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={go} disabled={loading}><Wand2 /> Summarize</Button>
            <Button variant="ghost" onClick={() => { setNotes(""); setResult(null); setError(null); }}><Trash2 /> Clear notes</Button>
          </div>
        </Panel>

        <Panel title="Summary" actions={result && !loading ? <AIBadge /> : undefined}>
          {loading ? (
            <LoadingState message="Generating response… reading through your notes" />
          ) : error ? (
            <ErrorState message={error} onRetry={go} />
          ) : !result ? (
            <EmptyState icon={NotebookPen} title="No summary yet" text="Paste notes on the left and press Summarize." />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <CopyButton text={text} />
                <Button variant="outline" size="sm" onClick={() => setEditText(editText === null ? toText(result) : null)}>{editText === null ? <><Pencil /> Edit</> : <><Eye /> View formatted</>}</Button>
                <Button variant="outline" size="sm" onClick={go}><RotateCcw /> Regenerate</Button>
                <Button variant="outline" size="sm" onClick={() => downloadText("meeting-summary.txt", text)}><Download /> Export</Button>
              </div>
              {editText !== null ? (
                <Textarea aria-label="Edit summary" rows={22} value={editText} onChange={(e) => setEditText(e.target.value)} />
              ) : (
                <>
                  <Section title="Summary"><p className="text-sm leading-relaxed text-foreground/90">{result.summary}</p></Section>
                  <ListSection title="Key discussion points" items={result.keyPoints} />
                  <ListSection title="Decisions" items={result.decisions} />
                  <Section title="Action items">
                    {result.actionItems.length === 0 ? <None /> : (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                            <tr><th className="px-3 py-2">Task</th><th className="px-3 py-2">Responsible</th><th className="px-3 py-2">Deadline</th></tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {result.actionItems.map((a, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 text-foreground">{a.task}</td>
                                <td className={`px-3 py-2 ${ns(a.owner) ? "italic text-muted-foreground" : "text-foreground"}`}>{a.owner}</td>
                                <td className={`px-3 py-2 ${ns(a.deadline) ? "italic text-muted-foreground" : "text-foreground"}`}>{a.deadline}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Section>
                  <ListSection title="Deadlines" items={result.deadlines} />
                  <ListSection title="Follow-up" items={result.followUps} />
                  <ListSection title="Risks / issues" items={result.risks} tone="warning" />
                </>
              )}
            </div>
          )}
          <Disclaimer className="mt-5" />
        </Panel>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">{title}</h3>
      {children}
    </div>
  );
}
function None() {
  return <p className="text-sm italic text-muted-foreground">None identified in the provided notes.</p>;
}
function ListSection({ title, items, tone }: { title: string; items: string[]; tone?: "warning" }) {
  return (
    <Section title={title}>
      {items.length === 0 ? <None /> : (
        <ul className="space-y-1.5">
          {items.map((x, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/90">
              <span className={`mt-2 size-1.5 shrink-0 rounded-full ${tone === "warning" ? "bg-warning" : "bg-primary/70"}`} aria-hidden />
              {x}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

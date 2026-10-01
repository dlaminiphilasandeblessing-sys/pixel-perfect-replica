import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, RotateCcw, Wand2, Minimize2, Maximize2, Pencil, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateEmail } from "@/lib/ai.functions";
import { recordUsage, downloadText } from "@/lib/session";
import { AIBadge, CopyButton, Disclaimer, EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, callTool } from "@/components/app/ui-bits";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator · AI Workplace Assistant" },
      { name: "description", content: "Generate professional emails with the right tone for managers, clients, lecturers and teams." },
      { property: "og:title", content: "Smart Email Generator" },
      { property: "og:description", content: "Draft clear, well-toned workplace emails in seconds with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmailPage,
});

const TONES = ["Formal", "Friendly", "Professional", "Persuasive", "Apologetic", "Concise"];
const AUDIENCES = ["Manager", "Client", "Lecturer", "Colleague", "Team", "Customer", "General"];

function EmailPage() {
  const gen = useServerFn(generateEmail);
  const [form, setForm] = useState({ purpose: "", audience: "Manager", keyPoints: "", context: "", tone: "Professional", length: "medium" as "short" | "medium" | "long" });
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReq, setLastReq] = useState<{ instruction?: string; useResult?: boolean }>({});

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function run(opts: { instruction?: string; useResult?: boolean } = {}, overrides: Partial<typeof form> = {}) {
    const f = { ...form, ...overrides };
    if (f.purpose.trim().length < 3) {
      toast.error("Please describe what the email is about.");
      return;
    }
    setLastReq(opts);
    setLoading(true);
    setError(null);
    const r = await callTool(() =>
      gen({ data: { ...f, instruction: opts.instruction, previous: opts.useResult && result ? `Subject: ${result.subject}\n\n${result.body}` : undefined } }),
    );
    setLoading(false);
    if (r.error) return setError(r.error);
    setResult(r.data!);
    setEditing(false);
    recordUsage("emails", `Email: ${r.data!.subject}`);
    toast.success("Email generated");
  }

  const full = result ? `Subject: ${result.subject}\n\n${result.body}` : "";

  return (
    <>
      <PageHeader icon={Mail} title="Smart Email Generator" subtitle="Describe what you need — the AI drafts a structured email with subject, greeting, body and closing." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Panel title="Email details">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <Field label="Email purpose *" htmlFor="purpose">
              <Input id="purpose" maxLength={1000} placeholder="e.g. Request a deadline extension for the Q3 report" value={form.purpose} onChange={(e) => set("purpose")(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Recipient / audience" htmlFor="audience">
                <Select value={form.audience} onValueChange={set("audience")}>
                  <SelectTrigger id="audience"><SelectValue /></SelectTrigger>
                  <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Tone" htmlFor="tone">
                <Select value={form.tone} onValueChange={set("tone")}>
                  <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Key points" htmlFor="kp" hint="One per line works well.">
              <Textarea id="kp" rows={4} maxLength={4000} placeholder={"- Data from finance arrived late\n- Need 3 extra days\n- Draft is 80% complete"} value={form.keyPoints} onChange={(e) => set("keyPoints")(e.target.value)} />
            </Field>
            <Field label="Additional context" htmlFor="ctx">
              <Textarea id="ctx" rows={3} maxLength={4000} placeholder="Anything else the AI should know (optional)" value={form.context} onChange={(e) => set("context")(e.target.value)} />
            </Field>
            <Field label="Length" htmlFor="len">
              <div id="len" role="radiogroup" className="grid grid-cols-3 gap-2">
                {(["short", "medium", "long"] as const).map((l) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.length === l}
                    key={l}
                    onClick={() => setForm((f) => ({ ...f, length: l }))}
                    className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${form.length === l ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground hover:text-foreground"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" disabled={loading}><Wand2 /> Generate email</Button>
              <Button type="button" variant="ghost" onClick={() => { setForm({ purpose: "", audience: "Manager", keyPoints: "", context: "", tone: "Professional", length: "medium" }); setResult(null); setError(null); }}>
                <RotateCcw /> Clear
              </Button>
            </div>
          </form>
        </Panel>

        <Panel
          title="Generated email"
          actions={result && !loading ? <AIBadge /> : undefined}
        >
          {loading ? (
            <LoadingState message="AI is analysing your request…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => run(lastReq)} />
          ) : !result ? (
            <EmptyState icon={Mail} title="Your email will appear here" text="Fill in the purpose and key points, then press Generate." />
          ) : (
            <div className="space-y-4">
              {editing ? (
                <>
                  <Input aria-label="Subject" value={result.subject} onChange={(e) => setResult({ ...result, subject: e.target.value })} />
                  <Textarea aria-label="Email body" rows={16} value={result.body} onChange={(e) => setResult({ ...result, body: e.target.value })} />
                </>
              ) : (
                <div className="rounded-lg border border-border bg-surface">
                  <div className="border-b border-border px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-medium text-foreground">{result.subject}</span>
                  </div>
                  <pre className="whitespace-pre-wrap px-4 py-4 font-sans text-sm leading-relaxed text-foreground/90">{result.body}</pre>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <CopyButton text={full} />
                <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>{editing ? <><Eye /> Preview</> : <><Pencil /> Edit</>}</Button>
                <Button variant="outline" size="sm" onClick={() => run()}><RotateCcw /> Regenerate</Button>
                <Button variant="outline" size="sm" onClick={() => run({ instruction: "Make it noticeably shorter while keeping all key points.", useResult: true })}><Minimize2 /> Shorter</Button>
                <Button variant="outline" size="sm" onClick={() => run({ instruction: "Make it more detailed and thorough, adding helpful specifics and structure.", useResult: true })}><Maximize2 /> More detailed</Button>
                <Button variant="outline" size="sm" onClick={() => downloadText("email.txt", full)}><Download /> Download</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Change tone:</span>
                {TONES.filter((t) => t !== form.tone).map((t) => (
                  <button key={t} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground" onClick={() => { setForm((f) => ({ ...f, tone: t })); run({ instruction: `Rewrite in a ${t.toLowerCase()} tone.`, useResult: true }, { tone: t }); }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Disclaimer className="mt-5" />
        </Panel>
      </div>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessagesSquare, Send, Trash2, Bot, User, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatReply } from "@/lib/ai.functions";
import { readLocal, recordUsage, writeLocal } from "@/lib/session";
import { CopyButton, Disclaimer, Markdown, PageHeader, callTool } from "@/components/app/ui-bits";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Workplace Chatbot · AI Workplace Assistant" },
      { name: "description", content: "Chat with an AI assistant about meetings, messages, task planning and project work." },
      { property: "og:title", content: "AI Workplace Chatbot" },
      { property: "og:description", content: "An AI assistant for everyday workplace productivity questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = ["Help me prepare for a meeting.", "Write a professional message to my manager.", "How should I organize my tasks?", "Help me create a project plan."];

function ChatPage() {
  const send = useServerFn(chatReply);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMsgs(readLocal<Msg[]>("chat", [])), []);
  useEffect(() => {
    writeLocal("chat", msgs);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, loading]);

  async function submit(text: string, base?: Msg[]) {
    const content = text.trim();
    if (!content) return;
    if (content.length > 12000) return toast.error("Message is too long (max 12,000 characters).");
    const next: Msg[] = [...(base ?? msgs), { role: "user", content }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    setError(null);
    const r = await callTool(() => send({ data: { messages: next.slice(-20) } }));
    setLoading(false);
    if (r.error) return setError(r.error);
    setMsgs([...next, { role: "assistant", content: r.data! }]);
    recordUsage("chats", `Chat: ${content}`);
  }

  function retry() {
    const lastUser = msgs[msgs.length - 1];
    if (lastUser?.role === "user") submit(lastUser.content, msgs.slice(0, -1));
  }

  return (
    <>
      <PageHeader
        icon={MessagesSquare}
        title="AI Workplace Chatbot"
        subtitle="Ask Atlas, your AI assistant, anything about workplace productivity. It remembers context during this session."
        actions={
          msgs.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => { setMsgs([]); setError(null); toast.success("Conversation cleared"); }}>
              <Trash2 /> Clear conversation
            </Button>
          ) : undefined
        }
      />
      <div className="flex h-[calc(100dvh-14rem)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {msgs.length === 0 && !loading && (
            <div className="mx-auto flex max-w-lg flex-col items-center pt-8 text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-gradient-accent text-primary-foreground"><Bot className="size-6" /></div>
              <p className="mt-4 font-display text-lg font-semibold text-foreground">Hi, I'm Atlas — an AI assistant.</p>
              <p className="mt-1 text-sm text-muted-foreground">I'm not a human. I can help you prepare, write, plan and summarise. Try one of these:</p>
              <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => submit(s)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm text-foreground/90 transition-colors hover:border-primary/40">{s}</button>
                ))}
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Need something specific? Try the <Link to="/email" className="text-primary hover:underline">Email Generator</Link> or <Link to="/research" className="text-primary hover:underline">Research Assistant</Link>.
              </p>
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end gap-3">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">{m.content}</div>
                <div className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground" aria-label="You"><User className="size-4" /></div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-accent text-primary-foreground" aria-label="AI assistant"><Bot className="size-4" /></div>
                <div className="min-w-0 max-w-[90%] flex-1">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-primary">Atlas · AI-generated</p>
                  <Markdown>{m.content}</Markdown>
                  <div className="mt-2"><CopyButton text={m.content} /></div>
                </div>
              </div>
            ),
          )}
          {loading && (
            <div className="flex gap-3" role="status">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-accent text-primary-foreground"><Bot className="size-4" /></div>
              <div className="flex items-center gap-1.5 pt-2 text-sm text-muted-foreground">
                Generating response
                <span className="inline-flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d * 150}ms` }} />)}</span>
              </div>
            </div>
          )}
          {error && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <span className="text-foreground">{error}</span>
              <Button variant="outline" size="sm" onClick={retry}><RotateCcw /> Retry</Button>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form className="border-t border-border bg-surface p-3" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
          <div className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">Message</label>
            <Textarea
              id="chat-input"
              rows={1}
              placeholder="Ask about meetings, emails, planning…"
              className="max-h-40 min-h-11 resize-none bg-background"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
            />
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={loading || !input.trim()} aria-label="Send message"><Send /></Button>
          </div>
        </form>
      </div>
      <Disclaimer className="mt-4" />
    </>
  );
}

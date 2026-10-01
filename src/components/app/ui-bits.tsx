import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Check, Copy, Loader2, RotateCcw, ShieldAlert, Sparkles as _unused, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

void _unused;

export const DISCLAIMER =
  "AI-generated content may contain errors or omissions. Please review and verify important information before using it for professional, academic, legal, financial, or other important decisions.";

export function PageHeader({ icon: Icon, title, subtitle, actions }: { icon: React.ElementType; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-[1.65rem]">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-muted-foreground", className)}>
      <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
      <span>{DISCLAIMER}</span>
    </p>
  );
}

export function AIBadge({ label = "AI-generated" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
      <Bot className="size-3" aria-hidden /> {label}
    </span>
  );
}

export function LoadingState({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-4 py-14 text-center">
      <div className="relative grid size-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="w-full max-w-sm space-y-2">
        {[90, 75, 82].map((w) => (
          <div key={w} className="h-2.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <p className="max-w-md text-sm text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">No AI response was generated.</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy. Please select and copy manually.");
        }
      }}
    >
      {done ? <Check /> : <Copy />} {label}
    </Button>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-ai text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Uniform client-side wrapper: network failures become friendly messages. */
export async function callTool<T>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>): Promise<{ data?: T; error?: string }> {
  try {
    const r = await fn();
    if (r.ok) return { data: r.data };
    return { error: r.error };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/zod|invalid|required|Please|least|too long/i.test(msg) && msg.length < 400) {
      try {
        const parsed = JSON.parse(msg) as { message: string }[];
        return { error: parsed[0]?.message ?? "Please check your input." };
      } catch {
        return { error: msg };
      }
    }
    return { error: "We couldn't generate a response right now. Please check your connection and try again." };
  }
}

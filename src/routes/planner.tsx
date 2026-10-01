import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Plus, Trash2, Wand2, RotateCcw, Download, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { planTasks, type TaskPlan } from "@/lib/ai.functions";
import { recordUsage, downloadText } from "@/lib/session";
import { AIBadge, CopyButton, Disclaimer, EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, callTool } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner · AI Workplace Assistant" },
      { name: "description", content: "Prioritise tasks by urgency and importance and get a realistic daily or weekly schedule." },
      { property: "og:title", content: "AI Task Planner" },
      { property: "og:description", content: "AI-recommended daily and weekly schedules from your task list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});

type Pri = "High" | "Medium" | "Low";
type Task = { id: string; name: string; deadline: string; priority: Pri; duration: string };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const newTask = (): Task => ({ id: Math.random().toString(36).slice(2), name: "", deadline: "", priority: "Medium", duration: "" });

const PRI_STYLE: Record<string, string> = {
  High: "border-destructive/40 bg-destructive/10 text-destructive",
  Medium: "border-warning/40 bg-warning/10 text-warning",
  Low: "border-info/40 bg-info/10 text-info",
  Break: "border-success/30 bg-success/10 text-success",
};

function PlannerPage() {
  const run = useServerFn(planTasks);
  const [tasks, setTasks] = useState<Task[]>([newTask(), newTask()]);
  const [hours, setHours] = useState("6");
  const [start, setStart] = useState("09:00");
  const [days, setDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<TaskPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = (id: string, k: keyof Task, v: string) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, [k]: v } : t)));

  async function go() {
    const valid = tasks.filter((t) => t.name.trim());
    if (!valid.length) return toast.error("Add at least one task.");
    if (!days.length) return toast.error("Select at least one work day.");
    const h = Number(hours);
    if (!(h >= 0.5 && h <= 16)) return toast.error("Available hours must be between 0.5 and 16.");
    setLoading(true);
    setError(null);
    const r = await callTool(() =>
      run({
        data: {
          tasks: valid.map(({ name, deadline, priority, duration }) => ({ name, deadline, priority, duration })),
          hoursPerDay: h,
          startTime: start,
          days,
          mode,
          notes,
          today: new Date().toDateString(),
        },
      }),
    );
    setLoading(false);
    if (r.error) return setError(r.error);
    setPlan(r.data!);
    recordUsage("plans", `${mode === "daily" ? "Daily" : "Weekly"} plan · ${valid.length} tasks`);
    toast.success("Plan generated");
  }

  const editPlanTask = (i: number, k: keyof TaskPlan["tasks"][number], v: string) =>
    setPlan((p) => (p ? { ...p, tasks: p.tasks.map((t, j) => (j === i ? { ...t, [k]: v } : t)) } : p));

  const asText = plan
    ? [
        `AI-RECOMMENDED ${mode.toUpperCase()} PLAN (not guaranteed optimal)`,
        plan.overview,
        "",
        "PRIORITIES",
        ...plan.tasks.map((t) => `[${t.priority}] ${t.task} — ${t.suggestedTime} (${t.duration}) · due ${t.deadline} · ${t.reason}`),
        "",
        "SCHEDULE",
        ...plan.schedule.map((s) => `${s.day} ${s.time} — ${s.label}`),
        ...(plan.conflicts.length ? ["", "CONFLICTS", ...plan.conflicts.map((c) => `- ${c}`)] : []),
        ...(plan.tips.length ? ["", "TIPS", ...plan.tips.map((c) => `- ${c}`)] : []),
      ].join("\n")
    : "";

  const scheduleDays = plan ? Array.from(new Set(plan.schedule.map((s) => s.day))) : [];

  return (
    <>
      <PageHeader icon={CalendarClock} title="AI Task Planner" subtitle="List your tasks and availability. The AI prioritises by urgency and importance and suggests a schedule — as a recommendation." />
      <div className="space-y-6">
        <Panel title="Tasks & availability">
          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_9rem_8rem_7rem_2.25rem] gap-2 px-1 text-xs text-muted-foreground md:grid">
              <span>Task</span><span>Deadline</span><span>Priority</span><span>Duration</span><span />
            </div>
            {tasks.map((t, i) => (
              <div key={t.id} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_9rem_8rem_7rem_2.25rem] md:border-0 md:p-0">
                <Input className="col-span-2 md:col-span-1" aria-label={`Task ${i + 1} name`} placeholder="e.g. Finish client proposal" maxLength={200} value={t.name} onChange={(e) => upd(t.id, "name", e.target.value)} />
                <Input type="date" aria-label={`Task ${i + 1} deadline`} value={t.deadline} onChange={(e) => upd(t.id, "deadline", e.target.value)} />
                <Select value={t.priority} onValueChange={(v) => upd(t.id, "priority", v)}>
                  <SelectTrigger aria-label={`Task ${i + 1} priority`}><SelectValue /></SelectTrigger>
                  <SelectContent>{["High", "Medium", "Low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <Input aria-label={`Task ${i + 1} duration`} placeholder="e.g. 2h" maxLength={40} value={t.duration} onChange={(e) => upd(t.id, "duration", e.target.value)} />
                <Button variant="ghost" size="icon" aria-label={`Remove task ${i + 1}`} onClick={() => setTasks((ts) => (ts.length > 1 ? ts.filter((x) => x.id !== t.id) : [newTask()]))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setTasks((ts) => [...ts, newTask()])} disabled={tasks.length >= 30}><Plus /> Add task</Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Field label="Plan type" htmlFor="mode">
              <div id="mode" role="radiogroup" className="grid grid-cols-2 gap-2">
                {(["daily", "weekly"] as const).map((m) => (
                  <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("rounded-md border px-3 py-2 text-sm capitalize", mode === m ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground")}>{m}</button>
                ))}
              </div>
            </Field>
            <Field label="Hours available / day" htmlFor="hours">
              <Input id="hours" type="number" min={0.5} max={16} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
            </Field>
            <Field label="Start time" htmlFor="start">
              <Input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Work / study days" htmlFor="days">
              <div id="days" className="flex flex-wrap gap-1">
                {DAYS.map((d) => (
                  <button key={d} aria-pressed={days.includes(d)} onClick={() => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : DAYS.filter((x) => ds.includes(x) || x === d)))} className={cn("rounded-md border px-2 py-1.5 text-xs", days.includes(d) ? "border-primary bg-primary/10 text-foreground" : "border-input text-muted-foreground")}>{d}</button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notes (optional)" htmlFor="pnotes">
              <Textarea id="pnotes" rows={2} maxLength={2000} placeholder="e.g. I focus best in the morning; meeting every day 14:00-15:00" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={go} disabled={loading}><Wand2 /> Generate plan</Button>
            <Button variant="ghost" onClick={() => { setTasks([newTask(), newTask()]); setNotes(""); setPlan(null); setError(null); }}><RotateCcw /> Reset</Button>
          </div>
        </Panel>

        <Panel title="AI-recommended plan" actions={plan && !loading ? <AIBadge label="AI recommendation" /> : undefined}>
          {loading ? (
            <LoadingState message="AI is analysing your tasks and building a schedule…" />
          ) : error ? (
            <ErrorState message={error} onRetry={go} />
          ) : !plan ? (
            <EmptyState icon={CalendarClock} title="No plan yet" text="Add tasks above and press Generate plan." />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <CopyButton text={asText} />
                <Button variant="outline" size="sm" onClick={go}><RotateCcw /> Regenerate</Button>
                <Button variant="outline" size="sm" onClick={() => downloadText("task-plan.txt", asText)}><Download /> Export</Button>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{plan.overview}</p>
              <p className="text-xs text-muted-foreground">This schedule is an AI-generated suggestion and isn't guaranteed to be optimal. You can edit any cell below.</p>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>{["Priority", "Task", "Suggested time", "Duration", "Deadline", "Reason"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plan.tasks.map((t, i) => (
                      <tr key={i} className="align-top">
                        <td className="px-3 py-2">
                          <select aria-label="Priority" value={t.priority} onChange={(e) => editPlanTask(i, "priority", e.target.value)} className={cn("rounded-full border px-2 py-0.5 text-xs", PRI_STYLE[t.priority])}>
                            {["High", "Medium", "Low"].map((p) => <option key={p} value={p} className="bg-popover text-popover-foreground">{p}</option>)}
                          </select>
                        </td>
                        {(["task", "suggestedTime", "duration", "deadline", "reason"] as const).map((k) => (
                          <td key={k} className="px-1.5 py-1">
                            <input aria-label={k} value={t[k]} onChange={(e) => editPlanTask(i, k, e.target.value)} className="w-full rounded bg-transparent px-1.5 py-1 text-foreground/90 outline-none focus:bg-muted focus:ring-1 focus:ring-ring" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Visual schedule</h3>
                <div className={cn("grid gap-3", scheduleDays.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : "")}>
                  {scheduleDays.map((d) => (
                    <div key={d} className="rounded-lg border border-border bg-surface p-3">
                      <p className="mb-2 text-sm font-semibold text-foreground">{d}</p>
                      <ol className="space-y-1.5">
                        {plan.schedule.filter((s) => s.day === d).map((s, i) => (
                          <li key={i} className={cn("rounded-md border-l-2 px-2.5 py-1.5", PRI_STYLE[s.priority], s.priority === "Break" && "opacity-80")}>
                            <p className="font-mono text-[11px] opacity-90">{s.time}</p>
                            <p className="text-sm text-foreground">{s.label}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>

              {plan.conflicts.length > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="size-4" /> Conflicts</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">{plan.conflicts.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {plan.tips.length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Lightbulb className="size-4 text-primary" /> Time optimisation tips</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">{plan.tips.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          <Disclaimer className="mt-5" />
        </Panel>
      </div>
    </>
  );
}

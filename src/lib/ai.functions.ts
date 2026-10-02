import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Separate server endpoints per AI feature. Prompts/keys stay server-side.

const emailInput = z.object({
  purpose: z.string().trim().min(3, "Please describe the email purpose.").max(1000),
  audience: z.string().max(40),
  keyPoints: z.string().max(4000).optional().default(""),
  context: z.string().max(4000).optional().default(""),
  tone: z.string().max(40),
  length: z.enum(["short", "medium", "long"]),
  previous: z.string().max(8000).optional(),
  instruction: z.string().max(200).optional(),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data }) => {
    const { safeRun, fence } = await import("./ai/guard.server");
    const { callAIJson } = await import("./ai/gateway.server");
    const P = await import("./ai/prompts.server");
    return safeRun("email", async () => {
      const input = [
        `AUDIENCE: ${data.audience}`,
        `TONE: ${data.tone}`,
        `LENGTH: ${data.length}`,
        fence("purpose", data.purpose),
        fence("key_points", data.keyPoints),
        fence("additional_context", data.context),
        data.previous ? fence("previous_draft", data.previous) : "",
        data.instruction ? `REVISION REQUEST: ${data.instruction}` : "",
      ].join("\n\n");
      const out = await callAIJson<{ subject: string; body: string }>({ system: P.EMAIL_SYSTEM, input, json: P.EMAIL_SCHEMA });
      return z.object({ subject: z.string(), body: z.string().min(1) }).parse(out);
    });
  });

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ notes: z.string().trim().min(40, "Please paste at least a few sentences of notes.").max(40000, "Notes are too long (max 40,000 characters).") }).parse(d),
  )
  .handler(async ({ data }) => {
    const { safeRun, fence } = await import("./ai/guard.server");
    const { callAIJson } = await import("./ai/gateway.server");
    const P = await import("./ai/prompts.server");
    return safeRun("meeting", async () => {
      return callAIJson<MeetingSummary>({ system: P.MEETING_SYSTEM, input: fence("meeting_notes", data.notes), json: P.MEETING_SCHEMA, effort: "medium" });
    });
  });

export type MeetingSummary = {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: { task: string; owner: string; deadline: string }[];
  deadlines: string[];
  followUps: string[];
  risks: string[];
};

const plannerInput = z.object({
  tasks: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        deadline: z.string().max(40).optional().default(""),
        priority: z.enum(["High", "Medium", "Low"]),
        duration: z.string().max(40).optional().default(""),
      }),
    )
    .min(1, "Add at least one task.")
    .max(30),
  hoursPerDay: z.number().min(0.5).max(16),
  startTime: z.string().max(10),
  days: z.array(z.string()).min(1, "Select at least one work day."),
  mode: z.enum(["daily", "weekly"]),
  notes: z.string().max(2000).optional().default(""),
  today: z.string().max(40),
});

export const planTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => plannerInput.parse(d))
  .handler(async ({ data }) => {
    const { safeRun, fence } = await import("./ai/guard.server");
    const { callAIJson } = await import("./ai/gateway.server");
    const P = await import("./ai/prompts.server");
    return safeRun("planner", async () => {
      const taskList = data.tasks
        .map((t, i) => `${i + 1}. ${t.name} | priority: ${t.priority} | duration: ${t.duration || "not given"} | deadline: ${t.deadline || "not given"}`)
        .join("\n");
      const input = [
        `PLAN TYPE: ${data.mode}`,
        `TODAY: ${data.today}`,
        `WORK DAYS: ${data.days.join(", ")}`,
        `AVAILABLE HOURS PER DAY: ${data.hoursPerDay}, starting at ${data.startTime}`,
        fence("tasks", taskList),
        fence("notes", data.notes),
      ].join("\n\n");
      return callAIJson<TaskPlan>({ system: P.PLANNER_SYSTEM, input, json: P.PLANNER_SCHEMA, effort: "medium" });
    });
  });

export type TaskPlan = {
  overview: string;
  tasks: { priority: "High" | "Medium" | "Low"; task: string; suggestedTime: string; duration: string; deadline: string; reason: string }[];
  schedule: { day: string; time: string; label: string; priority: "High" | "Medium" | "Low" | "Break" }[];
  conflicts: string[];
  tips: string[];
};

export const researchStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getProvider } = await import("./ai/search.server");
  const p = getProvider();
  return { available: !!p, provider: p?.name ?? null };
});

const researchInput = z.object({
  question: z.string().trim().min(5, "Please enter a research question.").max(1000),
  depth: z.enum(["quick", "standard", "detailed"]),
  sourceType: z.string().max(60),
  urls: z.array(z.string().max(500)).max(5).optional().default([]),
  instructions: z.string().max(2000).optional().default(""),
  previousSummary: z.string().max(4000).optional(),
});

export type CitedItem = { text: string; sources: number[] };
export type ResearchResult = {
  provider: string;
  queries: string[];
  sources: { id: number; title: string; url: string }[];
  summary: string;
  findings: CitedItem[];
  facts: CitedItem[];
  insights: string[];
  perspectives: string[];
  recommendations: string[];
  limitations: string[];
  skippedUrls: string[];
};

export const runResearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => researchInput.parse(d))
  .handler(async ({ data }) => {
    const { safeRun, fence } = await import("./ai/guard.server");
    const { callAIJson, AIError } = await import("./ai/gateway.server");
    const { getProvider, isSafePublicUrl } = await import("./ai/search.server");
    const P = await import("./ai/prompts.server");
    return safeRun("research", async (): Promise<ResearchResult> => {
      const provider = getProvider();
      if (!provider) {
        throw new AIError("config", "Live external research is currently unavailable because no search provider is configured. No research was performed.");
      }
      const skippedUrls = data.urls.filter((u) => !isSafePublicUrl(u));
      const urls = data.urls.filter((u) => isSafePublicUrl(u));

      const { queries } = await callAIJson<{ queries: string[] }>({
        system: P.RESEARCH_QUERY_SYSTEM,
        input: [fence("question", data.question), `PREFERRED SOURCES: ${data.sourceType}`, fence("instructions", data.instructions)].join("\n\n"),
        json: P.RESEARCH_QUERY_SCHEMA,
      });
      const n = data.depth === "quick" ? 1 : data.depth === "standard" ? 2 : 4;
      const per = data.depth === "detailed" ? 5 : 4;
      const qs = queries.slice(0, n);

      const settled = await Promise.allSettled([
        ...qs.map((q) => provider.search(q, per)),
        ...urls.map((u) => provider.fetchUrl(u).then((h) => (h ? [h] : []))),
      ]);
      const seen = new Set<string>();
      const hits = settled
        .flatMap((s) => (s.status === "fulfilled" ? s.value : []))
        .filter((h) => h.url && !seen.has(h.url) && seen.add(h.url))
        .slice(0, 14);
      if (settled.every((s) => s.status === "rejected")) {
        throw new AIError("unavailable", "The external research service couldn't be reached. Please try again shortly.");
      }
      if (!hits.length) {
        throw new AIError("invalid_output", "No research results were found. Try rephrasing your question or broadening the topic.");
      }
      const sources = hits.map((h, i) => ({ id: i + 1, title: h.title || h.url, url: h.url }));
      const sourceText = hits.map((h, i) => `[${i + 1}] ${h.title}\nURL: ${h.url}\n${h.snippet}`).join("\n\n---\n\n");

      const out = await callAIJson<Omit<ResearchResult, "provider" | "queries" | "sources" | "skippedUrls">>({
        system: P.RESEARCH_SYSTEM,
        input: [
          `DEPTH: ${data.depth}`,
          `PREFERRED SOURCES: ${data.sourceType}`,
          fence("question", data.question),
          fence("instructions", data.instructions),
          data.previousSummary ? fence("previous_research", data.previousSummary) : "",
          fence("sources", sourceText),
        ].join("\n\n"),
        json: P.RESEARCH_SCHEMA,
        effort: "medium",
      });
      // Validate citations: drop references to non-existent sources.
      const clean = (items: CitedItem[]) => items.map((it) => ({ ...it, sources: it.sources.filter((s) => s >= 1 && s <= sources.length) }));
      return { ...out, findings: clean(out.findings), facts: clean(out.facts), provider: provider.name, queries: qs, sources, skippedUrls };
    });
  });

export const chatReply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) }))
          .min(1)
          .max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { safeRun } = await import("./ai/guard.server");
    const { callAI } = await import("./ai/gateway.server");
    const P = await import("./ai/prompts.server");
    return safeRun("chat", async () => {
      const last = data.messages[data.messages.length - 1];
      if (!last || last.role !== "user" || !last.content.trim()) throw new Error("bad input");
      return callAI({ system: P.CHAT_SYSTEM, input: data.messages.slice(-20) });
    });
  });

// AI provider adapter. Swap provider/model via env (AI_MODEL, AI_BASE_URL) without touching the UI.
const DEFAULT_MODEL = "openai/gpt-6-astra";
const DEFAULT_BASE = "https://ai.gateway.lovable.dev";

export class AIError extends Error {
  constructor(
    public code: "rate_limit" | "credits" | "unavailable" | "invalid_output" | "config",
    message: string,
  ) {
    super(message);
  }
}

export type AIMessage = { role: "user" | "assistant"; content: string };

type JsonSchema = { name: string; schema: Record<string, unknown> };

export async function callAI(opts: {
  system: string;
  input: string | AIMessage[];
  json?: JsonSchema;
  effort?: "low" | "medium";
}): Promise<string> {
  const apiKey = process.env["AI_API_KEY"] || process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AIError("config", "The AI service is not configured.");
  const model = process.env["AI_MODEL"] || DEFAULT_MODEL;
  const base = (process.env["AI_BASE_URL"] || DEFAULT_BASE).replace(/\/+$/, "").replace(/\/v1$/, "");

  const input =
    typeof opts.input === "string"
      ? [{ role: "user", content: opts.input }]
      : opts.input.map((m) => ({ role: m.role, content: m.content }));

  let res: Response;
  try {
    res = await fetch(`${base}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model,
        instructions: opts.system,
        input,
        stream: true,
        store: false,
        reasoning: { effort: opts.effort ?? "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        ...(opts.json
          ? { text: { format: { type: "json_schema", name: opts.json.name, schema: opts.json.schema, strict: true } } }
          : {}),
      }),
    });
  } catch {
    throw new AIError("unavailable", "We couldn't reach the AI service. Please try again.");
  }

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("AI gateway error", res.status, body.slice(0, 500));
    if (res.status === 429) throw new AIError("rate_limit", "Too many requests right now. Please wait a moment and try again.");
    if (res.status === 402) throw new AIError("credits", "The AI usage limit for this workspace has been reached.");
    throw new AIError("unavailable", "We couldn't generate a response right now. Please try again.");
  }

  // Read the SSE stream and accumulate the final text.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let failed: string | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === "response.output_text.delta") text += evt.delta ?? "";
          else if (evt.type === "response.failed" || evt.type === "error") {
            failed = evt.error?.message ?? evt.response?.error?.message ?? "failed";
          } else if (evt.type === "response.incomplete") failed = "incomplete";
        } catch {
          /* ignore partial */
        }
      }
    }
  }
  if (failed) {
    console.error("AI stream failed", failed);
    throw new AIError("unavailable", "The AI response was interrupted. Please try again.");
  }
  if (!text.trim()) throw new AIError("invalid_output", "The AI returned an empty response. Please try again.");
  return text;
}

export async function callAIJson<T>(opts: Parameters<typeof callAI>[0] & { json: JsonSchema }): Promise<T> {
  const raw = await callAI(opts);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AIError("invalid_output", "The AI returned an unexpected format. Please try again.");
  }
}

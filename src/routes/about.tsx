import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About This Project · AI Workplace Assistant" },
      { name: "description", content: "The problem, solution, AI technologies, prompt engineering and responsible AI approach behind this assistant." },
      { property: "og:title", content: "About the AI Workplace Productivity Assistant" },
      { property: "og:description", content: "Problem, solution, AI technologies and responsible AI approach." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const SECTIONS: [string, string][] = [
  ["Problem", "Professionals spend significant time on repetitive workplace activities such as drafting emails, summarizing information, planning tasks, and conducting research."],
  ["Solution", "An AI-powered workplace assistant that automates and simplifies these activities through five focused tools — an email generator, meeting summarizer, task planner, research assistant and workplace chatbot — usable instantly with no registration."],
  ["AI technologies", "Text generation runs on a large language model (OpenAI GPT family) accessed through the Lovable AI Gateway from secure server functions. Structured features use JSON-schema-constrained output so results can be validated before display. The Research Assistant uses a pluggable search provider (Firecrawl or Tavily, configured by environment variables) to retrieve real web sources before the model analyses them. Provider, model and keys can be changed on the server without touching the interface."],
  ["Prompt engineering", "Each feature has its own server-side prompt template with ROLE, TASK, CONTEXT, USER INPUT, CONSTRAINTS, OUTPUT FORMAT, QUALITY REQUIREMENTS and RESPONSIBLE AI INSTRUCTIONS. User input is wrapped in labelled tags so it's treated as data rather than instructions. Research uses a two-step chain: the model first writes search queries, then synthesises numbered sources into cited findings."],
  ["Responsible AI", "Outputs are labelled as AI-generated, prompts forbid invented facts and citations, citations are validated server-side, retrieved information is separated from AI analysis, and the app is transparent when live research is unavailable. Data stays in the browser session; users are reminded not to share confidential information and to keep humans in charge of decisions."],
];

function About() {
  return (
    <>
      <PageHeader icon={Info} title="About This Project" subtitle="AI Workplace Productivity Assistant — a full-stack AI application." />
      <div className="space-y-4">
        {SECTIONS.map(([t, d], i) => (
          <section key={t} className="grid gap-2 rounded-xl border border-border bg-card p-6 shadow-card md:grid-cols-[12rem_1fr]">
            <h2 className="font-semibold text-foreground"><span className="mr-2 font-mono text-xs text-primary">0{i + 1}</span>{t}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
          </section>
        ))}
      </div>
    </>
  );
}

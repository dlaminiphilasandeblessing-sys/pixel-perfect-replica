import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader, Panel } from "@/components/app/ui-bits";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help · AI Workplace Assistant" },
      { name: "description", content: "How to use each AI tool, prompt examples, verification tips and how to clear session data." },
      { property: "og:title", content: "Help & prompt tips" },
      { property: "og:description", content: "Get better results from the AI Workplace Productivity Assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

const ITEMS = [
  ["Smart Email Generator", "Enter the purpose, pick the audience and tone, and list key points. Press Generate. You can edit, copy, regenerate, change tone, or make it shorter or more detailed. Good prompt: “Ask my manager for Friday off to attend a graduation; I'll finish the report Thursday.”"],
  ["Meeting Notes Summarizer", "Paste raw notes or a transcript (up to 40,000 characters) and press Summarize. You'll get a summary, decisions, an action-item table, deadlines, follow-ups and risks. Missing owners or dates show as “Not specified in the provided notes.” Edit, copy or export the result."],
  ["AI Task Planner", "Add tasks with priority, deadline and estimated duration, choose daily or weekly, your hours and work days. The AI returns a prioritised table and a visual schedule with breaks. Every cell is editable. It's a recommendation, not a guaranteed optimal plan."],
  ["AI Research Assistant", "Ask a question, pick depth and source type, and optionally add up to 5 URLs. The assistant searches external sources, then shows findings with numbered citations, separated from AI analysis. Click a citation number to open the source. Ask follow-ups to keep researching."],
  ["AI Workplace Chatbot", "Ask any workplace question. Atlas remembers context during your session. Press Enter to send, Shift+Enter for a new line. Clear the conversation at any time."],
  ["Getting better AI responses", "Be specific about the goal, audience and constraints. Include relevant facts (dates, names, numbers) — the AI won't invent them. Ask for a format (“bullet points”, “under 100 words”). Iterate: regenerate or ask for changes."],
  ["Verifying research sources", "Open the cited sources and check that they say what the summary claims. Items marked “unverified” have no supporting source. Prefer official, academic or well-known publications, and check publication dates."],
  ["Responsible AI", "AI can be wrong or biased. Review everything before sending or relying on it, and don't paste confidential information you aren't authorised to share."],
  ["Clearing session data", "Use “Clear session data” at the bottom of the sidebar. This removes statistics, recent activity and chat history stored in your browser. Nothing is saved to an account."],
];

function Help() {
  return (
    <>
      <PageHeader icon={LifeBuoy} title="Help" subtitle="Everything you need to get useful results quickly." />
      <Panel>
        <Accordion type="single" collapsible defaultValue="item-0">
          {ITEMS.map(([q, a], i) => (
            <AccordionItem key={q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-foreground">{q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Panel>
    </>
  );
}

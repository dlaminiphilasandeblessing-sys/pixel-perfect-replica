import { Mail, NotebookPen, CalendarClock, Search, MessagesSquare, LayoutDashboard, LifeBuoy, ShieldCheck, Info } from "lucide-react";

export const TOOLS = [
  { to: "/email", label: "Email Generator", title: "Smart Email Generator", icon: Mail, stat: "emails", statLabel: "Emails generated", desc: "Draft clear, well-toned emails for managers, clients and teams in seconds." },
  { to: "/meetings", label: "Meeting Summarizer", title: "Meeting Notes Summarizer", icon: NotebookPen, stat: "meetings", statLabel: "Meetings summarized", desc: "Turn messy notes or transcripts into decisions, action items and deadlines." },
  { to: "/planner", label: "Task Planner", title: "AI Task Planner", icon: CalendarClock, stat: "plans", statLabel: "Plans created", desc: "Prioritise your tasks and get a realistic daily or weekly schedule." },
  { to: "/research", label: "Research Assistant", title: "AI Research Assistant", icon: Search, stat: "research", statLabel: "Research sessions", desc: "Search external sources, then get cited findings and clear analysis." },
  { to: "/chat", label: "AI Chatbot", title: "AI Workplace Chatbot", icon: MessagesSquare, stat: "chats", statLabel: "Chat messages", desc: "Ask anything about meetings, messages, planning or projects." },
] as const;

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  ...TOOLS.map((t) => ({ to: t.to, label: t.label, icon: t.icon })),
] as const;

export const NAV_SECONDARY = [
  { to: "/help", label: "Help", icon: LifeBuoy },
  { to: "/responsible-ai", label: "Responsible AI", icon: ShieldCheck },
  { to: "/about", label: "About This Project", icon: Info },
] as const;

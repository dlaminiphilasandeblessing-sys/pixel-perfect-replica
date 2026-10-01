// Research provider abstraction. Configure with SEARCH_PROVIDER + SEARCH_API_KEY (or provider-specific keys).
export type SearchHit = { title: string; url: string; snippet: string };

export class SearchUnavailable extends Error {}

type Provider = { name: string; search: (q: string, limit: number) => Promise<SearchHit[]>; fetchUrl: (url: string) => Promise<SearchHit | null> };

function tavily(key: string): Provider {
  return {
    name: "Tavily",
    async search(q, limit) {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: q, max_results: limit, search_depth: "basic" }),
      });
      if (!r.ok) throw new Error(`tavily ${r.status}`);
      const j = (await r.json()) as { results?: { title: string; url: string; content: string }[] };
      return (j.results ?? []).map((x) => ({ title: x.title, url: x.url, snippet: x.content?.slice(0, 1500) ?? "" }));
    },
    async fetchUrl(url) {
      const r = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ urls: [url] }),
      });
      if (!r.ok) return null;
      const j = (await r.json()) as { results?: { url: string; raw_content: string }[] };
      const x = j.results?.[0];
      return x ? { title: url, url: x.url, snippet: x.raw_content.slice(0, 3000) } : null;
    },
  };
}

function firecrawl(key: string): Provider {
  return {
    name: "Firecrawl",
    async search(q, limit) {
      const r = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: q, limit }),
      });
      if (!r.ok) throw new Error(`firecrawl ${r.status}`);
      const j = (await r.json()) as { data?: { web?: { title: string; url: string; description: string }[] } | { title: string; url: string; description: string }[] };
      const list = Array.isArray(j.data) ? j.data : (j.data?.web ?? []);
      return list.map((x) => ({ title: x.title, url: x.url, snippet: x.description ?? "" }));
    },
    async fetchUrl(url) {
      const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });
      if (!r.ok) return null;
      const j = (await r.json()) as { data?: { markdown?: string; metadata?: { title?: string } } };
      return j.data?.markdown ? { title: j.data.metadata?.title ?? url, url, snippet: j.data.markdown.slice(0, 3000) } : null;
    },
  };
}

export function getProvider(): Provider | null {
  const pref = (process.env["SEARCH_PROVIDER"] || "").toLowerCase();
  const generic = process.env["SEARCH_API_KEY"];
  const fc = process.env["FIRECRAWL_API_KEY"] || (pref === "firecrawl" ? generic : undefined);
  const tv = process.env["TAVILY_API_KEY"] || (pref === "tavily" ? generic : undefined);
  if (pref === "tavily" && tv) return tavily(tv);
  if (fc) return firecrawl(fc);
  if (tv) return tavily(tv);
  return null;
}

export function isSafePublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (h.includes(":")) return false; // raw IPv6
    return true;
  } catch {
    return false;
  }
}

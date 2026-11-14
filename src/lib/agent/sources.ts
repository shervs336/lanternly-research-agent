// Web search (Tavily) and page reading (Jina Reader). Both have free tiers.

export type Source = { id: number; title: string; url: string; snippet: string };

export async function tavilySearch(query: string, signal?: AbortSignal) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("Web search is not configured.");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, max_results: 5, search_depth: "basic", include_answer: false }),
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[search] tavily", res.status, await res.text().catch(() => ""));
    throw new Error("The search service is unavailable right now.");
  }
  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (data.results ?? [])
    .filter((r) => r.url && /^https?:\/\//.test(r.url))
    .map((r) => ({ title: (r.title || r.url!).slice(0, 200), url: r.url!, snippet: (r.content || "").slice(0, 400) }));
}

/** Fetches a page as clean text through Jina Reader. */
export async function readPage(url: string, signal?: AbortSignal) {
  const headers: Record<string, string> = { Accept: "text/plain", "X-Return-Format": "markdown" };
  if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  const timeout = AbortSignal.timeout(15000);
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Couldn't read that page (status ${res.status}).`);
  const text = await res.text();
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // drop images
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

import { tool } from "ai";
import { z } from "zod";
import { readPage, tavilySearch, type Source } from "./sources";

const MAX_READ_CHARS = 6000;

/**
 * Tools are created per request so each research run has its own numbered
 * source list. The model cites sources by these numbers, e.g. [3].
 */
export function createResearchTools(signal?: AbortSignal) {
  const sources = new Map<number, Source>();
  const byUrl = new Map<string, number>();

  return {
    plan: tool({
      description:
        "Call this first, exactly once. Break the question into 3-5 focused research steps you will take.",
      inputSchema: z.object({
        steps: z.array(z.string().min(3).max(160)).min(2).max(6).describe("Short research steps, in order"),
      }),
      execute: async ({ steps }) => ({ steps }),
    }),

    search: tool({
      description:
        "Search the web. Returns numbered sources with snippets. Use specific queries; run 2-4 searches covering different angles.",
      inputSchema: z.object({ query: z.string().min(2).max(200).describe("A focused web search query") }),
      execute: async ({ query }) => {
        const results = await tavilySearch(query, signal);
        const numbered = results.map((r) => {
          let id = byUrl.get(r.url);
          if (!id) {
            id = sources.size + 1;
            sources.set(id, { id, ...r });
            byUrl.set(r.url, id);
          }
          return { id, title: r.title, url: r.url, snippet: r.snippet };
        });
        return { query, results: numbered };
      },
    }),

    read: tool({
      description:
        "Read the full text of a source returned by search, by its number. Read the 2-4 most promising sources before writing.",
      inputSchema: z.object({ id: z.number().int().positive().describe("The source number from search results") }),
      execute: async ({ id }) => {
        // Only sources that search returned can be read: the model can't be steered into fetching arbitrary URLs.
        const source = sources.get(id);
        if (!source) throw new Error(`There is no source [${id}]. Use a number from the search results.`);
        let text: string;
        try {
          text = await readPage(source.url, signal);
        } catch (err) {
          console.error("[read]", source.url, err);
          throw new Error(`Couldn't read [${id}]. Try another source.`);
        }
        // Paywalls, cookie walls and blocked pages come back nearly empty.
        if (text.length < 800) {
          throw new Error(`[${id}] had almost no readable text (blocked or paywalled). Rely on its snippet or read another source.`);
        }
        {
          return {
            id,
            title: source.title,
            url: source.url,
            chars: text.length,
            content: text.slice(0, MAX_READ_CHARS),
          };
        }
      },
    }),
  };
}

export type ResearchTools = ReturnType<typeof createResearchTools>;

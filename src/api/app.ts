import { Hono } from "hono";
import { fetchArticle } from "../upstream/fetchArticle.js";
import { convert } from "../core/convert.js";
import { ArticleNotFoundError, UpstreamFormatError, UpstreamTimeoutError, UpstreamUnavailableError } from "../core/errors.js";
import type { QualityTier } from "../core/checks.js";  
import { checkConversion, qualityTier } from "../core/checks.js"; 


// Article IDs are digits only (e.g. 1986936). Anything else is rejected before
// it reaches the file system or, later, the upstream API.
const ARTICLE_ID = /^\d{1,12}$/;

// How long each kind of response may be reused.
//   max-age                 - how long browser can reuse its own cache
//   s-maxage                - how long cdn treat their own cache as fresh
//   stale-while-revalidate  - after 15 min, serve the old copy instantly for up to 1 h
//                             while the CDN fetches a fresh one in the background
//   stale-if-error          - if we're down or erroring, keep serving the old copy for 1 day
const CACHE_OK = "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400, stale-if-error=86400";

const CACHE_NOT_FOUND = "public, max-age=60, s-maxage=60";

const CACHE_NEVER = "no-store";
const CACHE_CRITICAL = "public, max-age=60, s-maxage=60";


const SEVERITY: Record<QualityTier, string> = {
  ok: "INFO",
  warning: "WARNING",
  error: "ERROR",
  critical: "CRITICAL",
};

/** Gets an article's JSON by ID. The server passes the live one; tests pass fixtures. */
export type ArticleFetcher = (id: string) => Promise<unknown>;

export interface AppOptions {
  fetchArticle: ArticleFetcher;
}

export function createApp({ fetchArticle }: AppOptions): Hono {
  const app = new Hono();

  app.get("/healthz", (c) => c.text("ok"));

  app.get("/v1/articles/:id", async (c) => {
    const id = c.req.param("id");
    if (!ARTICLE_ID.test(id)) {
      c.header("Cache-Control", CACHE_NOT_FOUND);
      return c.json({ error: 400, message: "article id must be numeric" }, 400);
    }

    try {
      const payload = await fetchArticle(id);
      const { markdown, html } = convert(payload);

      const issues = checkConversion(html, markdown, { idempotence: false });
      const quality = qualityTier(issues);
      console.log(JSON.stringify({
        severity: SEVERITY[quality],
        message: `converted article ${id}: ${quality}`,
        articleId: id,
        quality,
        issues: issues.map((i) => ({ check: i.check, severity: i.severity, detail: i.detail })),
      }));

      c.header("Content-Type", "text/markdown; charset=utf-8");
      c.header("Cache-Control", quality === "critical" ? CACHE_CRITICAL : CACHE_OK);

      c.header("Edge-Cache-Tag", `article-${id}`);
      c.header("X-Conversion-Quality", quality);
      return c.body(markdown);
    } catch (err) {
      if (err instanceof ArticleNotFoundError) {
        c.header("Cache-Control", CACHE_NOT_FOUND);
        return c.json({ error: 404, message: "article not found" }, 404);
      }
      c.header("Cache-Control", CACHE_NEVER);
      if (err instanceof UpstreamTimeoutError) return c.json({ error: 504, message: "upstream timed out" }, 504);
      if (err instanceof UpstreamFormatError || err instanceof UpstreamUnavailableError) {
        return c.json({ error: 502, message: "upstream error" }, 502);
      }
      throw err;
    }
  });

  return app;
}
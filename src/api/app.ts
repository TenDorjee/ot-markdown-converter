import { Hono } from "hono";
import { fetchArticle } from "../upstream/fetchArticle.js";
import { convert } from "../core/convert.js";
import { ArticleNotFoundError, UpstreamFormatError, UpstreamTimeoutError, UpstreamUnavailableError } from "../core/errors.js";

// Article IDs are digits only (e.g. 1986936). Anything else is rejected before
// it reaches the file system or, later, the upstream API.
const ARTICLE_ID = /^\d{1,12}$/;

/** Build the API. Routes are added here; server.ts only starts it. */
export function createApp(): Hono {
  const app = new Hono();

  app.get("/healthz", (c) => c.text("ok"));


// GET the article .json and convert to markdown (from a a local copy for now)
app.get("/v1/articles/:id", async (c) => {               // ← async
  const id = c.req.param("id");
  if (!ARTICLE_ID.test(id)) {
    return c.json({ error: 400, message: "article id must be numeric" }, 400);
  }

  try {
    const payload = await fetchArticle(id);              // ← live request instead of the file
    const { markdown } = convert(payload);

    c.header("Content-Type", "text/markdown; charset=utf-8");
    return c.body(markdown);
  } catch (err) {
    if (err instanceof ArticleNotFoundError) {
      return c.json({ error: 404, message: "article not found" }, 404);
    }
    if (err instanceof UpstreamTimeoutError) {
      return c.json({ error: 504, message: "upstream timed out" }, 504);
    }
    if (err instanceof UpstreamFormatError || err instanceof UpstreamUnavailableError) {
      return c.json({ error: 502, message: "upstream error" }, 502);
    }
    throw err;
  }
});

  return app;
}
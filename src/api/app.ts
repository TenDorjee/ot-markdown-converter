import { Hono } from "hono";
import { existsSync, readFileSync } from "node:fs";
import { convert } from "../core/convert.js";
import { ArticleNotFoundError, UpstreamFormatError } from "../core/errors.js";

// Article IDs are digits only (e.g. 1986936). Anything else is rejected before
// it reaches the file system or, later, the upstream API.
const ARTICLE_ID = /^\d{1,12}$/;

/** Build the API. Routes are added here; server.ts only starts it. */
export function createApp(): Hono {
  const app = new Hono();

  app.get("/healthz", (c) => c.text("ok"));


// GET the article .json and convert to markdown (from a a local copy for now)
app.get("/v1/articles/:id", (c) => {
  const id = c.req.param("id");
  if (!ARTICLE_ID.test(id)) {
    return c.json({ error: 400, message: "article id must be numeric" }, 400);
  }

  try {
    const file = `tests/fixtures/${id}.json`;
    if (!existsSync(file)) throw new ArticleNotFoundError(`no fixture for ${id}`);

    const payload = JSON.parse(readFileSync(file, "utf-8"));
    const { markdown } = convert(payload);   // may throw ArticleNotFoundError or UpstreamFormatError

    c.header("Content-Type", "text/markdown; charset=utf-8");
    return c.body(markdown);
  } catch (err) {
    if (err instanceof ArticleNotFoundError) {
      return c.json({ error: 404, message: "article not found" }, 404);
    }
    if (err instanceof UpstreamFormatError) {
      return c.json({ error: 502, message: "upstream error" }, 502);
    }
    throw err;   // unexpected: let Hono return 500
  }
});

  return app;
}
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { convert } from "../core/convert.js";

/** Build the API. Routes are added here; server.ts only starts it. */
export function createApp(): Hono {
  const app = new Hono();

  app.get("/healthz", (c) => c.text("ok"));



   
// GET the article .json and convert to markdown (from a a local copy for now)
  app.get("/v1/articles/:id", (c) => {
    const id = c.req.param("id");
    const payload = JSON.parse(readFileSync(`tests/fixtures/${id}.json`, "utf-8"));
    console.log(payload); 
    const { markdown } = convert(payload);


    c.header("Content-Type", "text/markdown; charset=utf-8");
    return c.body(markdown);
  });

  return app;
}
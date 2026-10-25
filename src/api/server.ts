import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { fetchArticle } from "../upstream/fetchArticle.js";

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: createApp({ fetchArticle }).fetch, port });
console.log(`listening on http://localhost:${port}`);
import { readFileSync } from "node:fs";
import { convertArticle } from "../core/convert.js";

// Usage: npm run --silent convert -- <article.json>
const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run --silent convert -- <article.json>");
  process.exit(1);
}

try {
  const payload: unknown = JSON.parse(readFileSync(file, "utf-8"));
  process.stdout.write(convertArticle(payload));
} catch (err) {
  // e.g. "ArticleNotFoundError: the article is not public"
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
  process.exit(1);
}

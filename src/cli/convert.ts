import { readFileSync } from "node:fs";
import { convertArticle } from "../core/convert.js";

// Usage: npm run --silent convert -- <article.json>
const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run --silent convert -- <article.json>");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, "utf-8"));
process.stdout.write(convertArticle(payload));

// Metadata for the top of the Markdown, as YAML front matter. Agents use it to cite the
// source, check which products and versions an article applies to, and judge freshness.
//
// Example (article 1986936):
//   ---
//   title: How to Configure UFT One/UFT Developer for Reliable Test Execution on ...
//   article_id: '1986936'
//   url: https://my.opentext.com/support/article/1986936
//   type: Knowledge
//   products:
//     - name: UFT One
//       versions: ['23.4', '25.2', '24.2', '2022', Any, ...]
//   version: 4
//   created: '2025-06-24T20:32:16Z'
//   last_modified: '2026-10-07T00:13:46Z'
//   source: my.opentext.com
//   ---
//
// Fixes applied to the source fields:
//   - Title "UFT Developer  for" (double space)      -> single spaces
//   - dates in epoch milliseconds (1791332026282)    -> ISO 8601 UTC
//   - duplicate versions ("26.3", "26.3")            -> listed once, API order kept
//   - Votes and Views are left out: they change on every page view, which would
//     change the output (and its cache ETag) without the article changing.
// Output is deterministic: same article in, same YAML out.

import { dump } from "js-yaml";
import type { Article } from "./schema.js";

export const ARTICLE_URL = "https://my.opentext.com/support/article/";

/** Collapse runs of whitespace: "UFT Developer  for" -> "UFT Developer for". */
export const cleanText = (s: string) => s.replace(/\s+/g, " ").trim();

/** 1791332026282 -> "2026-10-07T00:13:46Z". */
export function isoDate(epochMs: number | null | undefined): string | undefined {
  if (epochMs == null || !Number.isFinite(epochMs)) return undefined;
  return new Date(epochMs).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export interface ArticleMeta {
  title: string;
  article_id: string;
  url: string;
  type?: string;
  products?: Array<{ name: string; versions?: string[] }>;
  version?: number;
  created?: string;
  last_modified?: string;
  source: string;
}

/** Pick and clean the metadata fields. Empty values are left out. */
export function articleMeta(article: Article): ArticleMeta {
  const products = article.Products.map((p) => {
    const versions = [...new Set((p.versions ?? []).map((v) => cleanText(v.version)).filter(Boolean))];
    return versions.length ? { name: cleanText(p.DisplayLabel), versions } : { name: cleanText(p.DisplayLabel) };
  }).filter((p) => p.name);

  // Fixed key order; empty values are dropped below.
  const ordered: Record<string, unknown> = {
    title: cleanText(article.Title),
    article_id: article.Id,
    url: ARTICLE_URL + article.Id,
    type: article.ArticleType ?? undefined,
    products: products.length ? products : undefined,
    version: article.Version ?? undefined,
    created: isoDate(article.CreatedTime),
    last_modified: isoDate(article.LastContentUpdateTime),
    source: "my.opentext.com",
  };
  return Object.fromEntries(Object.entries(ordered).filter(([, v]) => v !== undefined)) as unknown as ArticleMeta;
}

/** The front matter block, including the --- delimiters. */
export function frontMatter(meta: ArticleMeta): string {
  const yaml = dump(meta, { lineWidth: -1, noRefs: true, flowLevel: 3 });
  return `---\n${yaml}---\n`;
}

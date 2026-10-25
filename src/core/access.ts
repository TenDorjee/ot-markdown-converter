// Only publicly readable, published articles may be converted and served.
// A non-public article raises the same error as a missing one, so the API never
// reveals that a private article exists.
//
// Example (all three sample articles):  "CanRead": "Public_c", "PhaseId": "External"

import { ArticleNotFoundError } from "./errors.js";
import type { Article } from "./schema.js";

const PUBLIC_CAN_READ = "Public_c";
const PUBLIC_PHASE = "External";

export function isPublic(article: Article): boolean {
  return article.CanRead === PUBLIC_CAN_READ && article.PhaseId === PUBLIC_PHASE;
}

/** @throws ArticleNotFoundError if the article isn't public. */
export function assertPublic(article: Article): void {
  if (!isPublic(article)) throw new ArticleNotFoundError("the article is not public");
}

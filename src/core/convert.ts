import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { attachmentsSection } from "./attachments.js";
import { rehypeKbArticle } from "./rehype/index.js";

/**
 * Convert an article API response to Markdown (title, body and attachments).
 *
 * @param payload - JSON from /api/web/support/article/{id}.
 * @returns Markdown with an H1 title, the converted body and an Attachments section.
 */
export function convertArticle(payload: any): string {
  const article = payload.response;
  // "UFT One/UFT Developer  for Reliable..." -> single spaces
  const title = String(article.Title).replace(/\s+/g, " ").trim();

  const body = unified()
    .use(rehypeParse, { fragment: true })                 // HTML string -> HTML tree (hast)
    .use(rehypeKbArticle)                                 // KB-specific clean-up rules
    .use(rehypeRemark)                                    // HTML tree -> Markdown tree (mdast)
    .use(remarkGfm)                                       // tables, autolinks
    .use(remarkStringify, { bullet: "-", fences: true })  // Markdown tree -> text
    .processSync(article.Content);

  const attachments = attachmentsSection(article.Attachments);
  return `# ${title}\n\n${String(body)}${attachments ? `\n${attachments}` : ""}`;
}

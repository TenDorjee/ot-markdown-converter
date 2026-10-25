import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { assertPublic } from "./access.js";
import { attachmentsSection } from "./attachments.js";
import { articleMeta, frontMatter } from "./frontmatter.js";
import type { ArticleMeta } from "./frontmatter.js";
import { rehypeKbArticle } from "./rehype/index.js";
import { parseArticle } from "./schema.js";

export interface ConvertResult {
  /** The full Markdown document: front matter, title, body, attachments. */
  markdown: string;
  /** The metadata in the front matter, for headers or a JSON response. */
  meta: ArticleMeta;
  /** The article's source HTML (useful for running the checks). */
  html: string;
}

/** HTML body -> Markdown body, through the KB clean-up rules. */
export function htmlToMarkdown(html: string): string {
  return String(
    unified()
      .use(rehypeParse, { fragment: true })                 // HTML string -> HTML tree (hast)
      .use(rehypeKbArticle)                                 // KB-specific clean-up rules
      .use(rehypeRemark)                                    // HTML tree -> Markdown tree (mdast)
      .use(remarkGfm)                                       // tables, autolinks
      .use(remarkStringify, { bullet: "-", fences: true })  // Markdown tree -> text
      .processSync(html),
  );
}

/**
 * Convert an article API response.
 *
 * @param payload - JSON from /api/web/support/article/{id}.
 * @returns The Markdown document plus its metadata.
 * @throws ArticleNotFoundError if the article is missing or not public.
 * @throws UpstreamFormatError if the response doesn't have the expected shape.
 */
export function convert(payload: unknown): ConvertResult {
  const article = parseArticle(payload);
  assertPublic(article);

  const meta = articleMeta(article);
  const body = htmlToMarkdown(article.Content);
  const attachments = attachmentsSection(article.Attachments);

  const markdown = `${frontMatter(meta)}\n# ${meta.title}\n\n${body}${attachments ? `\n${attachments}` : ""}`;
  return { markdown, meta, html: article.Content };
}

/** Convert an article API response and return just the Markdown. */
export function convertArticle(payload: unknown): string {
  return convert(payload).markdown;
}

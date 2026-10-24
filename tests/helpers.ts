import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { toHtml } from "hast-util-to-html";
import type { Root } from "hast";

/** Parse an HTML fragment, apply one rule, and return the resulting HTML. */
export function applyRule(rule: (tree: Root) => void, html: string): string {
  const tree = unified().use(rehypeParse, { fragment: true }).parse(html) as Root;
  rule(tree);
  return toHtml(tree);
}

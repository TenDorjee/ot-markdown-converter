// Shared helpers for the KB clean-up rules. They work on the HTML tree (hast)
// produced by rehype-parse: every node is an element, a text node or a comment.

import type { Element, ElementContent, Root, Text } from "hast";

/** A node that can have children: the document root or an element. */
export type Parent = Root | Element;

/** Inline formatting tags. */
export const FORMATTING = new Set(["strong", "b", "em", "i", "u"]);

/** Real heading tags. */
export const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** Inline (phrasing) tags: content that belongs inside a paragraph. */
export const PHRASING = new Set([
  "a", "abbr", "b", "br", "cite", "code", "del", "em", "font", "i", "img", "ins",
  "kbd", "mark", "q", "s", "small", "span", "strong", "sub", "sup", "time", "u",
]);

/** Create a text node. */
export const text = (value: string): Text => ({ type: "text", value });

/** Create an element with no attributes. */
export const el = (tagName: string, children: ElementContent[]): Element => ({
  type: "element",
  tagName,
  properties: {},
  children,
});

/** True if the node is an element (optionally with a given tag name). */
export const isElement = (n: ElementContent | undefined, tag?: string): n is Element =>
  n?.type === "element" && (tag === undefined || n.tagName === tag);

/** True if the node is a text node containing only whitespace. */
export const isBlankText = (n: ElementContent | undefined): boolean =>
  n?.type === "text" && n.value.trim() === "";

/** True if the node is inline content (text, comment or a phrasing element). */
export const isPhrasing = (n: ElementContent): boolean =>
  n.type === "text" || n.type === "comment" || (n.type === "element" && PHRASING.has(n.tagName));

/** All text inside a node. */
export function textOf(n: ElementContent | Root): string {
  if (n.type === "text") return n.value;
  if (n.type === "element" || n.type === "root") {
    return (n.children as ElementContent[]).map(textOf).join("");
  }
  return "";
}

/** True if the node contains something visible: text, an image or code. */
export function hasContent(n: ElementContent): boolean {
  if (n.type === "text") return n.value.trim() !== "";
  if (n.type !== "element") return false;
  if (n.tagName === "img" || n.tagName === "code" || n.tagName === "pre") return true;
  return n.children.some(hasContent);
}

/**
 * True if text reads like a short label rather than a sentence.
 *   "1. Disconnect Remote Desktop Without Locking the Session" -> true
 *   "Some of the configuration changes ... policies."          -> false
 * Bold sentences stay bold; only labels become headings.
 */
export function looksLikeLabel(value: string): boolean {
  const t = value.trim();
  return t.length > 0 && t.length <= 100 && !/[.!?]$/.test(t);
}

/** Visit every parent node, children first (post-order). */
export function eachParent(node: Parent, fn: (parent: Parent) => void): void {
  for (const child of node.children) {
    if (child.type === "element") eachParent(child, fn);
  }
  fn(node);
}

/** Replace each child of a parent with zero or more nodes. */
export function mapChildren(parent: Parent, fn: (child: ElementContent) => ElementContent[]): void {
  (parent as Element).children = (parent.children as ElementContent[]).flatMap(fn);
}

/** Remove <br> and blank text at the start and end of a list of nodes. */
export function trimBreaks(nodes: ElementContent[]): ElementContent[] {
  const skip = (n: ElementContent | undefined) => isElement(n, "br") || isBlankText(n);
  let start = 0;
  let end = nodes.length;
  while (start < end && skip(nodes[start])) start++;
  while (end > start && skip(nodes[end - 1])) end--;
  return nodes.slice(start, end);
}

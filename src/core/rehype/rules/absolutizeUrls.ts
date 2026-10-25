// Make image and link URLs absolute, and give images alt text.
//
// Example (article 1770456, a screenshot in the body):
//   HTML:   <img src="/api/web/support/article/attachment/3f2a...?name=image001.png" />
//   Before: ![](/api/web/support/article/attachment/3f2a...?name=image001.png)
//   After:  ![image001.png](https://my.opentext.com/api/web/support/article/attachment/3f2a...?name=image001.png)
//
// The page on my.opentext.com resolves "/api/..." against its own domain, but the
// Markdown is read somewhere else (a chatbot, a docs site, a file), where a relative
// URL points nowhere. Links (<a href="/support/article/...">) have the same problem.
//
// Alt text: the article's own alt, else its title, else the file name from the
// ?name= parameter, else "image". Empty alt hides the image from screen readers and
// from LLMs, which only see the text.

import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { absoluteUrl } from "../../site.js";

/** "...attachment/3f2a?name=image001.png" -> "image001.png" */
function fileName(src: string): string | undefined {
  try {
    const url = new URL(src);
    const name = url.searchParams.get("name") ?? url.pathname.split("/").pop();
    return name ? decodeURIComponent(name) : undefined;
  } catch {
    return undefined;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function absolutizeUrls(tree: Root): void {
  visit(tree, "element", (node: Element) => {
    const props = node.properties;
    if (node.tagName === "a" && typeof props.href === "string") {
      props.href = absoluteUrl(props.href);
    }
    if (node.tagName === "img" && typeof props.src === "string") {
      props.src = absoluteUrl(props.src);
      props.alt = str(props.alt) || str(props.title) || fileName(props.src) || "image";
    }
  });
}

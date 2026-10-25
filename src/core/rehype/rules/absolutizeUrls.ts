// Make image and link URLs absolute, and give images alt text.
//
// Example (article 1770456, a screenshot in the body):
//   HTML:   <img src="/api/web/support/article/attachment/042c4248-f739-4fd2-9b28-4f3fb0394fa0"
//                width="984" height="339" class="fr-fil fr-dib" />
//   Before: ![](/api/web/support/article/attachment/042c4248-f739-4fd2-9b28-4f3fb0394fa0)
//   After:  ![image](https://my.opentext.com/api/web/support/article/attachment/042c4248-f739-4fd2-9b28-4f3fb0394fa0)
//
// The page on my.opentext.com resolves "/api/..." against its own domain, but the
// Markdown is read somewhere else (a chatbot, a docs site, a file), where a relative
// URL points nowhere. Links (<a href="/support/article/...">) have the same problem.
//
// Alt text: the article's own alt, else its title, else a real file name from the
// URL (?name=diagram.png), else "image". Empty alt hides the image from screen readers
// and from LLMs, which only see the text. An attachment ID (042c4248-...) is not used:
// it is noise to a reader, and the URL already carries it.

import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { absoluteUrl } from "../../site.js";

/**
 * A readable file name from an image URL, if it has one.
 *   ".../attachment/ab12?name=diagram.png" -> "diagram.png"
 *   ".../attachment/042c4248-f739-..."      -> undefined (an ID, not a name)
 */
function fileName(src: string): string | undefined {
  try {
    const url = new URL(src);
    const name = decodeURIComponent(url.searchParams.get("name") ?? url.pathname.split("/").pop() ?? "");
    return /\.[a-z0-9]{2,5}$/i.test(name) ? name : undefined;
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

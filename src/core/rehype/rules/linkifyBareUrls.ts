// Turn URLs written as plain text into links.
//
// Example (article 2310451):
//   HTML:   ...it can be found at http://www.suse.com/licensing/eula/. <br />
//   Before: ...it can be found at http\://www\.suse.com/licensing/eula/.
//   After:  ...it can be found at <http://www.suse.com/licensing/eula/>.
//
// Without this, the Markdown writer escapes the URL so it isn't auto-linked.
// Trailing punctuation (the final "." above) stays outside the link.
// Text inside <a>, <code> and <pre> is left alone.

import type { ElementContent, Root } from "hast";
import { el, mapChildren, text } from "../utils.js";
import type { Parent } from "../utils.js";

export function linkifyBareUrls(node: Parent | Root): void {
  if (node.type === "element" && ["a", "code", "pre"].includes(node.tagName)) return;
  mapChildren(node, (c) => {
    if (c.type === "element") {
      linkifyBareUrls(c);
      return [c];
    }
    if (c.type !== "text") return [c];

    const out: ElementContent[] = [];
    let last = 0;
    for (const m of c.value.matchAll(/https?:\/\/[^\s<>"']+/g)) {
      const url = m[0].replace(/[.,;:!?)\]]+$/, "");
      const at = m.index;
      if (at > last) out.push(text(c.value.slice(last, at)));
      out.push({ ...el("a", [text(url)]), properties: { href: url } });
      last = at + url.length;
    }
    if (last === 0) return [c];
    if (last < c.value.length) out.push(text(c.value.slice(last)));
    return out;
  });
}

// Remove bold/italic/underline inside headings: a heading is already emphasised.
//
// Example (article 1986936):
//   HTML:   <h2 style="text-align:center"><u><strong>Disclaimer</strong></u></h2>
//   Before: ## ***Disclaimer***
//   After:  ## Disclaimer

import type { ElementContent, Root } from "hast";
import { FORMATTING, HEADINGS, eachParent, isElement } from "../utils.js";

const strip = (nodes: ElementContent[]): ElementContent[] =>
  nodes.flatMap((n) => (isElement(n) && FORMATTING.has(n.tagName) ? strip(n.children) : [n]));

export function unwrapHeadingFormatting(tree: Root): void {
  eachParent(tree, (parent) => {
    if (parent.type === "element" && HEADINGS.has(parent.tagName)) {
      parent.children = strip(parent.children);
    }
  });
}

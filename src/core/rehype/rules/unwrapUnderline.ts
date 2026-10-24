// Remove any remaining <u>. Markdown has no underline, and the default conversion
// turns it into italics, which changes the meaning.
//
// Example (article 1986936, Disclaimer paragraph):
//   HTML:   <p><u><strong>Some of the configuration changes ... policies.</strong></u><br />
//           <u><strong>Review these settings internally ...</strong></u></p>
//   Before: ***Some of the configuration changes ... policies.***\
//           ***Review these settings internally ...***
//   After:  **Some of the configuration changes ... policies.**\
//           **Review these settings internally ...**
//
// Underlined labels were already turned into headings by promotePseudoHeadings.

import type { Root } from "hast";
import { eachParent, isElement, mapChildren } from "../utils.js";

export function unwrapUnderline(tree: Root): void {
  eachParent(tree, (parent) =>
    mapChildren(parent, (c) => (isElement(c, "u") ? c.children : [c])),
  );
}

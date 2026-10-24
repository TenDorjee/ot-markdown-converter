// Unwrap <span> and <font>: styling pasted from Word carries no meaning in Markdown.
//
// Example (article 2310451):
//   HTML:  <span style="font-size:11pt"><span style="font-family:'calibri' , sans-serif">
//            <strong>Additional Information</strong> </span></span>
//   After: <strong>Additional Information</strong>
//
// Removing the wrappers first lets later rules see the content inside them
// (here, the bold label that becomes "## Additional Information").

import type { Root } from "hast";
import { eachParent, isElement, mapChildren } from "../utils.js";

export function unwrapStyling(tree: Root): void {
  eachParent(tree, (parent) =>
    mapChildren(parent, (c) =>
      isElement(c, "span") || isElement(c, "font") ? c.children : [c],
    ),
  );
}

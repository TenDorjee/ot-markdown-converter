// Remove spacer blocks that contain no visible content.
//
// Example (article 1986936):
//   HTML:   ...organizational security guidelines.</p><div>&nbsp;</div><div><strong>5. Virtual ...
//           ...configure the Windows power mode appropriately.</div><br /><div><u>Recommended ...
//           ...</ul><div><br /></div><div><u>Configure Power Mode in Windows 11</u></div>
//   Before: blank lines containing only a non-breaking space, between sections
//   After:  no extra lines

import type { Root } from "hast";
import { eachParent, hasContent, isElement, mapChildren } from "../utils.js";

export function removeEmptyBlocks(tree: Root): void {
  eachParent(tree, (parent) =>
    mapChildren(parent, (c) =>
      (isElement(c, "p") || isElement(c, "div")) && !hasContent(c) ? [] : [c],
    ),
  );
}

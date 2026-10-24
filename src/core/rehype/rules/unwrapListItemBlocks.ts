// Remove a single <p> or <div> wrapped around a list item's content, so lists
// stay "tight" (no blank line between items).
//
// Example (article 1986936):
//   HTML:   <ul><li><p>On your desktop, right-click ...</p></li><li><p>Click the Advanced button.</p></li></ul>
//   Before: - On your desktop, right-click ...
//
//           - Click the Advanced button.
//   After:  - On your desktop, right-click ...
//           - Click the Advanced button.
//
// Also covers <li><div>Open Settings.</div></li> (the Windows 11 power mode list).

import type { Root } from "hast";
import { eachParent, isBlankText, isElement } from "../utils.js";

export function unwrapListItemBlocks(tree: Root): void {
  eachParent(tree, (parent) => {
    if (parent.type !== "element" || parent.tagName !== "li") return;
    const meaningful = parent.children.filter((k) => !isBlankText(k));
    const only = meaningful[0];
    if (meaningful.length === 1 && (isElement(only, "p") || isElement(only, "div"))) {
      parent.children = only.children;
    }
  });
}

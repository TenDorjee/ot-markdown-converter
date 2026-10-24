// Replace non-breaking spaces (U+00A0, &nbsp;) with normal spaces, outside code.
//
// Example (article 1986936):
//   HTML:      Locate the<strong>&nbsp;</strong>ID of your active session
//   Markdown before:  Locate th&#x65;**&#xA0;**&#x49;D of your active session
//
// A non-breaking space looks like a space but isn't whitespace to the Markdown
// writer, so it gets encoded as &#xA0; and breaks the surrounding words.
// Converting it first lets fixFormattingWhitespace treat it as a normal space.

import type { Root } from "hast";
import type { Parent } from "../utils.js";

export function normalizeSpaces(node: Parent | Root, inCode = false): void {
  for (const c of node.children) {
    if (c.type === "text" && !inCode) c.value = c.value.replace(/ /g, " ");
    if (c.type === "element") {
      normalizeSpaces(c, inCode || c.tagName === "pre" || c.tagName === "code");
    }
  }
}

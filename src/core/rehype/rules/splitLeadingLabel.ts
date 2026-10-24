// Split a bold/underlined label followed by a line break into its own paragraph,
// so promotePseudoHeadings can turn it into a heading.
//
// Example (article 1986936, step 2):
//   HTML:   <p><strong>2. Power & Lock Screen Settings</strong><br />Ensure the system is ...</p>
//   Before: **2. Power & Lock Screen Settings**\
//           Ensure the system is ...
//   After:  <p><strong>2. Power & Lock Screen Settings</strong></p><p>Ensure the system is ...</p>
//           -> ### 2. Power & Lock Screen Settings   (same level as steps 1 and 3-9)
//
// Example (article 2310451):
//   HTML:   <strong>Situation</strong><br />Is installing other software ... supported?
//   After:  ## Situation
//
//           Is installing other software ... supported?
//
// Bold sentences are not split (see looksLikeLabel), e.g. the 1986936 Disclaimer:
//   <p><u><strong>Some of the configuration changes ... policies.</strong></u><br />...</p>

import type { Root } from "hast";
import {
  FORMATTING, eachParent, el, hasContent, isBlankText, isElement, looksLikeLabel,
  mapChildren, textOf, trimBreaks,
} from "../utils.js";

export function splitLeadingLabel(tree: Root): void {
  eachParent(tree, (parent) =>
    mapChildren(parent, (c) => {
      if (!isElement(c, "p")) return [c];
      const kids = c.children;
      const labelAt = kids.findIndex((k) => !isBlankText(k));
      const label = kids[labelAt];
      if (!isElement(label) || !FORMATTING.has(label.tagName)) return [c];
      if (!looksLikeLabel(textOf(label))) return [c];

      let i = labelAt + 1;
      while (i < kids.length && isBlankText(kids[i])) i++;
      if (!isElement(kids[i], "br")) return [c];

      const rest = trimBreaks(kids.slice(i));
      return rest.some(hasContent) ? [el("p", [label]), el("p", rest)] : [c];
    }),
  );
}

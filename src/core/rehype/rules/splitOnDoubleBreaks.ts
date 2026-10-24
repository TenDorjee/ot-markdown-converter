// Split a paragraph at <br><br>: authors use a double line break as a paragraph break.
// A single <br> stays a line break.
//
// Example (article 1986936, Cause section):
//   HTML:   <p>... resulting in test step failures.<br />To support remote ...<br /><br />
//           This mechanism depends on the Polling feature ...</p>
//   Before: ... resulting in test step failures.\
//           To support remote ...\
//           \
//           This mechanism depends on the Polling feature ...
//   After:  ... resulting in test step failures.\
//           To support remote ...
//
//           This mechanism depends on the Polling feature ...
//
// Leading and trailing <br> inside a paragraph are removed.

import type { ElementContent, Root } from "hast";
import { eachParent, el, hasContent, isBlankText, isElement, mapChildren, trimBreaks } from "../utils.js";

export function splitOnDoubleBreaks(tree: Root): void {
  eachParent(tree, (parent) =>
    mapChildren(parent, (c) => {
      if (!isElement(c, "p")) return [c];

      const paragraphs: ElementContent[][] = [[]];
      let pending: ElementContent[] = []; // <br>s (and blank text) not yet placed
      const breaks = () => pending.filter((k) => isElement(k, "br")).length;

      for (const k of c.children) {
        if (isElement(k, "br") || (isBlankText(k) && pending.length)) {
          pending.push(k);
          continue;
        }
        if (breaks() >= 2) paragraphs.push([]);
        else paragraphs[paragraphs.length - 1]!.push(...pending);
        pending = [];
        paragraphs[paragraphs.length - 1]!.push(k);
      }

      return paragraphs
        .map(trimBreaks)
        .filter((p) => p.some(hasContent))
        .map((p) => el("p", p));
    }),
  );
}

// Simplify nested and repeated bold/italic so Markdown doesn't get *** runs.
//
// 1. Bold inside bold, italic inside italic -> one level (article 2341059):
//      HTML:   <em><strong><strong>Note</strong>:</strong></em>
//      Before: *****Note**:***
//
// 2. Italic wrapping only bold -> bold (bold-italic adds nothing for a reader):
//      HTML:   <em><strong>To obtain a copy ... Opentext Support.</strong></em>
//      Before: ***To obtain a copy ... Opentext Support.***
//      After:  **To obtain a copy ... Opentext Support.**
//
// 3. Neighbouring bold tags (only a space between) -> one tag (article 2341059):
//      HTML:   <strong>(Last update:</strong><strong> 16th October 2026</strong>)
//      Before: **(Last update:** **16th October 2026**)
//      After:  **(Last update: 16th October 2026**)
//
// Runs after fixFormattingWhitespace, which moves the leading space in case 3 outside
// the second tag; that single space is kept inside the merged tag.

import type { Element, ElementContent, Root } from "hast";
import { eachParent, isBlankText, isElement, mapChildren } from "../utils.js";

const BOLD = new Set(["strong", "b"]);
const ITALIC = new Set(["em", "i"]);

const kind = (n: ElementContent | undefined): "bold" | "italic" | undefined =>
  isElement(n) ? (BOLD.has(n.tagName) ? "bold" : ITALIC.has(n.tagName) ? "italic" : undefined) : undefined;

/** Remove formatting of the given kind anywhere inside these nodes. */
function unwrapKind(nodes: ElementContent[], k: "bold" | "italic"): ElementContent[] {
  return nodes.flatMap((n) => {
    if (!isElement(n)) return [n];
    n.children = unwrapKind(n.children, k);
    return kind(n) === k ? n.children : [n];
  });
}

export function simplifyNestedFormatting(tree: Root): void {
  eachParent(tree, (parent) => {
    // Cases 1 and 2.
    mapChildren(parent, (c) => {
      const k = kind(c);
      if (!k || !isElement(c)) return [c];
      c.children = unwrapKind(c.children, k);
      const meaningful = c.children.filter((n) => !isBlankText(n));
      const only = meaningful[0];
      if (k === "italic" && meaningful.length === 1 && kind(only) === "bold") return [only as Element];
      return [c];
    });

    // Case 3: merge bold + (optional single space) + bold.
    const out: ElementContent[] = [];
    const kids = parent.children as ElementContent[];
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i]!;
      const prev = out[out.length - 1];
      const gap = kids[i + 1] !== undefined && isBlankText(c) ? c : undefined;
      const next = gap ? kids[i + 1] : c;
      if (prev && kind(prev) === "bold" && kind(next) === "bold" && isElement(prev) && isElement(next)) {
        if (gap) prev.children.push(gap);
        prev.children.push(...next.children);
        if (gap) i++; // skip the bold we just merged
        continue;
      }
      out.push(c);
    }
    (parent as Element).children = out;
  });
}

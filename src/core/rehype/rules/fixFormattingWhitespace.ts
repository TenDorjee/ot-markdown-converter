// Fix whitespace in bold/italic/underline tags.
//
// 1. Tag containing only whitespace -> a plain space (article 1986936):
//      HTML:   Locate the<strong> </strong>ID
//      Before: Locate th&#x65;**&#xA0;**&#x49;D
//      After:  Locate the ID
//
// 2. Space at the start or end of the tag -> moved outside it (article 2310451):
//      HTML:   <strong>Resolution </strong>
//      Before: **Resolution&#xA0;**     (a closing ** after a space isn't valid Markdown)
//      After:  **Resolution**
//
// Runs after normalizeSpaces, so &nbsp; is already a normal space.

import type { ElementContent, Root } from "hast";
import { FORMATTING, eachParent, hasContent, isElement, mapChildren, text, textOf } from "../utils.js";

export function fixFormattingWhitespace(tree: Root): void {
  eachParent(tree, (parent) =>
    mapChildren(parent, (c) => {
      if (!isElement(c) || !FORMATTING.has(c.tagName)) return [c];
      if (!hasContent(c)) return textOf(c) ? [text(" ")] : [];

      const out: ElementContent[] = [c];
      const first = c.children[0];
      if (first?.type === "text" && /^\s/.test(first.value)) {
        first.value = first.value.trimStart();
        out.unshift(text(" "));
      }
      const last = c.children[c.children.length - 1];
      if (last?.type === "text" && /\s$/.test(last.value)) {
        last.value = last.value.trimEnd();
        out.push(text(" "));
      }
      return out;
    }),
  );
}

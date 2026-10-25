// Turn paragraphs that are numbered by hand into a real ordered list.
//
// Example (article 1770456, mitigation steps):
//   HTML:   <p>1. Stop the AutoPass License Server service.</p>
//           <p>2. Back up the WEB-INF\lib folder.</p>
//           <p>3. Start the service.</p>
//   Before: 1\. Stop the AutoPass License Server service.
//
//           2\. Back up the WEB-INF\lib folder.
//   After:  1. Stop the AutoPass License Server service.
//           2. Back up the WEB-INF\lib folder.
//           3. Start the service.
//
// The Markdown writer escapes "1." at the start of a paragraph (1\.) so it isn't
// read as a list, which is exactly what the author meant it to be.
//
// Only runs of 2+ paragraphs numbered in sequence (1, 2, 3 ...) are converted. A run
// may start above 1 when something (a code block, a note) sits between steps; the
// list then keeps its number (<ol start="3">). Bold or underlined numbered lines are
// section labels, not steps; promotePseudoHeadings makes those headings
// ("1. Disconnect Remote Desktop Without Locking the Session" in 2310451).

import type { Element, ElementContent, Root } from "hast";
import { FORMATTING, eachParent, isBlankText, isElement, textOf } from "../utils.js";

const STEP = /^\s*(\d{1,3})[.)]\s+/;

/** The step number of a paragraph like "<p>2. Back up ...</p>", or undefined. */
function stepNumber(n: ElementContent): number | undefined {
  if (!isElement(n, "p")) return undefined;
  const first = n.children.find((c) => !isBlankText(c));
  if (first?.type !== "text") return undefined; // starts with <strong>/<u>: a label
  const m = STEP.exec(textOf(n));
  return m ? Number(m[1]) : undefined;
}

/** Drop the "2. " prefix from the paragraph's first text node. */
function stripNumber(p: Element): ElementContent[] {
  const children = [...p.children];
  const i = children.findIndex((c) => !isBlankText(c));
  const first = children[i];
  if (first?.type === "text") children[i] = { ...first, value: first.value.replace(STEP, "") };
  return children;
}

export function numberedParagraphsToList(tree: Root): void {
  eachParent(tree, (parent) => {
    if (parent.type === "element" && (parent.tagName === "li" || FORMATTING.has(parent.tagName))) return;
    const out: ElementContent[] = [];
    const kids = parent.children as ElementContent[];
    let i = 0;
    while (i < kids.length) {
      const start = stepNumber(kids[i]!);
      if (start === undefined) {
        out.push(kids[i]!);
        i++;
        continue;
      }
      // Collect the run: same-numbered sequence, skipping whitespace between paragraphs.
      const steps: Element[] = [kids[i] as Element];
      let j = i + 1;
      let expected = start + 1;
      while (j < kids.length) {
        if (isBlankText(kids[j])) { j++; continue; }
        if (stepNumber(kids[j]!) !== expected) break;
        steps.push(kids[j] as Element);
        expected++;
        j++;
      }
      if (steps.length < 2) {
        out.push(kids[i]!);
        i++;
        continue;
      }
      const items = steps.map<Element>((p) => ({ type: "element", tagName: "li", properties: {}, children: stripNumber(p) }));
      out.push({ type: "element", tagName: "ol", properties: start === 1 ? {} : { start }, children: items });
      i = j;
    }
    (parent as Element).children = out;
  });
}

// Turn steps that are numbered by hand into a real ordered list.
//
// Example (article 1770456, "For Windows" mitigation). Step 1 is a real list, but
// the author typed the other numbers into <div>s, with screenshots in between:
//   HTML:   <ol><li>Stop the APLS service. ... Refer below image for reference</li></ol>
//           <div><img src="/api/.../042c4248-..." /></div>
//           <div>     2. Navigate to lib folder under APLS installation folder, (...)</div>
//           <div>     3. Backup and remove three jar files ...</div>
//           <img src="/api/.../81e31b14-..." />
//           <div>     4. Download and extract the <b>Log4j_2.17.zip</b> ...</div>
//   Before: 1. Stop the APLS service. ... Refer below image for reference
//
//           ![...](...)
//
//           2\. Navigate to lib folder under APLS installation folder, (...)
//
//           3\. Backup and remove three jar files ...
//   After:  1. Stop the APLS service. ... Refer below image for reference\
//              ![image](...)
//           2. Navigate to lib folder under APLS installation folder, (...)
//           3. Backup and remove three jar files ...\
//              ![image](...)
//           4. Download and extract the **Log4j_2.17.zip** ...
//
// The Markdown writer escapes "2." at the start of a paragraph (2\.) so it isn't
// read as a list, which is exactly what the author meant it to be.
//
// What counts as a step: a <p>, or a <div> holding only inline content, whose text
// starts with "2." or "2)". It is added to a list when:
//   - it continues the list just before it (a real <ol> or one built here), or
//   - it starts a run of 2+ steps numbered in sequence (1, 2, 3 ...), or
//   - it is a lone step that resumes the previous list after a note
//     (1770456: "1) Stop" "2) In Windows:" <notes> "3) start the service").
// A screenshot between two steps belongs to the step before it.
//
// Not converted: bold numbers ("<strong>2.</strong> Navigate ...") are often section
// labels, which promotePseudoHeadings makes headings ("1. Disconnect Remote Desktop
// Without Locking the Session" in 2310451). Steps joined by <br> inside one paragraph
// are left as lines; splitting them would mean guessing where each step ends.

import type { Element, ElementContent, Root } from "hast";
import { FORMATTING, el, eachParent, isBlankText, isElement, isPhrasing, textOf, trimBreaks } from "../utils.js";

const STEP = /^\s*(\d{1,3})[.)]\s+/;

/** A <p>, or a <div> with only inline content: a block that could be one step. */
const isStepBlock = (n: ElementContent): n is Element =>
  n.type === "element" && (n.tagName === "p" || (n.tagName === "div" && n.children.every(isPhrasing)));

/** The step number of a block like "<div>2. Navigate ...</div>", or undefined. */
function stepNumber(n: ElementContent | undefined): number | undefined {
  if (!n || !isStepBlock(n)) return undefined;
  const first = n.children.find((c) => !isBlankText(c));
  if (first?.type !== "text") return undefined; // starts with <strong>/<u>: a label
  const m = STEP.exec(textOf(n));
  return m ? Number(m[1]) : undefined;
}

/** True for an <img>, or a block holding only images and line breaks. */
function isImageOnly(n: ElementContent): boolean {
  if (n.type !== "element") return false;
  if (n.tagName === "img") return true;
  if (n.tagName !== "p" && n.tagName !== "div") return false;
  return n.children.some((c) => isElement(c, "img")) &&
    n.children.every((c) => isElement(c, "img") || isElement(c, "br") || isBlankText(c));
}

/** The images in an image-only node. */
const imagesOf = (n: Element): ElementContent[] =>
  n.tagName === "img" ? [n] : n.children.filter((c) => isElement(c, "img"));

/** The number the next item of a list would have: <ol start="2"> with 3 items -> 5. */
const nextNumber = (ol: Element): number =>
  Number(ol.properties.start ?? 1) + ol.children.filter((c) => isElement(c, "li")).length;

/** A list item from a step block, without its "2. " prefix. */
function toItem(block: Element): Element {
  const children = [...block.children];
  const i = children.findIndex((c) => !isBlankText(c));
  const first = children[i];
  if (first?.type === "text") children[i] = { ...first, value: first.value.replace(STEP, "") };
  return el("li", trimBreaks(children));
}

export function numberedParagraphsToList(tree: Root): void {
  eachParent(tree, (parent) => {
    if (parent.type === "element" && (parent.tagName === "li" || FORMATTING.has(parent.tagName))) return;
    const kids = parent.children as ElementContent[];

    /** The step number of the next block after kids[i], skipping blanks and screenshots. */
    const followingStep = (i: number): number | undefined => {
      let j = i + 1;
      while (j < kids.length && (isBlankText(kids[j]) || isImageOnly(kids[j]!))) j++;
      return stepNumber(kids[j]);
    };

    const out: ElementContent[] = [];
    let open: Element | undefined; // the list currently accepting steps
    let next = 0; // the number its next step must have
    let lastEnded: number | undefined; // the number the previous list stopped before
    const close = () => {
      if (open) lastEnded = next;
      open = undefined;
    };

    kids.forEach((k, i) => {
      if (isBlankText(k)) {
        if (!open) out.push(k); // whitespace between steps would land after the list
        return;
      }
      if (k.type === "element" && k.tagName === "ol") { // a real list: later hand-numbered steps may continue it
        close();
        open = k;
        next = nextNumber(k);
        out.push(k);
        return;
      }

      const n = stepNumber(k);
      if (n !== undefined && k.type === "element") { // stepNumber only matches step blocks
        if (open && n === next) {
          open.children.push(toItem(k));
          next++;
          return;
        }
        if (followingStep(i) === n + 1 || (n > 1 && n === lastEnded)) {
          close();
          open = { ...el("ol", [toItem(k)]), properties: n === 1 ? {} : { start: n } };
          next = n + 1;
          out.push(open);
          return;
        }
      } else if (open && k.type === "element" && isImageOnly(k) && followingStep(i) === next) {
        // A screenshot between two steps: keep it with the step it illustrates.
        const item = open.children.filter((c) => isElement(c, "li")).at(-1) as Element | undefined;
        if (item) {
          item.children.push(el("br", []), ...imagesOf(k));
          return;
        }
      }

      close();
      out.push(k);
    });

    (parent as Element).children = out;
  });
}

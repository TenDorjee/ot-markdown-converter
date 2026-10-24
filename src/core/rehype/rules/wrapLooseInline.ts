// Group inline content that sits directly in the body (or in a <div> next to block
// elements) into <p> elements, so the following rules can work on paragraphs.
//
// Example (article 2310451, which has almost no <p> tags):
//   HTML:  </pre><br /><strong>Environment</strong> <br />Advanced Authentication<br />
//          AA 6.x (AAF server) based on SLES 12 or SLES 15 Appliance<br /><br />
//          <strong>Situation</strong><br />Is installing other software ... supported?<br /><br /><div>...
//   After: <p><br /><strong>Environment</strong> <br />Advanced Authentication<br />...</p><div>...
//
// Runs of only whitespace or <br> are dropped (article 1986936 has a stray
// <br /> between </div> and <div>, which otherwise became an empty line).

import type { Element, ElementContent, Root } from "hast";
import { eachParent, el, hasContent, isPhrasing } from "../utils.js";

export function wrapLooseInline(tree: Root): void {
  eachParent(tree, (parent) => {
    const isContainer = parent.type === "root" || parent.tagName === "div";
    const children = parent.children as ElementContent[];
    if (!isContainer || children.every(isPhrasing)) return;

    const out: ElementContent[] = [];
    let run: ElementContent[] = [];
    const flush = () => {
      if (run.some(hasContent)) out.push(el("p", run));
      run = [];
    };
    for (const c of children) {
      if (isPhrasing(c)) {
        run.push(c);
      } else {
        flush();
        out.push(c);
      }
    }
    flush();
    (parent as Element).children = out;
  });
}

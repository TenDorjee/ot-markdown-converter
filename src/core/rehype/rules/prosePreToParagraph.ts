// Turn <pre> that holds ordinary prose into a paragraph.
//
// Example (article 1986936, and every sample's Summary):
//   HTML:   <h2>Summary</h2><pre>This article outlines best practices and ...</pre>
//   Before: ## Summary
//           ```
//           This article outlines best practices and ...
//           ```
//   After:  ## Summary
//
//           This article outlines best practices and ...
//
// Real code in these articles is always <pre><code>...</code></pre>, e.g.
//   <pre style="background:#efefef;..."><code>echo %SESSIONNAME%</code></pre>
// so a <pre> without <code> inside is treated as prose. Newlines become <br>.

import type { ElementContent, Root } from "hast";
import { eachParent, el, isElement, mapChildren, text } from "../utils.js";

export function prosePreToParagraph(tree: Root): void {
  eachParent(tree, (parent) =>
    mapChildren(parent, (c) => {
      if (!isElement(c, "pre") || c.children.some((k) => isElement(k, "code"))) return [c];
      const children = c.children.flatMap((k): ElementContent[] =>
        k.type === "text"
          ? k.value
              .trim()
              .split("\n")
              .flatMap((line, i) => (i ? [el("br", []), text(line)] : [text(line)]))
          : [k],
      );
      return [el("p", children)];
    }),
  );
}

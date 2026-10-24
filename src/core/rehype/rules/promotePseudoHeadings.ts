// Turn paragraphs that contain only a bold or underlined label into real headings,
// nested under the last real heading:
//   bold-only      -> one level below  (h2 -> h3)
//   underline-only -> two levels below (h2 -> h4)
//   standard KB section name (Environment, Resolution, ...) -> h2
//
// Example (article 1986936):
//   HTML:   <h2>Solution</h2>
//           <p><strong>1. Disconnect Remote Desktop Without Locking the Session</strong></p>
//           <p>When you disconnect normally from RDP, ...</p>
//           <p><u>Method 1: Using Command Prompt Directly</u></p>
//   Before: ## Solution
//           **1. Disconnect Remote Desktop Without Locking the Session**
//           *Method 1: Using Command Prompt Directly*
//   After:  ## Solution
//           ### 1. Disconnect Remote Desktop Without Locking the Session
//           #### Method 1: Using Command Prompt Directly
//
// Example (article 2310451, which has no <h2> for its sections):
//   HTML:   <strong>Environment</strong> <br />Advanced Authentication
//   After:  ## Environment
//
// Inline bold/underline inside a sentence, and bold sentences, are left alone.

import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { isBlankText, looksLikeLabel, textOf } from "../utils.js";

const OFFSET: Record<string, number> = { strong: 1, b: 1, u: 2 };

const SECTION_NAMES = new Set([
  "summary", "environment", "situation", "issue", "cause", "resolution",
  "solution", "workaround", "additional information", "disclaimer",
]);

// Some articles wrap labels in <div> instead of <p>, e.g. <div><strong>5. Virtual ...</strong></div>.
const BLOCK_TAGS = new Set(["p", "div"]);

/** The block's only element child, ignoring whitespace-only text. */
function soleChild(node: Element): Element | undefined {
  const meaningful = node.children.filter((c) => !isBlankText(c));
  const [only] = meaningful;
  return meaningful.length === 1 && only?.type === "element" ? only : undefined;
}

export function promotePseudoHeadings(tree: Root): void {
  let lastHeading = 1; // the article title is the h1
  visit(tree, "element", (node: Element) => {
    const real = /^h([1-6])$/.exec(node.tagName);
    if (real) {
      lastHeading = Number(real[1]);
      return;
    }
    if (!BLOCK_TAGS.has(node.tagName)) return;

    const child = soleChild(node);
    const offset = child ? OFFSET[child.tagName] : undefined;
    if (!child || !offset) return;

    const label = textOf(child).trim();
    if (!looksLikeLabel(label)) return;

    if (SECTION_NAMES.has(label.replace(/:$/, "").toLowerCase())) {
      node.tagName = "h2";
      lastHeading = 2; // later labels nest under this section
    } else {
      node.tagName = `h${Math.min(lastHeading + offset, 6)}`;
    }
    node.children = child.children; // drop the <strong>/<u> wrapper
  });
}

// Use a table's first row as its header when the table has no <th>.
//
// Example (article 2341059): the header row is ordinary cells styled bold with CSS:
//   HTML:   <table><tbody><tr><td><span style="font-weight:bold">CM version and patch</span></td>
//           <td>...Latest published hotfix...</td>...</tr><tr><td>CM 23.4</td>...
//   Before: |                      |                         | ...      (empty header)
//           | -------------------- | ----------------------- | ...
//           | CM version and patch | Latest published hotfix | ...
//   After:  | CM version and patch | Latest published hotfix | ...
//           | -------------------- | ----------------------- | ...
//           | CM 23.4              | Hotfix 6                | ...
//
// Markdown tables always have a header row, so without this the converter
// invents an empty one and the column names become a data row.

import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { el, isElement } from "../utils.js";

/** All <tr> rows of a table, whether inside <thead>/<tbody> or not. */
function rows(table: Element): Element[] {
  const found: Element[] = [];
  visit(table, "element", (n: Element) => {
    if (n.tagName === "tr") found.push(n);
  });
  return found;
}

export function promoteTableHeader(tree: Root): void {
  visit(tree, "element", (table: Element) => {
    if (table.tagName !== "table") return;
    let hasHeader = false;
    visit(table, "element", (n: Element) => {
      if (n.tagName === "th" || n.tagName === "thead") hasHeader = true;
    });
    const first = rows(table)[0];
    if (hasHeader || !first) return;

    // Header cells: <td> -> <th>, then move the row into a <thead> at the top.
    for (const cell of first.children) {
      if (isElement(cell, "td")) cell.tagName = "th";
    }
    const removeFrom = (parent: Element) => {
      parent.children = parent.children.filter((c) => c !== first);
      for (const c of parent.children) if (isElement(c)) removeFrom(c);
    };
    removeFrom(table);
    table.children.unshift(el("thead", [first]));
  });
}

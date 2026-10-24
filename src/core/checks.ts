// Checks that run on ANY converted article, with no expected output needed.
//
// Each check is a post-condition: what the output must look like once the clean-up
// rules have run. They inspect the result independently (by parsing the Markdown, or
// comparing it with the source HTML) rather than re-running a rule and trusting it.
// Each check names the rule it backs; when you add a rule, add its check here too.
//
//   error   - the output is wrong (lost text, leftover HTML, garbled characters)
//   warning - worth a look (an HTML tag no rule has seen before)

import { unified } from "unified";
import rehypeParse from "rehype-parse";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import { toHtml } from "hast-util-to-html";
import type { Element, ElementContent, Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import { RULES } from "./rehype/index.js";

export interface Issue {
  check: string;
  severity: "error" | "warning";
  detail: string;
}

/** Share of source words allowed to be missing before text-preserved fails (1%). */
export const MAX_MISSING_WORDS = 0.01;

/** HTML tags seen in real articles and handled by the rules. */
const KNOWN_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "col", "colgroup", "div", "em", "font", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "span", "strong", "sub", "sup",
  "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
]);

const snippet = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 80);
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** All text in an HTML node, with spaces between elements. */
function htmlText(n: ElementContent | HastRoot): string {
  if (n.type === "text") return n.value;
  if (n.type === "element" || n.type === "root") {
    return (n.children as ElementContent[]).map(htmlText).join(" ");
  }
  return "";
}

/** All text in the Markdown tree, with spaces between nodes (toString() glues blocks together). */
function markdownText(tree: MdastRoot): string {
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === "text" || node.type === "inlineCode" || node.type === "code") parts.push(node.value);
  });
  return parts.join(" ");
}

const parseHtml = (html: string) => unified().use(rehypeParse, { fragment: true }).parse(html) as HastRoot;

// ----------------------------------------------------------------------------
// Checks on the Markdown alone
// ----------------------------------------------------------------------------

/** Inspect the converter's Markdown output and return every problem found. */
export function checkMarkdown(md: string): Issue[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md) as MdastRoot;
  const issues: Issue[] = [];
  const error = (check: string, detail: string) => issues.push({ check, severity: "error", detail });

  let h1s = 0;
  let lastDepth = 1;
  visit(tree, (node, _index, parent) => {
    switch (node.type) {
      case "html": // anything the converter couldn't map to Markdown
        error("no-raw-html", snippet(node.value));
        break;

      case "heading": {
        const text = toString(node).trim();
        if (node.depth === 1) h1s++;
        if (!text) error("no-empty-heading", `h${node.depth}`); // promotePseudoHeadings
        if (node.depth > lastDepth + 1) { // promotePseudoHeadings
          error("no-skipped-heading-level", `h${lastDepth} -> h${node.depth}: ${snippet(text)}`);
        }
        if (node.children.some((c) => c.type === "strong" || c.type === "emphasis")) {
          error("no-formatting-in-heading", snippet(text)); // unwrapHeadingFormatting
        }
        lastDepth = node.depth;
        break;
      }

      case "strong":
      case "emphasis": // ***text*** comes from <u><strong> (unwrapUnderline)
        if (node.children.some((c) => c.type === "strong" || c.type === "emphasis")) {
          error("no-nested-emphasis", snippet(toString(node)));
        }
        break;

      case "text":
        if (/[ ​]/.test(node.value)) { // normalizeSpaces
          error("no-special-spaces", snippet(node.value));
        }
        // Link text sits inside a link node, so a URL in plain text is a missed link.
        if (parent?.type !== "link" && /https?:\/\/\S+/.test(node.value)) { // linkifyBareUrls
          error("no-bare-urls", snippet(node.value));
        }
        break;

      case "table": { // promoteTableHeader
        const header = node.children[0];
        if (header && header.children.every((cell) => toString(cell).trim() === "")) {
          error("no-empty-table-header", snippet(toString(node.children[1] ?? node)));
        }
        break;
      }

      case "listItem": // unwrapListItemBlocks
        if (node.spread) error("no-loose-lists", snippet(toString(node)));
        break;
    }
  });

  if (h1s !== 1) error("single-h1", `expected 1 H1 (the title), found ${h1s}`);

  // Whitespace the parser hides, so checked on the raw text.
  md.split("\n").forEach((line, i) => {
    if (/[ \t]+$/.test(line)) error("no-trailing-whitespace", `line ${i + 1}`);
    // A bare URL the writer escaped (http\://) parses as split text, so check the raw line.
    if (/https?\\:/.test(line)) error("no-escaped-urls", `line ${i + 1}: ${snippet(line)}`); // linkifyBareUrls
  });
  if (/\n{3,}/.test(md)) error("no-blank-line-runs", "more than one blank line in a row"); // removeEmptyBlocks

  return issues;
}

// ----------------------------------------------------------------------------
// Checks that compare with the source HTML
// ----------------------------------------------------------------------------

/**
 * Run every check on a converted article.
 * @param html     The article's source HTML (the API's Content field).
 * @param markdown The converter's output.
 */
export function checkConversion(html: string, markdown: string): Issue[] {
  const issues = checkMarkdown(markdown);
  const source = parseHtml(html);
  const md = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdastRoot;

  // Content preservation (not tied to one rule): every source word should survive.
  const outputWords = new Set(words(markdownText(md)));
  const sourceWords = words(htmlText(source));
  const missing = sourceWords.filter((w) => !outputWords.has(w));
  if (missing.length) {
    const share = missing.length / Math.max(sourceWords.length, 1);
    issues.push({
      check: "text-preserved",
      severity: share > MAX_MISSING_WORDS ? "error" : "warning",
      detail: `${missing.length} of ${sourceWords.length} words missing, e.g. "${[...new Set(missing)].slice(0, 5).join('", "')}"`,
    });
  }

  // Every link in the source is still a link in the output.
  const outputUrls = new Set<string>();
  visit(md, "link", (node) => {
    outputUrls.add(node.url);
  });
  visit(source, "element", (node: Element) => {
    const href = node.tagName === "a" ? node.properties?.href : undefined;
    if (typeof href === "string" && /^https?:/.test(href) && !outputUrls.has(href)) {
      issues.push({ check: "links-preserved", severity: "error", detail: href });
    }
  });

  // Every <pre><code> is a code block, and nothing else is (prosePreToParagraph).
  let sourceCode = 0;
  visit(source, "element", (node: Element) => {
    if (node.tagName === "pre" && node.children.some((c) => c.type === "element" && c.tagName === "code")) {
      sourceCode++;
    }
  });
  let outputCode = 0;
  visit(md, "code", () => {
    outputCode++;
  });
  if (outputCode !== sourceCode) {
    issues.push({ check: "code-blocks-preserved", severity: "error",
      detail: `source has ${sourceCode} code block(s), output has ${outputCode}` });
  }

  // Idempotence (not tied to one rule): a second pass of the rules must change nothing.
  // If it does, the first pass left something half-cleaned, usually a rule-order issue.
  const tree = parseHtml(html);
  for (const rule of RULES) rule(tree);
  const once = toHtml(tree);
  for (const rule of RULES) rule(tree);
  if (toHtml(tree) !== once) {
    issues.push({ check: "rules-idempotent", severity: "error",
      detail: "running the rules a second time changed the HTML" });
  }

  // HTML tags no rule has seen: possibly a new article format.
  const unknown = new Set<string>();
  visit(source, "element", (node: Element) => {
    if (!KNOWN_TAGS.has(node.tagName)) unknown.add(node.tagName);
  });
  if (unknown.size) {
    issues.push({ check: "unknown-tags", severity: "warning", detail: `<${[...unknown].join(">, <")}>` });
  }

  return issues;
}

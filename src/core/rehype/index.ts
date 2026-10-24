// rehype plugin that cleans up my.opentext.com KB article HTML before it is
// converted to Markdown. Each rule lives in ./rules with a real example of the
// problem it fixes. The order below matters:
//   1. normalise characters and whitespace first, so later rules see clean text;
//   2. restructure blocks (paragraphs, labels, lists, empty spacers);
//   3. promote labels to headings;
//   4. drop leftover formatting that Markdown can't represent.

import type { Root } from "hast";
import { fixFormattingWhitespace } from "./rules/fixFormattingWhitespace.js";
import { linkifyBareUrls } from "./rules/linkifyBareUrls.js";
import { normalizeSpaces } from "./rules/normalizeSpaces.js";
import { promotePseudoHeadings } from "./rules/promotePseudoHeadings.js";
import { prosePreToParagraph } from "./rules/prosePreToParagraph.js";
import { removeEmptyBlocks } from "./rules/removeEmptyBlocks.js";
import { splitLeadingLabel } from "./rules/splitLeadingLabel.js";
import { splitOnDoubleBreaks } from "./rules/splitOnDoubleBreaks.js";
import { unwrapHeadingFormatting } from "./rules/unwrapHeadingFormatting.js";
import { unwrapListItemBlocks } from "./rules/unwrapListItemBlocks.js";
import { unwrapStyling } from "./rules/unwrapStyling.js";
import { unwrapUnderline } from "./rules/unwrapUnderline.js";
import { wrapLooseInline } from "./rules/wrapLooseInline.js";

/** The rules, in the order they run. */
export const RULES: ReadonlyArray<(tree: Root) => void> = [
  // 1. Characters and whitespace
  unwrapStyling,
  normalizeSpaces,
  fixFormattingWhitespace,
  // 2. Block structure
  prosePreToParagraph,
  wrapLooseInline,
  splitOnDoubleBreaks,
  splitLeadingLabel,
  unwrapListItemBlocks,
  removeEmptyBlocks,
  linkifyBareUrls,
  // 3. Headings
  promotePseudoHeadings,
  // 4. Leftover formatting
  unwrapHeadingFormatting,
  unwrapUnderline,
];

/** rehype plugin: apply every rule to the HTML tree. */
export function rehypeKbArticle() {
  return (tree: Root) => {
    for (const rule of RULES) rule(tree);
  };
}

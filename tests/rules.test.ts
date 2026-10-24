// Layer 1: one test per rule, using the real example documented in each rule file.
// These catch regressions when a rule is edited.

import { describe, expect, it } from "vitest";
import { applyRule } from "./helpers.js";
import { fixFormattingWhitespace } from "../src/core/rehype/rules/fixFormattingWhitespace.js";
import { linkifyBareUrls } from "../src/core/rehype/rules/linkifyBareUrls.js";
import { normalizeSpaces } from "../src/core/rehype/rules/normalizeSpaces.js";
import { promotePseudoHeadings } from "../src/core/rehype/rules/promotePseudoHeadings.js";
import { promoteTableHeader } from "../src/core/rehype/rules/promoteTableHeader.js";
import { prosePreToParagraph } from "../src/core/rehype/rules/prosePreToParagraph.js";
import { removeEmptyBlocks } from "../src/core/rehype/rules/removeEmptyBlocks.js";
import { simplifyNestedFormatting } from "../src/core/rehype/rules/simplifyNestedFormatting.js";
import { splitLeadingLabel } from "../src/core/rehype/rules/splitLeadingLabel.js";
import { splitOnDoubleBreaks } from "../src/core/rehype/rules/splitOnDoubleBreaks.js";
import { unwrapHeadingFormatting } from "../src/core/rehype/rules/unwrapHeadingFormatting.js";
import { unwrapListItemBlocks } from "../src/core/rehype/rules/unwrapListItemBlocks.js";
import { unwrapStyling } from "../src/core/rehype/rules/unwrapStyling.js";
import { unwrapUnderline } from "../src/core/rehype/rules/unwrapUnderline.js";
import { wrapLooseInline } from "../src/core/rehype/rules/wrapLooseInline.js";

describe("unwrapStyling", () => {
  it("removes Word-pasted spans and keeps their content (2310451)", () => {
    expect(applyRule(unwrapStyling,
      `<span style="font-size:11pt"><span style="font-family:'calibri'"><strong>Additional Information</strong></span></span>`,
    )).toBe("<strong>Additional Information</strong>");
  });
});

describe("normalizeSpaces", () => {
  it("turns &nbsp; into a normal space (1986936)", () => {
    expect(applyRule(normalizeSpaces, "<p>Locate the<strong>&nbsp;</strong>ID</p>"))
      .toBe("<p>Locate the<strong> </strong>ID</p>");
  });
  it("does not touch code", () => {
    expect(applyRule(normalizeSpaces, "<pre><code>a&nbsp;b</code></pre>"))
      .toBe("<pre><code>a\u00a0b</code></pre>"); // non-breaking space kept in code
  });
});

describe("fixFormattingWhitespace", () => {
  it("replaces a whitespace-only bold tag with a space (1986936)", () => {
    expect(applyRule(fixFormattingWhitespace, "<p>Locate the<strong> </strong>ID</p>"))
      .toBe("<p>Locate the ID</p>");
  });
  it("moves a trailing space out of bold (2310451)", () => {
    expect(applyRule(fixFormattingWhitespace, "<p><strong>Resolution </strong>While it is possible</p>"))
      .toBe("<p><strong>Resolution</strong> While it is possible</p>");
  });
});

describe("prosePreToParagraph", () => {
  it("turns prose <pre> into a paragraph (1986936 Summary)", () => {
    expect(applyRule(prosePreToParagraph, "<h2>Summary</h2><pre>This article outlines best practices.</pre>"))
      .toBe("<h2>Summary</h2><p>This article outlines best practices.</p>");
  });
  it("keeps <pre><code> as code", () => {
    expect(applyRule(prosePreToParagraph, "<pre><code>echo %SESSIONNAME%</code></pre>"))
      .toBe("<pre><code>echo %SESSIONNAME%</code></pre>");
  });
});

describe("wrapLooseInline", () => {
  it("wraps inline content next to blocks in a paragraph and drops stray <br> (2310451)", () => {
    expect(applyRule(wrapLooseInline,
      "<pre>x</pre><br /><strong>Environment</strong> <br />Advanced Authentication<div>Customers</div><br />",
    )).toBe("<pre>x</pre><p><br><strong>Environment</strong> <br>Advanced Authentication</p><div>Customers</div>");
  });
});

describe("splitOnDoubleBreaks", () => {
  it("splits at <br><br> and keeps single <br> (1986936 Cause)", () => {
    expect(applyRule(splitOnDoubleBreaks,
      "<p>test step failures.<br />To support remote.<br /><br />This mechanism.</p>",
    )).toBe("<p>test step failures.<br>To support remote.</p><p>This mechanism.</p>");
  });
});

describe("splitLeadingLabel", () => {
  it("splits a bold label from the text after it (1986936 step 2)", () => {
    expect(applyRule(splitLeadingLabel,
      "<p><strong>2. Power &amp; Lock Screen Settings</strong><br />Ensure the system is configured.</p>",
    )).toBe("<p><strong>2. Power &#x26; Lock Screen Settings</strong></p><p>Ensure the system is configured.</p>");
  });
  it("does not split bold sentences (1986936 Disclaimer)", () => {
    const html = "<p><u><strong>Some of the configuration changes are recommended.</strong></u><br><u><strong>Review these settings.</strong></u></p>";
    expect(applyRule(splitLeadingLabel, html)).toBe(html);
  });
});

describe("unwrapListItemBlocks", () => {
  it("unwraps a single <p> or <div> in a list item, but not several (1986936)", () => {
    expect(applyRule(unwrapListItemBlocks,
      "<ul><li><p>On your desktop, right-click.</p></li><li><div>Open Settings.</div></li><li><p>a</p><p>b</p></li></ul>",
    )).toBe("<ul><li>On your desktop, right-click.</li><li>Open Settings.</li><li><p>a</p><p>b</p></li></ul>");
  });
});

describe("removeEmptyBlocks", () => {
  it("removes spacer blocks and keeps real ones (1986936)", () => {
    expect(applyRule(removeEmptyBlocks,
      "<p>guidelines.</p><div> </div><div><br /></div><p></p><div><strong>5. Virtual</strong></div>",
    )).toBe("<p>guidelines.</p><div><strong>5. Virtual</strong></div>");
  });
});

describe("linkifyBareUrls", () => {
  it("links a bare URL and leaves the trailing period outside (2310451)", () => {
    expect(applyRule(linkifyBareUrls, "<p>it can be found at http://www.suse.com/licensing/eula/. More</p>"))
      .toBe('<p>it can be found at <a href="http://www.suse.com/licensing/eula/">http://www.suse.com/licensing/eula/</a>. More</p>');
  });
  it("leaves existing links and code alone", () => {
    const html = '<p><a href="https://x.com">https://x.com</a></p><pre><code>curl http://a.b</code></pre>';
    expect(applyRule(linkifyBareUrls, html)).toBe(html);
  });
});

describe("promotePseudoHeadings", () => {
  it("nests bold and underline labels under the last heading (1986936)", () => {
    expect(applyRule(promotePseudoHeadings,
      "<h2>Solution</h2><p><strong>1. Disconnect Remote Desktop</strong></p><p>When you disconnect.</p>" +
        "<p><u>Method 1: Using Command Prompt</u></p><p>See <u>this</u> and <strong>that</strong>.</p>",
    )).toBe(
      "<h2>Solution</h2><h3>1. Disconnect Remote Desktop</h3><p>When you disconnect.</p>" +
        "<h4>Method 1: Using Command Prompt</h4><p>See <u>this</u> and <strong>that</strong>.</p>",
    );
  });
  it("makes standard section names h2 and never skips a level (2310451)", () => {
    expect(applyRule(promotePseudoHeadings,
      "<h2>Summary</h2><p><strong>Environment</strong></p><p>Advanced Authentication</p>" +
        "<p><strong>Resolution</strong></p><div><u>Important Considerations</u></div>",
    )).toBe(
      "<h2>Summary</h2><h2>Environment</h2><p>Advanced Authentication</p>" +
        "<h2>Resolution</h2><h3>Important Considerations</h3>",
    );
  });
  it("leaves bold sentences as paragraphs (1986936 Disclaimer)", () => {
    const html = "<p><u><strong>Some of the configuration changes are recommended.</strong></u></p>";
    expect(applyRule(promotePseudoHeadings, html)).toBe(html);
  });
});

describe("unwrapHeadingFormatting", () => {
  it("removes bold and underline inside headings (1986936)", () => {
    expect(applyRule(unwrapHeadingFormatting, '<h2 style="text-align:center"><u><strong>Disclaimer</strong></u></h2>'))
      .toBe('<h2 style="text-align:center">Disclaimer</h2>');
  });
});

describe("unwrapUnderline", () => {
  it("removes <u> but keeps bold (1986936 Disclaimer)", () => {
    expect(applyRule(unwrapUnderline, "<p><u><strong>Some of the configuration changes.</strong></u></p>"))
      .toBe("<p><strong>Some of the configuration changes.</strong></p>");
  });
  it("unwraps <u> inside sentences", () => {
    expect(applyRule(unwrapUnderline, "<p>it is <u>required</u></p>")).toBe("<p>it is required</p>");
  });
});

describe("simplifyNestedFormatting", () => {
  it("flattens bold inside bold inside italic (2341059)", () => {
    expect(applyRule(simplifyNestedFormatting, "<p><em><strong><strong>Note</strong>:</strong></em></p>"))
      .toBe("<p><strong>Note:</strong></p>");
  });
  it("merges neighbouring bold tags (2341059)", () => {
    expect(applyRule(simplifyNestedFormatting, "<p><strong>(Last update:</strong> <strong>16th October 2026</strong>)</p>"))
      .toBe("<p><strong>(Last update: 16th October 2026</strong>)</p>");
  });
  it("keeps italic that has text of its own", () => {
    const html = "<p>Hotfixes are <em>cumulative</em>, <strong>Note</strong></p>";
    expect(applyRule(simplifyNestedFormatting, html)).toBe(html);
  });
});

describe("promoteTableHeader", () => {
  it("uses the first row as the header when there is no <th> (2341059)", () => {
    expect(applyRule(promoteTableHeader,
      "<table><tbody><tr><td>CM version and patch</td><td>Latest published hotfix</td></tr>" +
        "<tr><td>CM 23.4</td><td>Hotfix 6</td></tr></tbody></table>",
    )).toBe(
      "<table><thead><tr><th>CM version and patch</th><th>Latest published hotfix</th></tr></thead>" +
        "<tbody><tr><td>CM 23.4</td><td>Hotfix 6</td></tr></tbody></table>",
    );
  });
  it("leaves tables that already have a header alone", () => {
    const html = "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>";
    expect(applyRule(promoteTableHeader, html)).toBe(html);
  });
});

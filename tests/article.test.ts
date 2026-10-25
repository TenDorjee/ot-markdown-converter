// Validation, access control and front matter (src/core/schema.ts, convert.ts, frontmatter.ts).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convert } from "../src/core/convert.js";
import { ArticleNotFoundError, UpstreamFormatError } from "../src/core/errors.js";
import { articleMeta, isoDate } from "../src/core/frontmatter.js";
import { parseArticle } from "../src/core/schema.js";
import { checkConversion, checkMarkdown } from "../src/core/checks.js";

const fixture = (id: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", `${id}.json`), "utf-8"));

/** A real fixture with some response fields replaced. */
const withResponse = (changes: Record<string, unknown>) => {
  const payload = fixture("1986936");
  payload.response = { ...payload.response, ...changes };
  return payload;
};

describe("parseArticle", () => {
  it("reports a missing article as not found", () => {
    expect(() => parseArticle({ status: 404, success: false, response: null })).toThrow(ArticleNotFoundError);
  });
  it("reports an unexpected shape as an upstream format error, naming the field", () => {
    expect(() => parseArticle(withResponse({ Content: 42 }))).toThrow(/response\.Content/);
    expect(() => parseArticle(withResponse({ Content: 42 }))).toThrow(UpstreamFormatError);
    expect(() => parseArticle("not json")).toThrow(UpstreamFormatError);
  });
  it("accepts Products as a single object", () => {
    const article = parseArticle(withResponse({ Products: { DisplayLabel: "UFT One", versions: [] } }));
    expect(article.Products).toHaveLength(1);
  });
});

describe("public-only access", () => {
  it("treats a non-public article like a missing one", () => {
    expect(() => convert(withResponse({ CanRead: "Customer_c" }))).toThrow(ArticleNotFoundError);
    expect(() => convert(withResponse({ PhaseId: "Internal" }))).toThrow(ArticleNotFoundError);
  });
});

describe("front matter", () => {
  const meta = articleMeta(parseArticle(fixture("1986936")));

  it("cleans the title and builds the canonical URL", () => {
    expect(meta.title).not.toContain("  "); // source title has "UFT Developer  for"
    expect(meta.url).toBe("https://my.opentext.com/support/article/1986936");
  });
  it("converts epoch milliseconds to ISO 8601 UTC", () => {
    expect(isoDate(1791332026282)).toBe("2026-10-07T00:13:46Z");
    expect(meta.created).toBe("2025-06-24T20:32:16Z");
  });
  it("lists each version once, keeping the API order", () => {
    const uft = meta.products?.find((p) => p.name === "UFT One");
    expect(uft?.versions?.filter((v) => v === "26.3")).toHaveLength(1); // the API lists "26.3" twice
    expect(uft?.versions?.[0]).toBe("23.4");
  });
  it("leaves out fields that change on every view", () => {
    expect(convert(fixture("1986936")).markdown).not.toMatch(/votes|views/i);
  });
  it("starts the document with the front matter", () => {
    expect(convert(fixture("2310451")).markdown).toMatch(/^---\ntitle: .+\narticle_id: '2310451'\n/);
  });
});

describe("security bulletin body (shaped like 1770456)", () => {
  const html = [
    "<p>Mitigation:</p>",
    "<p>1. Stop the AutoPass License Server service.</p>",
    "<p>2. Replace the JAR files in <em>WEB-INF\\lib</em>.</p>",
    "<p>3. Start the service.</p>",
    '<p><img src="/api/web/support/article/attachment/3f2a?name=image001.png" /></p>',
    "<p>On Linux, run <em>zip -q -d autopass.war WEB-INF/lib/log4j-core-2.11.0.jar</em></p>",
    '<p>See <a href="/support/article/2341059">the hotfix article</a>.</p>',
  ].join("");
  const { markdown, html: source } = convert(withResponse({ Content: html }));

  it("converts steps, images, commands and links", () => {
    expect(markdown).toContain("1. Stop the AutoPass License Server service.\n2. Replace the JAR files in `WEB-INF\\lib`.\n3. Start the service.");
    expect(markdown).toContain("![image001.png](https://my.opentext.com/api/web/support/article/attachment/3f2a?name=image001.png)");
    expect(markdown).toContain("run `zip -q -d autopass.war WEB-INF/lib/log4j-core-2.11.0.jar`");
    expect(markdown).toContain("[the hotfix article](https://my.opentext.com/support/article/2341059)");
  });
  it("passes every check", () => {
    expect(checkConversion(source, markdown).filter((i) => i.severity === "error")).toEqual([]);
  });
});

describe("checks catch what the new rules fix", () => {
  const md = "---\ntitle: x\n---\n\n# T\n\n![](/api/x.png)\n\n1\\. Stop the service.\n";
  it("flags relative URLs, missing alt text and hand-numbered steps", () => {
    const checks = checkMarkdown(md).map((i) => i.check);
    expect(checks).toContain("no-relative-urls");
    expect(checks).toContain("images-have-alt");
    expect(checks).toContain("no-hand-numbered-steps");
  });
});

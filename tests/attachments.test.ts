import { describe, expect, it } from "vitest";
import { attachmentsSection } from "../src/core/attachments.js";

describe("attachmentsSection", () => {
  it("lists attachments as absolute links with sizes (2341059)", () => {
    expect(attachmentsSection([{
      name: "CONTENT_MANAGER_25.4_130_HOTFIX_4.pdf",
      size: 36909,
      url: "/api/web/support/article/attachment/904c8513?name=CONTENT_MANAGER_25.4_130_HOTFIX_4.pdf",
    }])).toBe(
      "## Attachments\n\n" +
        "- [CONTENT_MANAGER_25.4_130_HOTFIX_4.pdf](https://my.opentext.com/api/web/support/article/attachment/904c8513?name=CONTENT_MANAGER_25.4_130_HOTFIX_4.pdf) (36 KB)\n",
    );
  });

  it("returns nothing when there are no attachments (1986936, 2310451)", () => {
    expect(attachmentsSection([])).toBe("");
    expect(attachmentsSection(undefined)).toBe("");
  });

  it("lists an attachment without a URL by name only", () => {
    expect(attachmentsSection([{ name: "notes.txt", url: null, fileUrl: null }]))
      .toBe("## Attachments\n\n- notes.txt\n");
  });

  it("escapes brackets in file names", () => {
    expect(attachmentsSection([{ name: "a[1].pdf", url: "/x" }]))
      .toBe("## Attachments\n\n- [a\\[1\\].pdf](https://my.opentext.com/x)\n");
  });
});

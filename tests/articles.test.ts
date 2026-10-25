// Layers 2 and 3, run on every article in tests/fixtures/. Drop in a new <id>.json
// and it is tested automatically.
//   2. Golden snapshot: the Markdown is compared with tests/expected/<id>.md. On the
//      first run the file is created; after that, any change fails the test and shows
//      a diff. If the change is intended, accept it with:  npx vitest run -u
//   3. Checks: every post-condition in src/core/checks.ts must pass.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convert } from "../src/core/convert.js";
import { checkConversion } from "../src/core/checks.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

const ids = readdirSync(FIXTURES)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

describe.each(ids)("article %s", (id) => {
  const { html, markdown } = convert(JSON.parse(readFileSync(join(FIXTURES, `${id}.json`), "utf-8")));

  it("matches its golden snapshot", async () => {
    await expect(markdown).toMatchFileSnapshot(join("expected", `${id}.md`));
  });

  it("passes every check", () => {
    const issues = checkConversion(html, markdown);
    for (const w of issues.filter((i) => i.severity === "warning")) {
      console.warn(`[${id}] ${w.check}: ${w.detail}`);
    }
    const errors = issues.filter((i) => i.severity === "error").map((i) => `${i.check}: ${i.detail}`);
    expect(errors).toEqual([]);
  });
});

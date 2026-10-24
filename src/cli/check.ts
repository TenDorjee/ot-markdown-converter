// Run the checks over a folder of saved API responses and print a report.
//
// Usage:
//   npm run --silent check -- tests/fixtures            # fail (exit 1) if any article has errors
//   npm run --silent check -- corpus/ --report-only     # report only, always exit 0
//
// Use the first form in CI for the golden articles, and --report-only on a larger
// corpus of saved responses to find the next rule worth writing.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { convertArticle } from "../core/convert.js";
import { checkConversion } from "../core/checks.js";
import type { Issue } from "../core/checks.js";

const args = process.argv.slice(2);
const reportOnly = args.includes("--report-only");
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) {
  console.error("Usage: npm run --silent check -- <folder> [--report-only]");
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const totals = new Map<string, number>(); // check name -> number of articles failing it
let failed = 0;

for (const file of files) {
  let issues: Issue[];
  try {
    const payload = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    issues = checkConversion(payload.response.Content, convertArticle(payload));
  } catch (err) {
    issues = [{ check: "convert-failed", severity: "error", detail: String(err) }];
  }

  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length) failed++;
  console.log(`${errors.length ? "FAIL" : "PASS"}  ${file}`);
  for (const i of issues) {
    console.log(`      ${i.severity === "error" ? "error  " : "warning"} ${i.check}: ${i.detail}`);
  }
  for (const check of new Set(issues.map((i) => i.check))) {
    totals.set(check, (totals.get(check) ?? 0) + 1);
  }
}

console.log(`\n${files.length - failed}/${files.length} articles passed.`);
if (totals.size) {
  console.log("Articles affected per check:");
  for (const [check, n] of [...totals].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${check}`);
}
process.exit(failed && !reportOnly ? 1 : 0);

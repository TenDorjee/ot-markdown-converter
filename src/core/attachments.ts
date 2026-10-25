// Build the "## Attachments" section from the article's Attachments field.
//
// The API lists attachments separately from the body HTML, e.g. (article 2341059):
//   { "name": "CONTENT_MANAGER_25.4_130_HOTFIX_4.pdf", "size": 36909,
//     "url": "/api/web/support/article/attachment/904c8513-...?name=CONTENT_MANAGER_25.4_130_HOTFIX_4.pdf" }
// becomes
//   ## Attachments
//
//   - [CONTENT_MANAGER_25.4_130_HOTFIX_4.pdf](https://my.opentext.com/api/web/support/article/attachment/904c8513-...?name=...) (36 KB)
//
// The URLs are relative, so they are made absolute; the downloads are public (no login).
// Attachments without a URL are listed by name only. Order follows the API, so the
// output is deterministic.

import { absoluteUrl } from "./site.js";

interface Attachment {
  name?: unknown;
  size?: unknown;
  url?: unknown;
  fileUrl?: unknown;
}

/** Escape characters that would break Markdown link text. */
const escapeLinkText = (s: string) => s.replace(/([\\[\]])/g, "\\$1");

/** 36909 -> "36 KB", 314390 -> "307 KB", 1572864 -> "1.5 MB". */
function formatSize(bytes: unknown): string | undefined {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return undefined;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Markdown for the article's attachments.
 * @param attachments The API's Attachments array (may be missing or empty).
 * @returns An "## Attachments" section, or "" when there are none.
 */
export function attachmentsSection(attachments: unknown): string {
  if (!Array.isArray(attachments) || attachments.length === 0) return "";

  const items = (attachments as Attachment[]).flatMap((a) => {
    const name = typeof a.name === "string" ? a.name.trim() : "";
    if (!name) return [];
    const href = [a.url, a.fileUrl].find((u): u is string => typeof u === "string" && u.trim() !== "");
    const size = formatSize(a.size);
    const label = href ? `[${escapeLinkText(name)}](${absoluteUrl(href)})` : escapeLinkText(name);
    return [`- ${label}${size ? ` (${size})` : ""}`];
  });

  return items.length ? `## Attachments\n\n${items.join("\n")}\n` : "";
}

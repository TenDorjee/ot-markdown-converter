// The site the articles come from. Relative URLs in the article HTML and in the
// Attachments field are resolved against it.

export const SITE = "https://my.opentext.com";

/**
 * Make a URL absolute. Leaves in-page anchors (#...) and mailto: links alone.
 *   "/api/web/support/article/attachment/ab12?name=x.png" -> "https://my.opentext.com/api/web/..."
 *   "https://example.com/a"                               -> unchanged
 */
export function absoluteUrl(url: string): string {
  const u = url.trim();
  if (u === "" || u.startsWith("#") || /^mailto:/i.test(u)) return u;
  try {
    return new URL(u, SITE).href;
  } catch {
    return u; // not a parsable URL: leave it for the checks to report
  }
}

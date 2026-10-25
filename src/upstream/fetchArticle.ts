// Fetch one article's JSON from the my.opentext.com article API.
// Failures become typed errors that the API turns into status codes.

import { ArticleNotFoundError, UpstreamTimeoutError, UpstreamUnavailableError } from "../core/errors.js";

const UPSTREAM = "https://my.opentext.com/api/web/support/article/";

export async function fetchArticle(id: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(UPSTREAM + id, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(3000),          // give up after 3 seconds
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new UpstreamTimeoutError("no response from upstream within 3000 ms");
    }
    throw new UpstreamUnavailableError(`could not reach upstream: ${String(err)}`);
  }

  if (response.status === 404) throw new ArticleNotFoundError("upstream returned 404");
  if (!response.ok) throw new UpstreamUnavailableError(`upstream returned ${response.status}`);

  return response.json();
}
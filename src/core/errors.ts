// Errors the converter can raise. The API maps them to HTTP status codes:
//   ArticleNotFoundError  -> 404  (missing, or not public: callers can't tell which)
//   UpstreamFormatError   -> 502  (the my.opentext.com API sent something unexpected)

/** The article doesn't exist, or isn't public. */
export class ArticleNotFoundError extends Error {
  override name = "ArticleNotFoundError";
}

/** The upstream response didn't match the expected shape (see schema.ts). */
export class UpstreamFormatError extends Error {
  override name = "UpstreamFormatError";
}


/** The upstream API couldn't be reached or returned a server error. */
export class UpstreamUnavailableError extends Error {
  override name = "UpstreamUnavailableError";
}

/** The upstream API didn't respond within the timeout. */
export class UpstreamTimeoutError extends Error {
  override name = "UpstreamTimeoutError";
}
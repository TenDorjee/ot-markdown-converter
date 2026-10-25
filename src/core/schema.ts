// The shape of GET https://my.opentext.com/api/web/support/article/{id}, validated with zod.
//
// Validating at the boundary means an unexpected response fails with a clear
// UpstreamFormatError ("response.Content: expected string") instead of a crash deep
// inside the converter. Only the fields the converter uses are checked; extra fields
// (Votes, Views, Entitlement, ...) are ignored, so harmless API additions don't break it.
//
// Quirks handled here, seen in real responses:
//   - Products is an array, but may be a single object for one product
//   - each version is { "version": "23.4" } (lowercase key)
//   - envelope { "success": false, "response": null } means "no such article"

import { z } from "zod";
import { ArticleNotFoundError, UpstreamFormatError } from "./errors.js";

const ProductSchema = z.object({
  DisplayLabel: z.string(),
  versions: z.array(z.object({ version: z.string() })).nullish(),
});

const AttachmentSchema = z.object({
  name: z.string(),
  size: z.number().nullish(),
  url: z.string().nullish(),
  fileUrl: z.string().nullish(),
});

export const ArticleSchema = z.object({
  Id: z.union([z.string(), z.number()]).transform(String),
  Title: z.string(),
  Content: z.string(),
  ArticleType: z.string().nullish(),
  Version: z.number().nullish(),
  CreatedTime: z.number().nullish(),            // epoch milliseconds
  LastContentUpdateTime: z.number().nullish(),  // epoch milliseconds
  Products: z
    .union([z.array(ProductSchema), ProductSchema])
    .nullish()
    .transform((p) => (p == null ? [] : Array.isArray(p) ? p : [p])),
  Attachments: z.array(AttachmentSchema).nullish().transform((a) => a ?? []),
  CanRead: z.string().nullish(),
  PhaseId: z.string().nullish(),
});

export type Article = z.infer<typeof ArticleSchema>;

/**
 * Validate the API response and return the article.
 * @throws ArticleNotFoundError if the API reports no article.
 * @throws UpstreamFormatError if the response doesn't have the expected shape.
 */
export function parseArticle(payload: unknown): Article {
  const envelope = z
    .object({ success: z.boolean().optional(), response: z.unknown() })
    .safeParse(payload);
  if (!envelope.success) {
    throw new UpstreamFormatError("response is not the expected { success, response } envelope");
  }
  if (envelope.data.success === false || envelope.data.response == null) {
    throw new ArticleNotFoundError("the API returned no article");
  }

  const article = ArticleSchema.safeParse(envelope.data.response);
  if (!article.success) {
    const problems = article.error.issues
      .map((i) => `response.${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new UpstreamFormatError(problems);
  }
  return article.data;
}

# KB Article Markdown Converter
AI transcript: https://claude.ai/share/3c82c84a-a688-4611-92c9-dac5bd10e528

Converts [my.opentext.com](https://my.opentext.com) knowledge articles into clean, LLM-friendly Markdown and serves it over an HTTP API built to sit behind a CDN.

```
GET /v1/articles/1770456  →  200 text/markdown
```

Design document: [docs/design.md](docs/design.md). It covers the architecture, caching and purging, distribution to AI clients, evaluation, decisions and limitations.

## How it works

The article pages are rendered in the browser, so their server HTML contains no article text. The converter reads the site's JSON article API instead:

1. **Validate** the API response (zod schema) and allow public articles only.
2. **Clean** the article HTML with 18 small rules, each fixing one real defect found in a real article (`src/core/rehype/rules/`, each file opens with a before-and-after example).
3. **Convert** to Markdown (unified: rehype → remark), then add YAML front matter and an attachments section.
4. **Check** the output with 20 post-conditions (`src/core/checks.ts`). The API always serves the article, and logs any problems with the article ID.

## Requirements

- Node.js 22
- npm

## Quick start

```bash
npm ci
npm test            # unit tests, golden files and checks on every fixture
npm run dev         # API on http://localhost:3000 (fetches live articles)
```

```bash
curl -i localhost:3000/v1/articles/1986936
```

On WSL with the repo under `/mnt/c`, file watching can miss changes, restart the server or use `npx tsx watch --poll src/api/server.ts`.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Runs all tests (vitest) |
| `npm run typecheck` | Type-checks the source and the tests |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs the API from source |
| `npm run dev` | Runs the API and restarts on changes |
| `npm run --silent convert -- <article.json>` | Converts a saved API response and prints the Markdown |
| `npm run --silent check -- <folder> [--report-only]` | Runs the checks on every `.json` in a folder and prints a report |

Run the compiled server, as the container does:

```bash
npm run build
PORT=8080 node dist/api/server.js
```

## API

### `GET /v1/articles/{id}`

Returns the article as Markdown.

```http
HTTP/1.1 200 OK
content-type: text/markdown; charset=utf-8
cache-control: public, max-age=300, s-maxage=86400, stale-while-revalidate=86400, stale-if-error=86400
edge-cache-tag: article-1770456
x-conversion-quality: ok

---
title: CVE-2021-44228, CVE-2021-45046 and CVE-2021-45105 in AutoPass license server
article_id: '1770456'
url: https://my.opentext.com/support/article/1770456
type: Security Bulletins
...
---

# CVE-2021-44228, CVE-2021-45046 and CVE-2021-45105 in AutoPass license server
```

| Header | Meaning |
|---|---|
| `cache-control` | The CDN keeps the response 24 h, clients 5 min; stale copies are served while refreshing or if the origin fails |
| `edge-cache-tag` | Lets one CDN purge clear every cached variant of the article when it is published |
| `x-conversion-quality` | `ok`, `warning`, `error` or `critical`, from the runtime checks. `critical`|

Errors return JSON, `{ "error": <status>, "message": "..." }`:

| Status | When | Cached |
|---|---|---|
| 400 | ID is not 1–12 digits | 1 min |
| 404 | Article missing or not public (same response for both) | 1 min |
| 502 | Upstream down, 5xx, or an unexpected response shape | Never |
| 504 | Upstream slower than 3 s | Never |

### `GET /healthz`

Returns `ok`.

## Testing

| Layer | Where | Catches |
|---|---|---|
| Rule unit tests | `tests/rules.test.ts` | A rule that no longer fixes its own example |
| Golden files | `tests/expected/<id>.md` | Any change to the output of a saved article |
| Checks on every fixture | `tests/articles.test.ts` | Lost text, links or code; leftover HTML; broken structure; rules that are not idempotent |
| Validation and front matter | `tests/article.test.ts`, `tests/attachments.test.ts` | Bad input, private articles, metadata |

Tests run offline from saved API responses in `tests/fixtures/`, so CI never calls the live site.

When a change to the output is intended, review the diff and accept it:

```bash
npx vitest run -u
git diff tests/expected
```

### Adding an article that converts badly

1. Save its API response: `curl -s https://my.opentext.com/api/web/support/article/<id> -o tests/fixtures/<id>.json`
2. `npm run --silent check -- tests/fixtures` shows which checks fail.
3. Add or extend a rule in `src/core/rehype/rules/`, with a unit test built from the article's HTML.
4. `npx vitest run -u`, read the golden diff, commit.

## Docker

```bash
docker build -t kb-markdown .
docker run --rm -p 8080:8080 kb-markdown
```

Two-stage build: the runtime image contains only compiled JavaScript and production dependencies, runs as a non-root user and listens on `$PORT` (8080), as Cloud Run expects.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: install, typecheck, test, build, then build the Docker image (only if the tests pass).

## Project layout

```
src/
├── core/        convert, schema, errors, front matter, attachments, checks
│   └── rehype/  rule order (index.ts) and the 18 rules (rules/)
├── upstream/    fetchArticle.ts: the only code that calls my.opentext.com
├── api/         app.ts (routes), server.ts (entry point)
└── cli/         convert.ts, check.ts
tests/
├── fixtures/    saved API responses
└── expected/    golden Markdown
```

## Limitations

Tested on four articles. some hand-numbered steps and wrapped table cells are not yet handled. And purge-on-publish, the CDN routes and deployment are designed but not built. See the Limitations section of the design document for the full list.

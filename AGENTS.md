<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Public-page research

Use `npm run crawl:public -- https://example.com 8` for a bounded audit of public web pages. Read the JSON in `.data/crawls/` for titles, headings, navigation, controls, and short text samples. The crawler checks `robots.txt` as `ChatGPT-User` and stops when access is disallowed. It is an HTTP crawler; native mobile apps require a separate, authorized inspection workflow. Use `npm run import:archive` to refresh Shaba's own seeded article text from its public Blogger feed.

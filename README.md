# Shaba News Tamil · Newsroom

Newsroom is the digital edition of Shaba News Tamil. It leads with the day's main report, then presents district coverage, feature stories and a searchable headline list. Open `/newsroom` or the site root to read. Readers can share permanent story links without signing in.

[Open the public Newsroom preview](https://shaba-tamil-editions.ideastonetech.chatgpt.site/newsroom)

## Run locally

Install Node.js 22.13 or later, then run:

```sh
npm ci
npm run dev
```

Open [the local reader](http://localhost:3000/newsroom). The site starts with Tamil archive stories, their complete article text and published photos. The editorial desk is disabled until you configure its password.

The initial archive text comes from Shaba's public Blogger feed. Story pages show a few lines; **மூலச் செய்தி** expands the complete article on the same page. To refresh those seeded articles from the original site, run `npm run import:archive` and review the change to `lib/archive.json` before deploying. This is an explicit import, not a live request on every reader visit. Newly published stories can be written directly in the editorial desk.

Readers can search article text, open district shortcuts, save stories on their device, share links, enlarge article text, and use browser read aloud when supported. Saved stories use browser storage and do not sync across devices.

## Public site crawler

Run `npm run crawl:public -- https://www.shabanewstamil.com/ 8` to save an agent-readable page audit under `.data/crawls/`. The command uses Crawlee's fast HTTP and Cheerio crawler, follows only same-host links, caps requests, and checks `robots.txt` as `ChatGPT-User`. It records titles, headings, navigation, controls and a short text sample rather than copying entire articles. If a site disallows this crawler, it records the skipped URL and stops. Junior Vikatan currently disallows AI crawlers, so this tool cannot collect its pages; its public app listing can still inform Shaba's product design.

## Editing and publication

Set a private, unique `STUDIO_PASSWORD` in the hosting environment or an untracked `.env.local`. You can generate a local password on macOS or Linux with:

```sh
(set -C; umask 077; printf 'STUDIO_PASSWORD=%s\n' "$(openssl rand -hex 32)" > .env.local)
```

Use that command only for a new checkout. Restart the server after setting the password. Open `/admin` and sign in at the browser prompt with the username **editor** and your configured password. For production, serve the site over HTTPS and store the password in your host’s secret manager.

Choose **Add news**, enter a headline and body, upload a cover and select a section. **Save draft** keeps the story private. Choose **Preview** to read the saved draft. **Review & publish** saves your edits and opens a confirmation for the current edition's stories, layout and settings. **Library only** keeps a story off the homepage. The **Page layout** tab lets editors reorder sections and stories. Concurrent saves detect stale revisions, and unpublished uploads are available only to authenticated editors.

## Production and verification

```sh
npm run build
npm run typecheck
npm test
npm start
```

This is a standalone Next.js server. Run one instance with persistent, writable storage. SQLite stores drafts and published snapshots in `.data/studio.sqlite`; uploaded images are stored under `.data/media/`. Set `SHABA_DATA_DIR` to change that directory. Keep it private, back it up with the app stopped, and mount it across deploys. The automated publishing test uses its own temporary directory.

The archive reporting, photographs and Shaba brand belong to their original publisher. The original URLs remain in the archive data for provenance; readers stay on the redesigned story pages. The Noto Tamil fonts include the SIL Open Font License in `public/fonts/`.

# Shaba News Tamil · Newsroom

Newsroom is the newspaper edition of Shaba News Tamil. It leads with the day's main report, then presents district coverage, feature stories and a searchable headline list. Open `/newsroom` or the site root to read. Readers can share permanent story links without signing in.

[Open the public Newsroom preview](https://shaba-tamil-editions.ideastonetech.chatgpt.site/newsroom)

## Run locally

Install Node.js 22.13 or later, then run:

```sh
npm ci
npm run dev
```

Open [the local reader](http://localhost:3000/newsroom). The site starts with Tamil archive stories and their published photos. The editorial desk is disabled until you configure its password.

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

The archive reporting, photographs and Shaba brand belong to their original publisher. Each seed article links to its original report. The Noto Tamil fonts include the SIL Open Font License in `public/fonts/`.

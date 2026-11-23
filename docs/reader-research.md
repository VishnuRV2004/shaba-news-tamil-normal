# Reader feature reference

Reviewed on 23 November 2026. The [official Vikatan app listing](https://apps.apple.com/in/app/vikatan-tamil-news-magazine/id452698974) describes saved articles, section-specific news, search, audio listening, short updates, alerts, and offline magazines. Junior Vikatan is one of the publications inside that app.

Shaba's normal web edition adapts the useful reader patterns to its own reporting: saved stories on this device, district shortcuts, article-text search, sharing, adjustable type, browser read aloud, and a latest-headline strip. Existing Shaba photos and articles remain the content source. No 3D interaction is used.

The public crawler was tested against Shaba's site and saved an audit under `.data/crawls/`. [Junior Vikatan's robots policy](https://www.vikatan.com/robots.txt) disallows `ChatGPT-User`; Crawlee skipped it and collected zero pages. The HTTP crawler does not inspect native app screens. App features above are based on the official listing, not a crawl of the app or a copy of Vikatan content.

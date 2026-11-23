import { CheerioCrawler } from '@crawlee/cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [input, count = '8'] = process.argv.slice(2);
const start = input && new URL(input);
const maxPages = Number(count);
if (!start || start.protocol !== 'https:' || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 50) {
  throw new Error('Usage: npm run crawl:public -- https://example.com 8  (1–50 pages)');
}

const pages = [];
const skipped = [];
const crawler = new CheerioCrawler({
  respectRobotsTxtFile: { userAgent: 'ChatGPT-User' },
  retryOnBlocked: false,
  maxRequestsPerCrawl: maxPages,
  maxConcurrency: 2,
  sameDomainDelaySecs: 1,
  maxRequestRetries: 0,
  onSkippedRequest({ url, reason }) { if (reason === 'robotsTxt') skipped.push({ url, reason }); },
  async requestHandler({ $, request, enqueueLinks }) {
    const main = $('main').first().length ? $('main').first() : $('article').first().length ? $('article').first() : $('body');
    const text = value => value.replace(/\s+/g, ' ').trim();
    pages.push({
      url: request.loadedUrl || request.url,
      title: text($('title').first().text()),
      description: $('meta[name="description"]').attr('content') || '',
      headings: main.find('h1,h2,h3').map((_, node) => text($(node).text())).get().filter(Boolean).slice(0, 30),
      navigation: $('nav a').map((_, node) => text($(node).text())).get().filter(Boolean).slice(0, 30),
      actions: $('button').map((_, node) => text($(node).text()) || $(node).attr('aria-label')).get().filter(Boolean).slice(0, 30),
      sample: text(main.text()).slice(0, 1200),
    });
    await enqueueLinks({ strategy: 'same-hostname', selector: 'main a[href], article a[href], .post a[href], a[rel="next"]' });
  },
});

await crawler.run([start.href]);
const output = { source: start.href, crawledAt: new Date().toISOString(), pages, skipped };
const directory = join('.data', 'crawls');
await mkdir(directory, { recursive: true });
const path = join(directory, `${start.hostname.replace(/[^a-z0-9.-]/gi, '-')}.json`);
await writeFile(path, JSON.stringify(output, null, 2) + '\n');
console.log(`${pages.length} permitted page(s) saved to ${path}`);
if (!pages.length) {
  console.error('No pages were crawled. Check robots.txt and the site response.');
  process.exitCode = 2;
}

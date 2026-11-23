import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const archivePath = new URL('../lib/archive.json', import.meta.url);
const feedUrl = 'https://www.shabanewstamil.com/feeds/posts/default?alt=json&max-results=150';

export function articleText(html) {
  return html
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/\s*(?:script|style)>/gi, '')
    .replace(/<br\b[^>]*\/?\s*>|<\/\s*(?:div|p|li|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      if (entity[0] !== '#') return named[entity.toLowerCase()];
      const value = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
    })
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
}

export async function importArchive() {
  const articles = JSON.parse(await readFile(archivePath, 'utf8'));
  const pending = new Map(articles.map(article => [article.sourceUrl, article]));
  if ([...pending.keys()].some(url => !/^https:\/\/(?:www\.)?shabanewstamil\.com\/\d{4}\/\d{2}\/[^/]+\.html$/.test(url))) {
    throw new Error('Archive contains an unexpected source URL');
  }
  for (let start = 1; pending.size; start += 150) {
    const response = await fetch(`${feedUrl}&start-index=${start}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Blogger feed returned ${response.status}`);
    const entries = (await response.json()).feed.entry ?? [];
    if (!entries.length) throw new Error(`Could not find ${pending.size} archive article(s)`);
    for (const entry of entries) {
      const url = entry.link?.find(link => link.rel === 'alternate')?.href;
      const article = pending.get(url);
      if (!article) continue;
      const body = articleText(entry.content?.$t ?? '');
      if (body.length < 100 || body.length > 18000) throw new Error(`Unexpected article length: ${url}`);
      article.body = body;
      pending.delete(url);
    }
  }
  await writeFile(archivePath, JSON.stringify(articles, null, 2) + '\n');
  return articles.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  importArchive().then(count => console.log(`Imported ${count} complete articles into lib/archive.json`)).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

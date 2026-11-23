import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const base = '/shaba-news-tamil-normal';
const out = 'out';
const cssPlugin = { name: 'separate-css', setup(plugin) {
  plugin.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
} };

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await mkdir('.data', { recursive: true });
await cp('public', out, { recursive: true });
await writeFile(join(out, '.nojekyll'), '');

const css = (await Promise.all(['app/globals.css', 'components/newsroom.css'].map(path => readFile(path, 'utf8'))))
  .join('\n')
  .replaceAll('url("/fonts/', `url("${base}/fonts/`);
await writeFile(join(out, 'site.css'), css);

await build({
  entryPoints: ['scripts/pages-client.tsx'], bundle: true, minify: true, format: 'esm',
  platform: 'browser', target: 'es2020', outfile: join(out, 'site.js'), plugins: [cssPlugin],
  define: { 'process.env.NEXT_PUBLIC_SHABA_BASE_PATH': JSON.stringify(base) },
});
await build({
  entryPoints: ['scripts/pages-render.tsx'], bundle: true, platform: 'node', format: 'cjs',
  packages: 'external', outfile: '.data/pages-render.cjs', plugins: [cssPlugin],
  define: { 'process.env.NEXT_PUBLIC_SHABA_BASE_PATH': JSON.stringify(base) },
});

const require = createRequire(import.meta.url);
const { issue, renderPage } = require('../.data/pages-render.cjs');
const escape = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

async function page(path, article) {
  const title = article ? `${article.title} | ஷபா நியூஸ் தமிழ்` : 'ஷபா நியூஸ் தமிழ்';
  const description = article?.summary || 'தமிழ்நாடு செய்திகள் · ஷபா நியூஸ் தமிழ்';
  const canonical = `https://surega04-d.github.io${base}${path}`;
  const image = article?.image ? `<meta property="og:image" content="https://surega04-d.github.io${base}${article.image}">` : '';
  const html = `<!doctype html><html lang="ta"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">${image}<link rel="icon" href="${base}/shaba-mark.webp"><link rel="stylesheet" href="${base}/site.css"><script type="module" src="${base}/site.js"></script></head><body><div id="app"${article ? ` data-article-id="${escape(article.id)}"` : ''}>${renderPage(article?.id)}</div></body></html>`;
  const folder = join(out, path);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'index.html'), html);
}

await page('/');
await page('/newsroom/');
for (const article of issue.articles) await page(`/newsroom/story/${encodeURIComponent(article.id)}/`, article);
console.log(`Built ${issue.articles.length + 2} static reader pages in ${out}/`);

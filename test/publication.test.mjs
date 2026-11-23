// Runs against a disposable local directory and an ephemeral HTTP port.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import next from 'next';

test('only published stories and their photos are readable without editor sign-in', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'shaba-edition-'));
  process.env.SHABA_DATA_DIR = directory;
  const password = randomBytes(32).toString('hex');
  process.env.STUDIO_PASSWORD = password;
  const auth = { authorization: 'Basic ' + Buffer.from('editor:' + password).toString('base64') };
  const app = next({ dev: false, hostname: '127.0.0.1' });
  await app.prepare();
  const server = createServer(app.getRequestHandler());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const request = (path, init = {}) => fetch(origin + path, { redirect: 'manual', ...init });

  assert.equal((await request('/newsroom')).status, 200);
  const seededStory = await (await request('/newsroom/story/voc-remembrance')).text();
  const renderedBody = html => html.match(/<div class="nr-body-copy">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.match(seededStory, /href="\/newsroom\/story\/voc-remembrance\?full=1"/);
  assert.doesNotMatch(renderedBody(seededStory), /ஆகியோர் கலந்து கொண்டு/);
  const completeStory = await (await request('/newsroom/story/voc-remembrance?full=1')).text();
  assert.match(renderedBody(completeStory), /ஆகியோர் கலந்து கொண்டு/);
  assert.doesNotMatch(completeStory, /மூலச் செய்தி/);
  assert.doesNotMatch(seededStory, /href="https:\/\/www\.shabanewstamil\.com\/2026\/11\/90\.html"/);
  assert.equal((await request('/api/studio')).status, 401);
  const gate = await request('/admin');
  assert.equal(gate.status, 307);
  const challenge = await request(gate.headers.get('location'));
  assert.equal(challenge.status, 401);
  assert.match(challenge.headers.get('www-authenticate'), /^Basic /);
  assert.equal((await request('/newsroom?preview=draft')).status, 307);
  assert.equal((await request('/admin', { headers: auth })).status, 200);

  const photo = await readFile('public/photos/rail-council.webp');
  const upload = await request('/api/media', { method: 'POST', headers: { ...auth, 'content-type': 'image/webp' }, body: photo });
  assert.equal(upload.status, 201);
  const { url } = await upload.json();
  assert.equal((await request(url)).status, 404);
  const { state, revision } = await (await request('/api/studio', { headers: auth })).json();
  const leadId = state.editions.newsroom.sections[0].articleIds[0];
  const article = state.articles.find(story => story.id === leadId);
  const originalTitle = article.title;
  article.title = 'புதிய செய்தி ' + originalTitle;
  article.image = url;
  const put = (action, rev, extra = {}) => request('/api/studio', {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json', ...extra },
    body: JSON.stringify({ state, revision: rev, action, edition: 'newsroom' })
  });
  assert.equal((await put('save', revision, { origin: 'https://other.invalid' })).status, 403);
  assert.equal((await put('save', revision)).status, 200);
  assert.equal((await put('save', revision)).status, 409);
  assert.equal((await request(url)).status, 404);
  const path = '/newsroom/story/' + leadId;
  assert.equal((await (await request(path)).text()).includes(article.title), false);
  assert.equal((await (await request(path + '?preview=draft', { headers: auth })).text()).includes(article.title), true);
  assert.equal((await put('publish', revision + 1)).status, 200);
  assert.equal((await (await request(path)).text()).includes(article.title), true);
  assert.deepEqual(Buffer.from(await (await request(url)).arrayBuffer()), photo);
});

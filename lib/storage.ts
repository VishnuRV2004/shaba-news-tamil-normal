import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { publishedIssue, type EditionKey, type Issue, type StudioState } from './model';
import { seed } from './seed';

export const dataDir = resolve(process.env.SHABA_DATA_DIR || '.data');
let connection: DatabaseSync | undefined;

function database() {
  if (connection) return connection;
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dataDir, 'studio.sqlite'));
  db.exec(`PRAGMA busy_timeout=5000;
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS studio (
      id INTEGER PRIMARY KEY CHECK (id=1), revision INTEGER NOT NULL,
      draft TEXT NOT NULL, published TEXT NOT NULL
    )`);
  connection = db;
  return db;
}

export async function issue(edition: EditionKey): Promise<Issue> {
  const row = database().prepare('SELECT published FROM studio WHERE id=1').get();
  return row ? JSON.parse(String(row.published)) : publishedIssue(seed, edition);
}

export async function studio(): Promise<{ state: StudioState; revision: number }> {
  const row = database().prepare('SELECT draft, revision FROM studio WHERE id=1').get();
  return row ? { state: JSON.parse(String(row.draft)), revision: Number(row.revision) } : { state: seed, revision: 0 };
}

export async function save(state: StudioState, revision: number, publish?: EditionKey) {
  const db = database();
  const draft = JSON.stringify(state);
  const published = publish ? JSON.stringify(publishedIssue(state, publish)) : null;
  if (revision === 0) {
    return db.prepare('INSERT INTO studio VALUES (1,1,?,?) ON CONFLICT(id) DO NOTHING')
      .run(draft, published ?? JSON.stringify(publishedIssue(seed, 'newsroom'))).changes === 1;
  }
  return db.prepare('UPDATE studio SET revision=revision+1, draft=?, published=COALESCE(?,published) WHERE id=1 AND revision=?')
    .run(draft, published, revision).changes === 1;
}

export async function isPublishedMedia(path: string, origin: string) {
  const { articles } = await issue('newsroom');
  return articles.some(({ image }) => {
    if (image === path) return true;
    if (!image) return false;
    try {
      const url = new URL(image, origin);
      return url.origin === origin && url.pathname === path;
    } catch { return false; }
  });
}

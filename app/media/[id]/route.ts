import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { editorStatus } from '../../../lib/editor';
import { dataDir, isPublishedMedia } from '../../../lib/storage';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization', 'X-Content-Type-Options': 'nosniff' };
const types = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = /^[a-f0-9-]{36}\.(jpg|png|webp)$/.exec(id);
  if (!match || (await editorStatus() !== 200 && !await isPublishedMedia('/media/' + id, new URL(request.url).origin))) {
    return new Response(null, { status: 404, headers });
  }
  try {
    const bytes = await readFile(join(dataDir, 'media', id));
    return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': types[match[1] as keyof typeof types] } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response(null, { status: 404, headers });
    throw error;
  }
}

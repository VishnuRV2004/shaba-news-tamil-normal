import { createHash, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function editorStatus(): Promise<number> {
  const password = process.env.STUDIO_PASSWORD;
  if (!password) return 403;
  const auth = (await headers()).get('authorization');
  if (!auth?.startsWith('Basic ')) return 401;
  const digest = (input: Buffer | string) => createHash('sha256').update(input).digest();
  const supplied = Buffer.from(auth.slice(6), 'base64');
  return timingSafeEqual(digest(supplied), digest('editor:' + password)) ? 200 : 401;
}

export async function requireEditorPage(returnTo: string) {
  if (await editorStatus() !== 200) redirect('/editor-login?next=' + encodeURIComponent(returnTo));
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

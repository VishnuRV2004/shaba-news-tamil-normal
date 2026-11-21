import { editorStatus } from '../../lib/editor';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const status = await editorStatus();
  const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization' };
  if (status === 403) return new Response('The editorial desk is disabled until the site owner sets STUDIO_PASSWORD.', { status, headers });
  if (status !== 200) {
    return new Response('Sign in with the editor account.', {
      status: 401, headers: { ...headers, 'WWW-Authenticate': 'Basic realm="Shaba editorial desk", charset="UTF-8"' }
    });
  }
  const next = new URL(request.url).searchParams.get('next') || '/admin';
  const location = /^\/(?:admin|newsroom(?:\/story\/[a-z0-9-]+)?(?:\?preview=draft)?)$/.test(next) ? next : '/admin';
  return new Response(null, { status: 303, headers: { ...headers, Location: location } });
}

/** Decode and validate a `/cases/<key>` pathname, rejecting traversal or invalid escapes. */
export function parseCaseKey(pathname) {
  if (!pathname.startsWith('/cases/')) return null;
  const raw = pathname.slice('/cases/'.length);
  if (!raw) return null;
  let key;
  try {
    key = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!key || key.startsWith('/') || key.includes('\\') || key.includes('\0')) return null;
  if (key.split('/').some(seg => !seg || seg === '.' || seg === '..')) return null;
  return key;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/cases/')) {
      return new Response('Not Found', { status: 404 });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const key = parseCaseKey(url.pathname);
    if (!key) {
      return new Response('Bad Request', { status: 400 });
    }

    const obj = request.method === 'HEAD'
      ? await env.CASES_BUCKET.head(key)
      : await env.CASES_BUCKET.get(key);
    if (!obj) {
      return new Response('Not Found', {
        status: 404,
        headers: {
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream');
    if (obj.httpEtag) headers.set('etag', obj.httpEtag);
    headers.set('content-length', String(obj.size));
    headers.set('x-content-type-options', 'nosniff');

    return new Response(request.method === 'HEAD' ? null : obj.body, { status: 200, headers });
  },
};

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
  async fetch(request, env, ctx) {
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

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(url.origin + url.pathname, { method: 'GET' });
    const inm = request.headers.get('if-none-match');
    if (request.method === 'GET' && cache) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        if (inm && cached.headers.get('etag') === inm) {
          cached.body?.cancel?.().catch(() => {});
          return new Response(null, { status: 304, headers: cached.headers });
        }
        return cached;
      }
    }

    let obj;
    try {
      obj = request.method === 'HEAD'
        ? await env.CASES_BUCKET.head(key)
        : await env.CASES_BUCKET.get(key);
    } catch {
      return new Response('Upstream storage error', {
        status: 502,
        headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
      });
    }
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

    if (obj.httpEtag && inm === obj.httpEtag) {
      obj.body?.cancel?.().catch(() => {});
      return new Response(null, { status: 304, headers });
    }

    const res = new Response(request.method === 'HEAD' ? null : obj.body, { status: 200, headers });
    if (request.method === 'GET' && cache && !/no-cache|no-store/i.test(headers.get('cache-control') || '')) {
      const put = cache.put(cacheKey, res.clone()).catch(() => {});
      if (ctx?.waitUntil) ctx.waitUntil(put);
      else await put;
    }
    return res;
  },
};

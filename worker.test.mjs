import assert from 'node:assert/strict';
import worker, { parseCaseKey } from './worker.js';
import IIWGL from './js/iiwgl.js';

assert.equal(parseCaseKey('/cases/Client0/BDC-%2001/a.iiwgl'), 'Client0/BDC- 01/a.iiwgl');
for (const bad of ['/cases/', '/cases/a/../b', '/cases/a/..%2Fb', '/cases/a%5Cb', '/cases/%E0%A4%A', '/cases//a', '/cases/a/']) {
  assert.equal(parseCaseKey(bad), null, `expected null for ${bad}`);
}

assert.throws(() => IIWGL.parseIIWGL(new ArrayBuffer(0), null), { message: 'Invalid or empty .iiwgl file' });

const payload = new Uint8Array([1, 2, 3, 4]);
const cacheStore = new Map();
globalThis.caches = {
  default: {
    async match(req) {
      const hit = cacheStore.get(req.url);
      return hit ? new Response(hit.body, { status: hit.status, headers: hit.headers }) : undefined;
    },
    async put(req, res) {
      cacheStore.set(req.url, { status: res.status, headers: new Headers(res.headers), body: await res.arrayBuffer() });
    },
  },
};

let throwR2 = false;
const env = {
  CASES_BUCKET: {
    calls: [],
    async get(key) {
      this.calls.push(['get', key]);
      if (throwR2) throw new Error('R2 down');
      if (key === 'UploadTestFromOnyx/ExampleWebView.iiwgl') {
        return {
          size: payload.byteLength,
          httpEtag: '"etag-nc"',
          body: payload,
          writeHttpMetadata(h) { h.set('cache-control', 'no-cache'); },
        };
      }
      if (key !== 'Client0/BDC- 01/a.iiwgl') return null;
      return {
        size: payload.byteLength,
        httpEtag: '"etag-1"',
        body: payload,
        writeHttpMetadata(h) { h.set('cache-control', 'public, max-age=31536000, immutable'); },
      };
    },
    async head(key) {
      this.calls.push(['head', key]);
      if (throwR2) throw new Error('R2 down');
      if (key !== 'Client0/BDC- 01/a.iiwgl') return null;
      return {
        size: payload.byteLength,
        httpEtag: '"etag-1"',
        writeHttpMetadata(h) { h.set('cache-control', 'public, max-age=31536000, immutable'); },
      };
    },
  },
};

const req = (path, method = 'GET', headers = {}) =>
  worker.fetch(new Request(`https://viewer.vcconnect.link${path}`, { method, headers }), env);

assert.equal((await req('/worker.js')).status, 404);

const r405 = await req('/cases/Client0/BDC-%2001/a.iiwgl', 'POST');
assert.equal(r405.status, 405);
assert.equal(r405.headers.get('allow'), 'GET, HEAD');

assert.equal((await req('/cases/a/..%2Fb')).status, 400);

const rMiss = await req('/cases/missing.iiwgl');
assert.equal(rMiss.status, 404);
assert.equal(rMiss.headers.get('cache-control'), 'no-store');
assert.equal(rMiss.headers.get('x-content-type-options'), 'nosniff');
assert.equal(cacheStore.has('https://viewer.vcconnect.link/cases/missing.iiwgl'), false);

const rGet = await req('/cases/Client0/BDC-%2001/a.iiwgl');
assert.equal(rGet.status, 200);
assert.equal(rGet.headers.get('content-length'), '4');
assert.equal(rGet.headers.get('etag'), '"etag-1"');
assert.equal(rGet.headers.get('content-type'), 'application/octet-stream');
assert.equal(rGet.headers.get('cache-control'), 'public, max-age=31536000, immutable');
assert.equal(rGet.headers.get('x-content-type-options'), 'nosniff');
assert.deepEqual(new Uint8Array(await rGet.arrayBuffer()), payload);

const rCached = await req('/cases/Client0/BDC-%2001/a.iiwgl?r=1');
assert.equal(rCached.status, 200);
assert.deepEqual(new Uint8Array(await rCached.arrayBuffer()), payload);
assert.equal(env.CASES_BUCKET.calls.filter(c => c[0] === 'get' && c[1] === 'Client0/BDC- 01/a.iiwgl').length, 1);

const r304Cached = await req('/cases/Client0/BDC-%2001/a.iiwgl', 'GET', { 'if-none-match': '"etag-1"' });
assert.equal(r304Cached.status, 304);
assert.equal((await r304Cached.arrayBuffer()).byteLength, 0);

const rNc = await req('/cases/UploadTestFromOnyx/ExampleWebView.iiwgl');
assert.equal(rNc.status, 200);
assert.equal(cacheStore.has('https://viewer.vcconnect.link/cases/UploadTestFromOnyx/ExampleWebView.iiwgl'), false);

const rHead = await req('/cases/Client0/BDC-%2001/a.iiwgl', 'HEAD');
assert.equal(rHead.status, 200);
assert.equal(rHead.headers.get('content-length'), '4');
assert.equal((await rHead.arrayBuffer()).byteLength, 0);

const r304Head = await req('/cases/Client0/BDC-%2001/a.iiwgl', 'HEAD', { 'if-none-match': '"etag-1"' });
assert.equal(r304Head.status, 304);

throwR2 = true;
const r502 = await req('/cases/Uncached/file.iiwgl');
assert.equal(r502.status, 502);
assert.equal(r502.headers.get('cache-control'), 'no-store');

console.log('WORKER_TEST_PASSED');

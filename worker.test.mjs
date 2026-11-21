import assert from 'node:assert/strict';
import worker, { parseCaseKey } from './worker.js';

assert.equal(parseCaseKey('/cases/Client0/BDC-%2001/a.iiwgl'), 'Client0/BDC- 01/a.iiwgl');
for (const bad of ['/cases/', '/cases/a/../b', '/cases/a/..%2Fb', '/cases/a%5Cb', '/cases/%E0%A4%A', '/cases//a', '/cases/a/']) {
  assert.equal(parseCaseKey(bad), null, `expected null for ${bad}`);
}

const payload = new Uint8Array([1, 2, 3, 4]);
const env = {
  CASES_BUCKET: {
    calls: [],
    async get(key) {
      this.calls.push(['get', key]);
      if (key !== 'Client0/BDC- 01/a.iiwgl') return null;
      return {
        size: payload.byteLength,
        httpEtag: '"etag-1"',
        body: payload,
        writeHttpMetadata(h) {
          h.set('cache-control', 'public, max-age=31536000, immutable');
        },
      };
    },
    async head(key) {
      this.calls.push(['head', key]);
      if (key !== 'Client0/BDC- 01/a.iiwgl') return null;
      return {
        size: payload.byteLength,
        httpEtag: '"etag-1"',
        writeHttpMetadata(h) {
          h.set('cache-control', 'public, max-age=31536000, immutable');
        },
      };
    },
  },
};

const req = (path, method = 'GET') => worker.fetch(new Request(`https://viewer.vcconnect.link${path}`, { method }), env);

const r404Path = await req('/worker.js');
assert.equal(r404Path.status, 404);

const r405 = await req('/cases/Client0/BDC-%2001/a.iiwgl', 'POST');
assert.equal(r405.status, 405);
assert.equal(r405.headers.get('allow'), 'GET, HEAD');

const r400 = await req('/cases/a/..%2Fb');
assert.equal(r400.status, 400);

const rMiss = await req('/cases/missing.iiwgl');
assert.equal(rMiss.status, 404);
assert.equal(rMiss.headers.get('cache-control'), 'no-store');
assert.equal(rMiss.headers.get('x-content-type-options'), 'nosniff');

const rGet = await req('/cases/Client0/BDC-%2001/a.iiwgl');
assert.equal(rGet.status, 200);
assert.equal(rGet.headers.get('content-length'), '4');
assert.equal(rGet.headers.get('etag'), '"etag-1"');
assert.equal(rGet.headers.get('content-type'), 'application/octet-stream');
assert.equal(rGet.headers.get('cache-control'), 'public, max-age=31536000, immutable');
assert.equal(rGet.headers.get('x-content-type-options'), 'nosniff');
assert.deepEqual(new Uint8Array(await rGet.arrayBuffer()), payload);

const rHead = await req('/cases/Client0/BDC-%2001/a.iiwgl', 'HEAD');
assert.equal(rHead.status, 200);
assert.equal(rHead.headers.get('content-length'), '4');
assert.equal((await rHead.arrayBuffer()).byteLength, 0);

console.log('WORKER_TEST_PASSED');

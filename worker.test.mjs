import assert from 'node:assert/strict';
import worker, { parseCaseKey } from './worker.js';
import IIWGL from './js/iiwgl.js';

assert.equal(parseCaseKey('/cases/Client0/BDC-%2001/a.iiwgl'), 'Client0/BDC- 01/a.iiwgl');
for (const bad of ['/cases/', '/cases/a/../b', '/cases/a/..%2Fb', '/cases/a%5Cb', '/cases/%E0%A4%A', '/cases//a', '/cases/a/']) {
  assert.equal(parseCaseKey(bad), null, `expected null for ${bad}`);
}

assert.throws(() => IIWGL.parseIIWGL(new ArrayBuffer(0), null), { message: 'Invalid or empty .iiwgl file' });

const tGradUpper = IIWGL.computeToothGradient(new Float32Array([0, 0, 0, 0, 10, 0]), 0);
assert.deepEqual([...tGradUpper], [0, 1]);
const tGradLower = IIWGL.computeToothGradient(new Float32Array([0, 0, 0, 0, -10, 0]), 1);
assert.deepEqual([...tGradLower], [0, 1]);
const gGrad = IIWGL.computeGumMarginGradient(new Float32Array([0, 0, 0, 10, 10, 10]), new Float32Array([0, 0, 0]), 2.8);
assert.ok(gGrad[0] > 0.99 && gGrad[1] === 0);

// Synthetic clinical tests: smoothNormalsArray, extractIPR, computeToothMovements, computeBoltonAndArch
const smN = IIWGL.smoothNormalsArray(
  new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  new Uint32Array([0, 1, 2, 3, 4, 5]),
  1
);
assert.equal(smN.length, 18);
assert.ok(Math.abs(Math.hypot(smN[0], smN[1], smN[2]) - 1) < 1e-4);

const idM = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const trM = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const mkVerts = (x0, x1) => {
  const arr = [];
  for (let i = 0; i < 20; i++) arr.push(i < 10 ? x0 : x1, i * 0.1, 0);
  return new Float32Array(arr);
};
const synthModel = {
  playback: [
    { frame: 0, pause: 2000, name: 'S0', moves: 0 },
    { frame: 100, pause: 2000, name: 'S1', moves: 0 },
    { frame: 200, pause: 2000, name: 'S2', moves: 1 }
  ],
  objects: [
    {
      name: 'Tooth 11', type: 11, group: 0, transform: new Float32Array(idM()), isVisible: true,
      bbox: { min: [-8, 0, -2], max: [0, 8, 2] },
      keys: {
        TRANS: [{ frame: 0, data: trM(-4, 0, 20) }, { frame: 100, data: trM(-4, 0, 20) }, { frame: 200, data: trM(-6.5, 0, 20) }],
        VISIB: [], ALPHA: [], COLOR: [], VTCLR: [],
        VTPOS: [{ frame: 0, data: ['A0'] }, { frame: 50, data: ['A1'] }]
      },
      mesh: {
        vertices: mkVerts(-4, 4), indices: new Uint32Array([0, 1, 2]),
        morphPositions: { A0: mkVerts(-4, 4), A1: mkVerts(-4, 3.85) }
      }
    },
    {
      name: 'Tooth 21', type: 21, group: 0, transform: new Float32Array(idM()), isVisible: true,
      bbox: { min: [0, 0, -2], max: [8, 8, 2] },
      keys: {
        TRANS: [{ frame: 0, data: trM(4, 0, 20) }, { frame: 100, data: trM(4, 0, 20) }, { frame: 200, data: trM(8.5, 0, 20) }],
        VISIB: [], ALPHA: [], COLOR: [], VTCLR: [],
        VTPOS: [{ frame: 0, data: ['B0'] }, { frame: 50, data: ['B1'] }]
      },
      mesh: {
        vertices: mkVerts(-4, 4), indices: new Uint32Array([0, 1, 2]),
        morphPositions: { B0: mkVerts(-4, 4), B1: mkVerts(-3.85, 4) }
      }
    },
    {
      name: 'Tooth 13', type: 13, group: 0, transform: new Float32Array(idM()), isVisible: true,
      bbox: { min: [-3, 0, -2], max: [3, 8, 2] },
      keys: { TRANS: [{ frame: 0, data: trM(-15, 0, 14) }, { frame: 200, data: trM(-15, 0, 14) }], VISIB: [], ALPHA: [], COLOR: [], VTPOS: [], VTCLR: [] },
      mesh: { vertices: mkVerts(-3, 3), indices: new Uint32Array([0, 1, 2]), morphPositions: {} }
    },
    {
      name: 'Tooth 23', type: 23, group: 0, transform: new Float32Array(idM()), isVisible: true,
      bbox: { min: [-3, 0, -2], max: [3, 8, 2] },
      keys: { TRANS: [{ frame: 0, data: trM(15, 0, 14) }, { frame: 200, data: trM(15, 0, 14) }], VISIB: [], ALPHA: [], COLOR: [], VTPOS: [], VTCLR: [] },
      mesh: { vertices: mkVerts(-3, 3), indices: new Uint32Array([0, 1, 2]), morphPositions: {} }
    }
  ]
};

const iprRes = IIWGL.extractIPR(synthModel);
assert.equal(iprRes.length, 1);
assert.equal(iprRes[0].id, '11-21');
assert.equal(iprRes[0].stageIdx, 1);
assert.ok(Math.abs(iprRes[0].mm - 0.3) < 0.06, `expected ~0.3, got ${iprRes[0].mm}`);

const movRes = IIWGL.computeToothMovements(synthModel);
assert.equal(movRes.teeth.find(t => t.fdi === 11).plausibility, 'high');
assert.equal(movRes.teeth.find(t => t.fdi === 21).plausibility, 'implausible');
assert.equal(movRes.teeth.find(t => t.fdi === 13).plausibility, 'normal');
assert.equal(movRes.stageMeta[0].upperActive, false);
assert.equal(movRes.stageMeta[0].lowerActive, false);
assert.equal(movRes.stageMeta[1].upperActive, false);
assert.equal(movRes.stageMeta[2].upperActive, true);
assert.equal(movRes.stageMeta[2].overLimit, true);

const bolRes = IIWGL.computeBoltonAndArch(synthModel, 0);
assert.equal(bolRes.anterior6.complete, false);
assert.ok(Math.abs(bolRes.archWidths.upperCanine.initialMm - 30) < 1e-3);

// Parser composeBase & duplicate-frame interpolation guards
assert.equal(
  IIWGL.shouldComposeBase(
    new Float32Array(trM(-3.18, -1.41, 5.81)),
    [{ frame: 0, data: trM(-3.43, -1.49, 6.37) }, { frame: 80, data: trM(-3.18, -1.41, 5.81) }, { frame: 999, data: trM(0, 0, 0) }],
    { min: [-1, -1, -1], max: [1, 1, 1] }
  ),
  false
);
assert.equal(
  IIWGL.shouldComposeBase(
    new Float32Array(trM(1, 2, 3)),
    [{ frame: 0, data: trM(0, 0, 0) }, { frame: 999, data: trM(0, 0, 0) }],
    { min: [14, 1, 10], max: [16, 3, 12] }
  ),
  false
);
assert.equal(
  IIWGL.shouldComposeBase(
    new Float32Array(trM(14.0, 2.0, 12.0)),
    [{ frame: 0, data: trM(0, 0, 0) }, { frame: 999, data: trM(1, 0, 0) }],
    { min: [-1.2, -1.2, -0.8], max: [1.2, 1.2, 0.8] }
  ),
  true
);
const dupOut = new Float32Array(16);
IIWGL.evalTransform(
  [{ frame: 100, intp: 'linear', data: trM(1, 2, 3) }, { frame: 100, intp: 'linear', data: trM(4, 5, 6) }],
  100,
  { min: [-1, -1, -1], max: [1, 1, 1] },
  dupOut
);
assert.ok(Array.from(dupOut).every(Number.isFinite));

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

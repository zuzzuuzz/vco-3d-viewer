(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.IIWGL = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const MASK64 = 0xFFFFFFFFFFFFFFFFn;
  const K512 = [
    0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
    0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
    0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
    0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
    0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
    0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
    0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
    0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
    0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
    0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
    0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
    0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
    0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
    0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
    0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
    0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
    0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
    0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
    0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
    0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n
  ];
  const rotr = (x, n) => (x >> n) | ((x << (64n - n)) & MASK64);

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    return new Uint8Array(Buffer.from(str, 'utf8'));
  }

  function sha512Bytes(str) {
    const src = utf8Bytes(str), bitLen = BigInt(src.length) * 8n;
    const padLen = ((src.length + 17 + 127) >> 7) << 7;
    const msg = new Uint8Array(padLen);
    msg.set(src); msg[src.length] = 0x80;
    const dv = new DataView(msg.buffer);
    dv.setBigUint64(padLen - 8, bitLen, false);
    const H = [
      0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
      0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n
    ];
    const w = new Array(80);
    for (let off = 0; off < padLen; off += 128) {
      for (let i = 0; i < 16; i++) w[i] = dv.getBigUint64(off + i * 8, false);
      for (let i = 16; i < 80; i++) {
        const s0 = rotr(w[i - 15], 1n) ^ rotr(w[i - 15], 8n) ^ (w[i - 15] >> 7n);
        const s1 = rotr(w[i - 2], 19n) ^ rotr(w[i - 2], 61n) ^ (w[i - 2] >> 6n);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & MASK64;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 80; i++) {
        const S1 = rotr(e, 14n) ^ rotr(e, 18n) ^ rotr(e, 41n);
        const ch = (e & f) ^ ((~e & MASK64) & g);
        const t1 = (h + S1 + ch + K512[i] + w[i]) & MASK64;
        const S0 = rotr(a, 28n) ^ rotr(a, 34n) ^ rotr(a, 39n);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) & MASK64;
        h = g; g = f; f = e; e = (d + t1) & MASK64; d = c; c = b; b = a; a = (t1 + t2) & MASK64;
      }
      H[0] = (H[0] + a) & MASK64; H[1] = (H[1] + b) & MASK64; H[2] = (H[2] + c) & MASK64; H[3] = (H[3] + d) & MASK64;
      H[4] = (H[4] + e) & MASK64; H[5] = (H[5] + f) & MASK64; H[6] = (H[6] + g) & MASK64; H[7] = (H[7] + h) & MASK64;
    }
    const out = new Uint8Array(64), odv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) odv.setBigUint64(i * 8, H[i], false);
    return out;
  }

  function isEncrypted(buffer) {
    if (!buffer || buffer.byteLength < 16) throw new Error('Invalid or empty .iiwgl file');
    const dv = new DataView(buffer);
    const magic = dv.getUint32(0, true);
    if (magic === 1229539148) throw new Error('Unsupported big-endian .iiwgl file');
    if (magic !== 1279740233) throw new Error('Invalid .iiwgl magic header');
    const ver = dv.getUint32(4, true);
    if (ver < 1 || ver > 8) throw new Error('Unsupported .iiwgl version: ' + ver);
    if (ver <= 2) return false;
    const pidLen = dv.getInt32(12, true);
    return !(pidLen >= 0 && pidLen < 300);
  }

  function decryptBuffer(buffer, password, version) {
    const out = new Uint8Array(buffer.slice(0));
    if (version <= 6) {
      const k = utf8Bytes(password);
      if (k.length) for (let h = 8; h < out.length; h++) out[h] ^= k[h % k.length];
    } else {
      const k = sha512Bytes(password);
      for (let l = 0, h = 8; h < out.length; h++) {
        const c = out[h];
        out[h] = c ^ l ^ k[(h + l) % 64];
        l = c;
      }
    }
    return out;
  }

  function bgrToRgb01(v) {
    const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
    return [b, g, r]; // loader.js reverses intToBGR -> [R,G,B] = [lowByte, midByte, highByte]
  }

  function normOldRgb(rgb) {
    const mx = Math.max(rgb[0], rgb[1], rgb[2]);
    if (mx > 0) { const s = Math.min(1 / mx, 2); rgb[0] *= s; rgb[1] *= s; rgb[2] *= s; }
  }

  function asciiName(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function extractAttr3(arr, vCount) {
    const out = new Float32Array(vCount * 3);
    for (let i = 0, j = 0; i < vCount; i++, j += 4) {
      out[i * 3] = arr[j]; out[i * 3 + 1] = arr[j + 1]; out[i * 3 + 2] = arr[j + 2];
    }
    return out;
  }

  function parseIIWGL(buffer, password) {
    const CTMRef = (typeof globalThis !== 'undefined' && globalThis.CTM) || require('./vendor/openctm').CTM;
    const encrypted = isEncrypted(buffer);
    const rawView = new DataView(buffer);
    const ver = rawView.getUint32(4, true);
    let bytes;
    if (encrypted) {
      if (password === undefined || password === null) {
        const err = new Error('Password required to open encrypted .iiwgl');
        err.code = 'NEED_PASSWORD'; throw err;
      }
      bytes = decryptBuffer(buffer, String(password), ver);
      const decPid = new DataView(bytes.buffer).getInt32(12, true);
      if (!(decPid >= 0 && decPid < 300)) {
        const err = new Error('Incorrect password for .iiwgl');
        err.code = 'BAD_PASSWORD'; throw err;
      }
    } else {
      bytes = new Uint8Array(buffer);
    }

    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = 12;
    const decUtf8 = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
    const ri = () => { const v = dv.getInt32(pos, true); pos += 4; return v; };
    const ru = () => { const v = dv.getUint32(pos, true); pos += 4; return v; };
    const rf = () => { const v = dv.getFloat32(pos, true); pos += 4; return v; };
    const rb = () => ri() > 0;
    const rs = () => {
      const n = ri();
      if (n < 0 || pos + n > bytes.length) throw new Error('Corrupt string length at ' + pos);
      const sub = bytes.subarray(pos, pos + n);
      pos += 4 * Math.ceil(n / 4);
      if (ver >= 5 && decUtf8) return decUtf8.decode(sub);
      if (ver >= 5) return Buffer.from(sub).toString('utf8');
      let s = ''; for (let i = 0; i < sub.length; i++) s += String.fromCharCode(sub[i]); return s;
    };

    const pid = rs(), ln = rs(), fn = rs(), dob = rs();
    const imageType = rs(), acquiredDate = rs();
    const optFlags = ver > 2 ? ri() : 3;
    const nObj = ri();
    let specular = 1, brightness = 1, softFocus = 1;
    if (ver >= 6) { specular = rf(); brightness = rf(); softFocus = rf(); }
    else { for (let i = 0; i < 4; i++) ri(); }

    let clipKind = 0, clipInvert = false, clipPosition = 0, clipPlane = null;
    if (ver < 8) {
      ri(); clipKind = ri(); clipInvert = ri() > 0; ri(); clipPosition = ri() * -0.01;
    } else if (rb()) {
      clipKind = 4; clipPlane = [rf(), rf(), rf(), rf()];
    }

    const objects = [];
    for (let i = 0; i < nObj; i++) {
      const name = rs();
      const texLen = ri();
      let textureBytes = null;
      if (texLen > 0) {
        textureBytes = bytes.slice(pos, pos + texLen);
        pos += 4 * Math.ceil(texLen / 4);
      }
      const type = ver > 1 ? ri() : 0;
      let group;
      if (ver > 2) {
        group = ri();
      } else {
        group = (type === 210 || type === 227 || (type > 10 && type < 30) || (type > 50 && type < 70) ||
          type === 239 || type === 243 || type === 245) ? 0
          : (type === 211 || type === 228 || (type > 30 && type < 50) || (type > 70 && type < 90) ||
            type === 240 || type === 244 || type === 246) ? 1 : 2;
      }
      const transform = new Float32Array(16);
      if (ver > 2) { for (let k = 0; k < 16; k++) transform[k] = rf(); }
      else { transform[0] = transform[5] = transform[10] = transform[15] = 1; }

      const isVisible = rb();
      const faceColor = bgrToRgb01(ru()), backColor = bgrToRgb01(ru());
      if (ver < 6) { normOldRgb(faceColor); normOldRgb(backColor); }
      const useFaceColor = rb(), useBackColor = rb(), doClip = rb(), showCover = rb(), useTexture = rb();
      const textureIsOriginal = ver >= 6 ? rb() : true;
      const axisRot = rf(), opacity = rf();
      const bbox = { min: [rf(), rf(), rf()], max: [rf(), rf(), rf()] };

      const keys = { TRANS: [], VISIB: [], COLOR: [], ALPHA: [], VTPOS: [], VTCLR: [] };
      if (ver > 2) {
        const nk = ri();
        for (let k = 0; k < nk; k++) {
          const ko = JSON.parse(rs());
          if (ko && ko.type && keys[ko.type]) keys[ko.type].push(ko);
        }
        for (const ch in keys) keys[ch].sort((a, b) => a.frame - b.frame);
      }

      const composeBase = shouldComposeBase(transform, keys.TRANS, bbox);

      ri(); // mesh dummy
      const ctmLen = ri();
      let mesh = null;
      if (ctmLen > 0) {
        const ctm = new CTMRef.File(new CTMRef.Stream(bytes.subarray(pos, pos + ctmLen)));
        pos += 4 * Math.ceil(ctmLen / 4);
        const vCount = ctm.header.vertexCount;
        let vertexColors = null;
        const morphPositions = {}, morphColors = {};
        const uvs = (ctm.body.uvMaps && ctm.body.uvMaps.length) ? ctm.body.uvMaps[0].uv : null;

        if (ctm.body.attrMaps) {
          for (let g = 0; g < ctm.body.attrMaps.length; g++) {
            const am = ctm.body.attrMaps[g], aname = asciiName(am.name);
            if (aname === 'VertexColors') {
              const vc = extractAttr3(am.attr, vCount);
              if (ver < 6 && (type === 210 || type === 211 || type === 227 || type === 228 || (type >= 11 && type <= 85))) {
                let isOrig = false;
                if (type === 210 || type === 211) {
                  for (let p = 0; p < vc.length; p += 3) {
                    if ((vc[p] < 0.9 && Math.abs(vc[p] - 0.5) > 0.1) || Math.abs(vc[p + 1] - 0.5) > 0.1 || Math.abs(vc[p + 2] - 0.5) > 0.1) { isOrig = true; break; }
                  }
                }
                for (let p = 0; p < vc.length; p += 3) {
                  if (Math.abs(vc[p] - 0.5) <= 0.1 && Math.abs(vc[p + 1] - 0.5) <= 0.1 && Math.abs(vc[p + 2] - 0.5) <= 0.1) {
                    const f = isOrig ? 0.8 : 1.0; vc[p] = vc[p + 1] = vc[p + 2] = f;
                  }
                }
              }
              vertexColors = vc;
            } else if (aname.startsWith('AniVtxPos') || keys.VTPOS.some(k => k.data && k.data[0] === aname)) {
              morphPositions[aname] = extractAttr3(am.attr, vCount);
            } else if (aname.startsWith('AniVtxClr') || keys.VTCLR.some(k => k.data && k.data[0] === aname)) {
              const mc = extractAttr3(am.attr, vCount);
              if (ver < 6 && aname.startsWith('AniVtxClr')) {
                for (let p = 0; p < mc.length; p += 3) { const t = [mc[p], mc[p + 1], mc[p + 2]]; normOldRgb(t); mc[p] = t[0]; mc[p + 1] = t[1]; mc[p + 2] = t[2]; }
              }
              morphColors[aname] = mc;
            }
          }
        }
        mesh = {
          vertexCount: vCount,
          triangleCount: ctm.header.triangleCount,
          vertices: ctm.body.vertices,
          indices: ctm.body.indices,
          normals: ctm.body.normals || null,
          uvs: uvs,
          vertexColors: vertexColors,
          morphPositions: morphPositions,
          morphColors: morphColors
        };
      }
      objects.push({
        name, type, group, transform, composeBase, isVisible, faceColor, backColor,
        useFaceColor, useBackColor, doClip, showCover, useTexture, textureIsOriginal,
        axisRot, opacity, bbox, textureBytes, keys, mesh
      });
    }

    const playback = [];
    if (ver >= 3 && pos + 4 <= bytes.length) {
      const nPb = ri();
      for (let i = 0; i < nPb; i++) {
        const frame = ri(), pause = ri(), name = rs();
        const color = ver >= 6 ? bgrToRgb01(ru()) : [0, 0, 0];
        const moves = ver >= 6 ? ri() : 3;
        playback.push({ frame, pause, name, color, moves });
      }
    }
    if (!playback.length && objects.some(o => o.keys.TRANS.length)) {
      playback.push({ frame: 0, pause: 2000, name: 'Initial Malocclusion', color: [1, 0, 1], moves: 3 });
      playback.push({ frame: 1000, pause: 2000, name: 'Final V.T.O.', color: [1, 0, 1], moves: 3 });
    }
    const comment = (ver >= 4 && pos + 4 <= bytes.length) ? rs() : '';
    if (pos !== bytes.length) throw new Error(`IIWGL EOF mismatch: ${pos} != ${bytes.length}`);

    return {
      version: ver,
      hasPatientMeta: !!(pid || ln || fn || dob),
      imageType, acquiredDate, optFlags,
      specular, brightness, softFocus,
      clip: { kind: clipKind, invert: clipInvert, position: clipPosition, plane: clipPlane },
      objects, playback, comment
    };
  }

  // Convert 3x3 rotation inside column-major 4x4 matrix m into unit quaternion [x, y, z, w]
  function mat4ToQuat(m) {
    const m00 = m[0], m10 = m[1], m20 = m[2];
    const m01 = m[4], m11 = m[5], m21 = m[6];
    const m02 = m[8], m12 = m[9], m22 = m[10];
    const tr = m00 + m11 + m22;
    let x, y, z, w, s;
    if (tr > 0) {
      s = Math.sqrt(tr + 1) * 2;
      w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
    } else if (m00 > m11 && m00 > m22) {
      s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s;
    } else if (m11 > m22) {
      s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s;
    } else {
      s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s;
    }
    const n = Math.hypot(x, y, z, w) || 1;
    return [x / n, y / n, z / n, w / n];
  }

  function quatSlerp(a, b, t) {
    let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    if (dot < 0) { dot = -dot; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    let s0, s1;
    if (1 - dot > 1e-6) {
      const om = Math.acos(Math.min(1, dot)), sin = Math.sin(om);
      s0 = Math.sin((1 - t) * om) / sin; s1 = Math.sin(t * om) / sin;
    } else { s0 = 1 - t; s1 = t; }
    const x = s0 * a[0] + s1 * bx, y = s0 * a[1] + s1 * by, z = s0 * a[2] + s1 * bz, w = s0 * a[3] + s1 * bw;
    const n = Math.hypot(x, y, z, w) || 1;
    return [x / n, y / n, z / n, w / n];
  }

  function isIdentityMat4(m) {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        if (Math.abs(m[c * 4 + r] - (c === r ? 1 : 0)) > 1e-4) return false;
      }
    }
    return true;
  }

  function mat4MaxDiff(a, b) {
    let mx = 0;
    for (let i = 0; i < 16; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d > mx) mx = d;
    }
    return mx;
  }

  function shouldComposeBase(transform, transKeys, bbox) {
    if (!transKeys || !transKeys.length || isIdentityMat4(transform)) return false;
    if (transKeys.some(k => mat4MaxDiff(transform, k.data) <= 1e-3)) return false;
    const cx = (bbox.min[0] + bbox.max[0]) * 0.5;
    const cy = (bbox.min[1] + bbox.max[1]) * 0.5;
    const cz = (bbox.min[2] + bbox.max[2]) * 0.5;
    const bboxNearOrigin = Math.hypot(cx, cy, cz) < 2.5;
    const baseShiftsAway = Math.hypot(transform[12], transform[13], transform[14]) > 4.0;
    return bboxNearOrigin && baseShiftsAway;
  }

  function mulMat4(a, b, out) {
    const t = out === a || out === b ? new Float32Array(16) : out;
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      for (let r = 0; r < 4; r++) {
        t[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
      }
    }
    if (t !== out) out.set(t);
    return out;
  }

  function xformPt(m, p) {
    return [
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
    ];
  }

  const _animTmp = new Float32Array(16);
  function evalObjectTransform(obj, frame, out) {
    if (!obj.keys.TRANS || !obj.keys.TRANS.length) { out.set(obj.transform); return out; }
    if (!obj.composeBase) return evalTransform(obj.keys.TRANS, frame, obj.bbox, out);
    const c = [
      (obj.bbox.min[0] + obj.bbox.max[0]) * 0.5,
      (obj.bbox.min[1] + obj.bbox.max[1]) * 0.5,
      (obj.bbox.min[2] + obj.bbox.max[2]) * 0.5
    ];
    const cw = xformPt(obj.transform, c);
    evalTransform(obj.keys.TRANS, frame, { min: cw, max: cw }, _animTmp);
    return mulMat4(_animTmp, obj.transform, out);
  }

  function evalTransform(keys, frame, bbox, out) {
    if (!keys || !keys.length) return null;
    if (frame <= keys[0].frame) { out.set(keys[0].data); return out; }
    const last = keys[keys.length - 1];
    if (frame >= last.frame) { out.set(last.data); return out; }
    let i = 0; while (keys[i].frame < frame) i++;
    const k0 = keys[i - 1], k1 = keys[i];
    if (k1.intp === 'step') { out.set(frame === k1.frame ? k1.data : k0.data); return out; }
    const span = k1.frame - k0.frame;
    if (span <= 0) { out.set(k1.data); return out; }
    const t = (frame - k0.frame) / span;
    const q = quatSlerp(mat4ToQuat(k0.data), mat4ToQuat(k1.data), t);
    const c = [(bbox.min[0] + bbox.max[0]) * 0.5, (bbox.min[1] + bbox.max[1]) * 0.5, (bbox.min[2] + bbox.max[2]) * 0.5];
    const p0 = xformPt(k0.data, c), p1 = xformPt(k1.data, c);
    const px = p0[0] + (p1[0] - p0[0]) * t, py = p0[1] + (p1[1] - p0[1]) * t, pz = p0[2] + (p1[2] - p0[2]) * t;
    const [qx, qy, qz, qw] = q;
    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2;
    const wx = qw * x2, wy = qw * y2, wz = qw * z2;
    out[0] = 1 - (yy + zz); out[1] = xy + wz; out[2] = xz - wy; out[3] = 0;
    out[4] = xy - wz; out[5] = 1 - (xx + zz); out[6] = yz + wx; out[7] = 0;
    out[8] = xz + wy; out[9] = yz - wx; out[10] = 1 - (xx + yy); out[11] = 0;
    out[12] = px - (out[0] * c[0] + out[4] * c[1] + out[8] * c[2]);
    out[13] = py - (out[1] * c[0] + out[5] * c[1] + out[9] * c[2]);
    out[14] = pz - (out[2] * c[0] + out[6] * c[1] + out[10] * c[2]);
    out[15] = 1;
    return out;
  }

  function evalVisib(keys, frame, fallback) {
    if (!keys || !keys.length) return fallback;
    if (frame <= keys[0].frame) return keys[0].data[0] > 0;
    const last = keys[keys.length - 1];
    if (frame >= last.frame) return last.data[0] > 0;
    let i = 0; while (keys[i].frame < frame) i++;
    return (frame === keys[i].frame ? keys[i] : keys[i - 1]).data[0] > 0;
  }

  function evalScalar(keys, frame, fallback) {
    if (!keys || !keys.length) return fallback;
    if (frame <= keys[0].frame) return keys[0].data[0];
    const last = keys[keys.length - 1];
    if (frame >= last.frame) return last.data[0];
    let i = 0; while (keys[i].frame < frame) i++;
    const k0 = keys[i - 1], k1 = keys[i];
    if (k1.intp === 'step') return frame === k1.frame ? k1.data[0] : k0.data[0];
    const span = k1.frame - k0.frame;
    if (span <= 0) return k1.data[0];
    const t = (frame - k0.frame) / span;
    return k0.data[0] * (1 - t) + k1.data[0] * t;
  }

  function evalColor(keys, frame, fallback) {
    if (!keys || !keys.length) return fallback;
    const toRgb = k => [k.data[0] / 255, k.data[1] / 255, k.data[2] / 255];
    if (frame <= keys[0].frame) return toRgb(keys[0]);
    const last = keys[keys.length - 1];
    if (frame >= last.frame) return toRgb(last);
    let i = 0; while (keys[i].frame < frame) i++;
    const k0 = keys[i - 1], k1 = keys[i];
    if (k1.intp === 'step') return toRgb(frame === k1.frame ? k1 : k0);
    const span = k1.frame - k0.frame;
    if (span <= 0) return toRgb(k1);
    const t = (frame - k0.frame) / span, c0 = toRgb(k0), c1 = toRgb(k1);
    return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
  }

  function evalMorph(keys, frame) {
    if (!keys || !keys.length) return null;
    if (frame <= keys[0].frame) return { a: keys[0].data[0], b: keys[0].data[0], t: 0 };
    const last = keys[keys.length - 1];
    if (frame >= last.frame) return { a: last.data[0], b: last.data[0], t: 0 };
    let i = 0; while (keys[i].frame < frame) i++;
    const k0 = keys[i - 1], k1 = keys[i];
    if (k1.intp === 'step') { const n = (frame === k1.frame ? k1 : k0).data[0]; return { a: n, b: n, t: 0 }; }
    const span = k1.frame - k0.frame;
    if (span <= 0) return { a: k1.data[0], b: k1.data[0], t: 0 };
    return { a: k0.data[0], b: k1.data[0], t: (frame - k0.frame) / span };
  }

  /** Compute normalized incisal (0) to cervical (1) vertex gradient along arch Y axis. */
  function computeToothGradient(positions, group) {
    const n = positions.length / 3;
    const out = new Float32Array(n);
    if (!n) return out;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < positions.length; i += 3) {
      const y = positions[i];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const span = maxY - minY || 1;
    const isLower = group === 1;
    for (let i = 0; i < n; i++) {
      const y = positions[i * 3 + 1];
      out[i] = isLower ? (maxY - y) / span : (y - minY) / span;
    }
    return out;
  }

  /** Build a 1 mm voxel proximity field around tooth samples and trilinearly sample at gum vertices. */
  function computeGumMarginGradient(gumWorldPos, toothSamplePos, radiusMm = 2.8) {
    const n = gumWorldPos.length / 3;
    const out = new Float32Array(n);
    if (!n || !toothSamplePos.length) return out;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const arr of [toothSamplePos, gumWorldPos]) {
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i], y = arr[i + 1], z = arr[i + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }
    const pad = Math.ceil(radiusMm) + 1;
    minX -= pad; minY -= pad; minZ -= pad;
    const nx = Math.max(2, Math.ceil(maxX + pad - minX) + 1);
    const ny = Math.max(2, Math.ceil(maxY + pad - minY) + 1);
    const nz = Math.max(2, Math.ceil(maxZ + pad - minZ) + 1);
    const grid = new Float32Array(nx * ny * nz);
    const rCeil = Math.ceil(radiusMm), rSq = radiusMm * radiusMm, strideY = nx, strideZ = nx * ny;

    for (let i = 0; i < toothSamplePos.length; i += 3) {
      const gx = toothSamplePos[i] - minX, gy = toothSamplePos[i + 1] - minY, gz = toothSamplePos[i + 2] - minZ;
      const ix = Math.round(gx), iy = Math.round(gy), iz = Math.round(gz);
      const x0 = Math.max(0, ix - rCeil), x1 = Math.min(nx - 1, ix + rCeil);
      const y0 = Math.max(0, iy - rCeil), y1 = Math.min(ny - 1, iy + rCeil);
      const z0 = Math.max(0, iz - rCeil), z1 = Math.min(nz - 1, iz + rCeil);
      for (let z = z0; z <= z1; z++) {
        const dz = z - gz, dz2 = dz * dz;
        for (let y = y0; y <= y1; y++) {
          const dy = y - gy, dyz2 = dz2 + dy * dy;
          if (dyz2 >= rSq) continue;
          let idx = z * strideZ + y * strideY + x0;
          for (let x = x0; x <= x1; x++, idx++) {
            const dx = x - gx, d2 = dyz2 + dx * dx;
            if (d2 < rSq) {
              const w = 1 - Math.sqrt(d2) / radiusMm;
              if (w > grid[idx]) grid[idx] = w;
            }
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const fx = Math.max(0, Math.min(nx - 1.001, gumWorldPos[i * 3] - minX));
      const fy = Math.max(0, Math.min(ny - 1.001, gumWorldPos[i * 3 + 1] - minY));
      const fz = Math.max(0, Math.min(nz - 1.001, gumWorldPos[i * 3 + 2] - minZ));
      const x0 = fx | 0, y0 = fy | 0, z0 = fz | 0;
      const tx = fx - x0, ty = fy - y0, tz = fz - z0;
      const idx = z0 * strideZ + y0 * strideY + x0;
      const c00 = grid[idx] * (1 - tx) + grid[idx + 1] * tx;
      const c10 = grid[idx + strideY] * (1 - tx) + grid[idx + strideY + 1] * tx;
      const c01 = grid[idx + strideZ] * (1 - tx) + grid[idx + strideZ + 1] * tx;
      const c11 = grid[idx + strideZ + strideY] * (1 - tx) + grid[idx + strideZ + strideY + 1] * tx;
      const c0 = c00 * (1 - ty) + c10 * ty;
      const c1 = c01 * (1 - ty) + c11 * ty;
      out[i] = c0 * (1 - tz) + c1 * tz;
    }
    return out;
  }

  const UPPER_FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const LOWER_FDI = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  function toothWorldCenter(o, frame, matOut) {
    evalObjectTransform(o, frame, matOut);
    const b = o.bbox;
    return xformPt(matOut, [(b.min[0] + b.max[0]) * 0.5, (b.min[1] + b.max[1]) * 0.5, (b.min[2] + b.max[2]) * 0.5]);
  }

  function worldToLocalRigid(m, p) {
    const dx = p[0] - m[12], dy = p[1] - m[13], dz = p[2] - m[14];
    const sx = m[0] * m[0] + m[1] * m[1] + m[2] * m[2] || 1;
    const sy = m[4] * m[4] + m[5] * m[5] + m[6] * m[6] || 1;
    const sz = m[8] * m[8] + m[9] * m[9] + m[10] * m[10] || 1;
    return [
      (m[0] * dx + m[1] * dy + m[2] * dz) / sx,
      (m[4] * dx + m[5] * dy + m[6] * dz) / sy,
      (m[8] * dx + m[9] * dy + m[10] * dz) / sz
    ];
  }

  function quatMul(a, b) {
    return [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
    ];
  }

  function frameToStageIdx(playback, frame) {
    if (!playback || !playback.length) return 0;
    for (let i = 1; i < playback.length; i++) {
      if (playback[i].frame >= frame) return i;
    }
    return playback.length > 1 ? playback.length - 1 : 0;
  }

  /** Extract interproximal reduction (IPR / R.I.P.) contacts from tooth VTPOS morph deltas. */
  function extractIPR(model) {
    if (!model || !model.objects) return [];
    const byFdi = new Map();
    for (const o of model.objects) {
      if (o.type >= 11 && o.type <= 85 && o.mesh) byFdi.set(o.type, o);
    }
    const mA = new Float32Array(16), mB = new Float32Array(16);
    const findNeighbor = (order, idx, dir) => {
      for (let i = idx + dir; i >= 0 && i < order.length; i += dir) {
        if (byFdi.has(order[i])) return byFdi.get(order[i]);
      }
      return null;
    };

    const clusters = [];
    for (const o of byFdi.values()) {
      const vt = o.keys.VTPOS;
      if (!vt || vt.length < 2) continue;
      const order = o.group === 1 ? LOWER_FDI : UPPER_FDI;
      const idx = order.indexOf(o.type);
      if (idx < 0) continue;
      const nL = findNeighbor(order, idx, -1);
      const nR = findNeighbor(order, idx, 1);
      if (!nL && !nR) continue;

      for (let k = 1; k < vt.length; k++) {
        const prev = o.mesh.morphPositions[vt[k - 1].data[0]];
        const cur = o.mesh.morphPositions[vt[k].data[0]];
        if (!prev || !cur || prev === cur) continue;
        const frame = vt[k].frame;
        evalObjectTransform(o, frame, mA);
        const cL = nL ? toothWorldCenter(nL, frame, mB) : null;
        const cR = nR ? toothWorldCenter(nR, frame, mB) : null;

        let cntL = 0, maxL = 0, sxL = 0, syL = 0, szL = 0;
        let cntR = 0, maxR = 0, sxR = 0, syR = 0, szR = 0;
        for (let i = 0; i < cur.length; i += 3) {
          const d = Math.hypot(cur[i] - prev[i], cur[i + 1] - prev[i + 1], cur[i + 2] - prev[i + 2]);
          if (d <= 0.025) continue;
          const wx = mA[0] * cur[i] + mA[4] * cur[i + 1] + mA[8] * cur[i + 2] + mA[12];
          const wy = mA[1] * cur[i] + mA[5] * cur[i + 1] + mA[9] * cur[i + 2] + mA[13];
          const wz = mA[2] * cur[i] + mA[6] * cur[i + 1] + mA[10] * cur[i + 2] + mA[14];
          let toLeft = !!cL;
          if (cL && cR) {
            const dL2 = (wx - cL[0]) ** 2 + (wy - cL[1]) ** 2 + (wz - cL[2]) ** 2;
            const dR2 = (wx - cR[0]) ** 2 + (wy - cR[1]) ** 2 + (wz - cR[2]) ** 2;
            toLeft = dL2 <= dR2;
          }
          if (toLeft) {
            cntL++; if (d > maxL) maxL = d; sxL += wx; syL += wy; szL += wz;
          } else {
            cntR++; if (d > maxR) maxR = d; sxR += wx; syR += wy; szR += wz;
          }
        }
        if (cntL >= 8 && maxL >= 0.04 && nL) {
          clusters.push({ fdiA: o.type, fdiB: nL.type, group: o.group, frame, maxD: maxL, worldPt: [sxL / cntL, syL / cntL, szL / cntL] });
        }
        if (cntR >= 8 && maxR >= 0.04 && nR) {
          clusters.push({ fdiA: o.type, fdiB: nR.type, group: o.group, frame, maxD: maxR, worldPt: [sxR / cntR, syR / cntR, szR / cntR] });
        }
      }
    }

    const used = new Uint8Array(clusters.length);
    const out = [];
    const frame0 = model.playback && model.playback.length ? model.playback[0].frame : 0;
    for (let i = 0; i < clusters.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const a = clusters[i];
      let partner = null;
      for (let j = i + 1; j < clusters.length; j++) {
        if (used[j]) continue;
        const b = clusters[j];
        if (b.fdiA === a.fdiB && b.fdiB === a.fdiA && Math.abs(b.frame - a.frame) <= 5) {
          used[j] = 1;
          partner = b;
          break;
        }
      }
      const f1 = Math.min(a.fdiA, a.fdiB), f2 = Math.max(a.fdiA, a.fdiB);
      const primary = byFdi.get(f1) || byFdi.get(a.fdiA);
      const frame = partner ? Math.round((a.frame + partner.frame) * 0.5) : a.frame;
      const rawMm = partner ? a.maxD + partner.maxD : a.maxD;
      const mm = Math.max(0.1, Math.round(rawMm * 20) / 20);
      const wp = partner
        ? [(a.worldPt[0] + partner.worldPt[0]) * 0.5, (a.worldPt[1] + partner.worldPt[1]) * 0.5, (a.worldPt[2] + partner.worldPt[2]) * 0.5]
        : a.worldPt.slice();
      evalObjectTransform(primary, frame, mA);
      const localAnchorA = worldToLocalRigid(mA, wp);
      evalObjectTransform(primary, frame0, mB);
      const worldPos0 = xformPt(mB, localAnchorA);
      out.push({
        id: `${f1}-${f2}`,
        fdiA: f1,
        fdiB: f2,
        group: a.group,
        frame,
        stageIdx: frameToStageIdx(model.playback, frame),
        mm: +mm.toFixed(2),
        localAnchorA,
        worldPos0
      });
    }
    return out.sort((x, y) => x.stageIdx - y.stageIdx || x.group - y.group || x.fdiA - y.fdiA);
  }

  /** Compute per-tooth clinical movements, plausibility flags, and per-stage arch activity. */
  function computeToothMovements(model) {
    const pbs = (model && model.playback && model.playback.length) ? model.playback : [{ frame: 0, moves: 0 }];
    const frame0 = pbs[0].frame, frameEnd = pbs[pbs.length - 1].frame;
    const teethObjs = (model && model.objects || []).filter(o => o.type >= 11 && o.type <= 85 && o.mesh);
    const m0 = new Float32Array(16), m1 = new Float32Array(16);

    const archStats = g => {
      const pts = [];
      let sumX = 0, sumY = 0, minZ = Infinity, maxZ = -Infinity;
      for (const o of teethObjs) {
        if (o.group !== g) continue;
        const c = toothWorldCenter(o, frame0, m0);
        pts.push(c);
        sumX += c[0]; sumY += c[1];
        if (c[2] < minZ) minZ = c[2];
        if (c[2] > maxZ) maxZ = c[2];
      }
      if (!pts.length) return [0, 0, -5];
      return [sumX / pts.length, sumY / pts.length, minZ + 0.35 * (maxZ - minZ)];
    };
    const acU = archStats(0), acL = archStats(1);

    const teeth = teethObjs.map(o => {
      const p0 = toothWorldCenter(o, frame0, m0);
      const q0 = mat4ToQuat(m0);
      const p1 = toothWorldCenter(o, frameEnd, m1);
      const q1 = mat4ToQuat(m1);
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
      const transMm = Math.hypot(dx, dy, dz);
      const qRel = quatMul([-q0[0], -q0[1], -q0[2], q0[3]], q1);
      const rotDeg = 2 * Math.acos(Math.min(1, Math.abs(qRel[3]))) * (180 / Math.PI);

      const ac = o.group === 1 ? acL : acU;
      let rx = p0[0] - ac[0], rz = p0[2] - ac[2];
      const rLen = Math.hypot(rx, rz) || 1;
      rx /= rLen; rz /= rLen;
      const buccalMm = dx * rx + dz * rz;
      const tx = -rz, tz = rx;
      const mesialRaw = dx * tx + dz * tz;
      const sideSign = ((Math.floor(o.type / 10) % 4 === 1 || Math.floor(o.type / 10) % 4 === 3) ? 1 : -1) * (o.group === 1 ? -1 : 1);
      const mesialMm = mesialRaw * sideSign;
      const intrusionMm = o.group === 0 ? dy : -dy;

      const plausibility = (transMm > 4 || rotDeg > 30) ? 'implausible'
        : (transMm > 2 || rotDeg > 15) ? 'high' : 'normal';
      return {
        fdi: o.type,
        group: o.group,
        transMm: +transMm.toFixed(2),
        rotDeg: +rotDeg.toFixed(1),
        intrusionMm: +intrusionMm.toFixed(2),
        buccalMm: +buccalMm.toFixed(2),
        mesialMm: +mesialMm.toFixed(2),
        plausibility
      };
    }).sort((a, b) => a.group - b.group || a.fdi - b.fdi);

    // Cache per-stage center/quaternion once to compute active/passive/overLimit flags
    const stepPos = pbs.map(p => teethObjs.map(o => ({
      c: toothWorldCenter(o, p.frame, m0),
      q: mat4ToQuat(m0),
      g: o.group
    })));
    const stageMeta = pbs.map((p, s) => {
      if (s === 0) return { upperActive: false, lowerActive: false, upperPassive: false, lowerPassive: false, overLimit: false };
      let uMove = false, lMove = false, overLimit = false;
      const prev = stepPos[s - 1], cur = stepPos[s];
      for (let i = 0; i < teethObjs.length; i++) {
        const d = Math.hypot(cur[i].c[0] - prev[i].c[0], cur[i].c[1] - prev[i].c[1], cur[i].c[2] - prev[i].c[2]);
        const qRel = quatMul([-prev[i].q[0], -prev[i].q[1], -prev[i].q[2], prev[i].q[3]], cur[i].q);
        const deg = 2 * Math.acos(Math.min(1, Math.abs(qRel[3]))) * (180 / Math.PI);
        if (d > 0.03 || deg > 0.25) {
          if (cur[i].g === 1) lMove = true;
          else uMove = true;
        }
        if (d > 0.45 || deg > 3.5) overLimit = true;
      }
      if (!uMove && !lMove && p.moves) {
        uMove = !!(p.moves & 1);
        lMove = !!(p.moves & 2);
      }
      return { upperActive: uMove, lowerActive: lMove, upperPassive: false, lowerPassive: false, overLimit };
    });

    const uHasAny = stageMeta.some((m, i) => i > 0 && m.upperActive);
    const lHasAny = stageMeta.some((m, i) => i > 0 && m.lowerActive);
    for (let s = 1; s < stageMeta.length; s++) {
      let uFuture = false, lFuture = false;
      for (let k = s + 1; k < stageMeta.length; k++) {
        if (stageMeta[k].upperActive) uFuture = true;
        if (stageMeta[k].lowerActive) lFuture = true;
      }
      if (!stageMeta[s].upperActive && uHasAny && (stageMeta[s].lowerActive || uFuture)) stageMeta[s].upperPassive = true;
      if (!stageMeta[s].lowerActive && lHasAny && (stageMeta[s].upperActive || lFuture)) stageMeta[s].lowerPassive = true;
    }

    return { teeth, stageMeta };
  }

  /** Weld vertices on a 0.001 mm grid, compute area-weighted normals, and run Laplacian smoothing. */
  function smoothNormalsArray(positions, indices, passes) {
    const vCount = positions.length / 3;
    const out = new Float32Array(positions.length);
    if (!vCount) return out;

    const weldMap = new Map();
    const weldId = new Int32Array(vCount);
    let wCount = 0;
    for (let v = 0; v < vCount; v++) {
      const i = v * 3;
      const key = `${Math.round(positions[i] * 1000)},${Math.round(positions[i + 1] * 1000)},${Math.round(positions[i + 2] * 1000)}`;
      let id = weldMap.get(key);
      if (id === undefined) { id = wCount++; weldMap.set(key, id); }
      weldId[v] = id;
    }

    let wn = new Float32Array(wCount * 3);
    const triCount = indices ? indices.length / 3 : vCount / 3;
    const nbrs = passes > 0 ? Array.from({ length: wCount }, () => []) : null;
    const link = (a, b) => {
      if (a !== b && !nbrs[a].includes(b)) { nbrs[a].push(b); nbrs[b].push(a); }
    };

    for (let t = 0; t < triCount; t++) {
      const i0 = indices ? indices[t * 3] : t * 3;
      const i1 = indices ? indices[t * 3 + 1] : t * 3 + 1;
      const i2 = indices ? indices[t * 3 + 2] : t * 3 + 2;
      const a3 = i0 * 3, b3 = i1 * 3, c3 = i2 * 3;
      const abx = positions[b3] - positions[a3], aby = positions[b3 + 1] - positions[a3 + 1], abz = positions[b3 + 2] - positions[a3 + 2];
      const acx = positions[c3] - positions[a3], acy = positions[c3 + 1] - positions[a3 + 1], acz = positions[c3 + 2] - positions[a3 + 2];
      const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
      const w0 = weldId[i0], w1 = weldId[i1], w2 = weldId[i2];
      wn[w0 * 3] += nx; wn[w0 * 3 + 1] += ny; wn[w0 * 3 + 2] += nz;
      wn[w1 * 3] += nx; wn[w1 * 3 + 1] += ny; wn[w1 * 3 + 2] += nz;
      wn[w2 * 3] += nx; wn[w2 * 3 + 1] += ny; wn[w2 * 3 + 2] += nz;
      if (nbrs) { link(w0, w1); link(w1, w2); link(w2, w0); }
    }

    for (let w = 0; w < wCount; w++) {
      const k = w * 3;
      const len = Math.hypot(wn[k], wn[k + 1], wn[k + 2]) || 1;
      wn[k] /= len; wn[k + 1] /= len; wn[k + 2] /= len;
    }

    if (passes > 0 && nbrs) {
      let next = new Float32Array(wn.length);
      for (let p = 0; p < passes; p++) {
        for (let w = 0; w < wCount; w++) {
          const k = w * 3, list = nbrs[w];
          let sx = wn[k], sy = wn[k + 1], sz = wn[k + 2];
          if (list.length) {
            let ax = 0, ay = 0, az = 0;
            for (let j = 0; j < list.length; j++) {
              const nk = list[j] * 3;
              ax += wn[nk]; ay += wn[nk + 1]; az += wn[nk + 2];
            }
            const wgt = 0.5 / list.length;
            sx += ax * wgt; sy += ay * wgt; sz += az * wgt;
          }
          const len = Math.hypot(sx, sy, sz) || 1;
          next[k] = sx / len; next[k + 1] = sy / len; next[k + 2] = sz / len;
        }
        const tmp = wn; wn = next; next = tmp;
      }
    }

    for (let v = 0; v < vCount; v++) {
      const k = v * 3, wk = weldId[v] * 3;
      out[k] = wn[wk]; out[k + 1] = wn[wk + 1]; out[k + 2] = wn[wk + 2];
    }
    return out;
  }

  /** Measure mesiodistal tooth widths, Bolton Anterior/Overall ratios, and intercanine/intermolar deltas. */
  function computeBoltonAndArch(model, frame) {
    const pbs = (model && model.playback && model.playback.length) ? model.playback : [{ frame: 0 }];
    const f0 = pbs[0].frame, fEnd = pbs[pbs.length - 1].frame;
    const fUse = frame !== undefined ? frame : f0;
    const byFdi = new Map();
    for (const o of (model && model.objects || [])) {
      if (o.type >= 11 && o.type <= 85 && o.mesh) byFdi.set(o.type, o);
    }
    const m = new Float32Array(16);
    const widths = {};

    for (const order of [UPPER_FDI, LOWER_FDI]) {
      const present = order.filter(id => byFdi.has(id));
      const centers = new Map();
      let sx = 0, sz = 0;
      for (const id of present) {
        const c = toothWorldCenter(byFdi.get(id), fUse, m);
        centers.set(id, c);
        sx += c[0]; sz += c[2];
      }
      const cx = present.length ? sx / present.length : 0;
      const cz = present.length ? sz / present.length : 0;

      for (let idx = 0; idx < present.length; idx++) {
        const id = present[idx], o = byFdi.get(id);
        let tx = 0, ty = 0, tz = 0;
        if (idx > 0 && idx < present.length - 1) {
          const pA = centers.get(present[idx - 1]), pB = centers.get(present[idx + 1]);
          tx = pB[0] - pA[0]; ty = pB[1] - pA[1]; tz = pB[2] - pA[2];
        } else if (present.length >= 2) {
          const pA = idx > 0 ? centers.get(present[idx - 1]) : centers.get(id);
          const pB = idx < present.length - 1 ? centers.get(present[idx + 1]) : centers.get(id);
          tx = pB[0] - pA[0]; ty = pB[1] - pA[1]; tz = pB[2] - pA[2];
        } else {
          const c = centers.get(id);
          tx = -(c[2] - cz); tz = c[0] - cx;
        }
        const tLen = Math.hypot(tx, ty, tz) || 1;
        tx /= tLen; ty /= tLen; tz /= tLen;

        evalObjectTransform(o, fUse, m);
        const lx = m[0] * tx + m[1] * ty + m[2] * tz;
        const ly = m[4] * tx + m[5] * ty + m[6] * tz;
        const lz = m[8] * tx + m[9] * ty + m[10] * tz;
        const v = o.mesh.vertices;
        let mn = Infinity, mx = -Infinity;
        for (let i = 0; i < v.length; i += 3) {
          const p = v[i] * lx + v[i + 1] * ly + v[i + 2] * lz;
          if (p < mn) mn = p;
          if (p > mx) mx = p;
        }
        widths[id] = +(mx - mn).toFixed(2);
      }
    }

    const calcBolton = (uIds, lIds, ideal) => {
      let uSum = 0, lSum = 0, complete = true;
      for (const id of uIds) { if (widths[id] > 0) uSum += widths[id]; else complete = false; }
      for (const id of lIds) { if (widths[id] > 0) lSum += widths[id]; else complete = false; }
      if (!complete || !uSum || !lSum) return { complete: false, upperSum: +uSum.toFixed(2), lowerSum: +lSum.toFixed(2), ratio: null, ideal, excessMm: null, excessArch: null };
      const ratio = (lSum / uSum) * 100;
      const excessArch = ratio > ideal ? 'lower' : 'upper';
      const excessMm = excessArch === 'lower' ? (lSum - uSum * (ideal / 100)) : (uSum - lSum / (ideal / 100));
      return { complete: true, upperSum: +uSum.toFixed(2), lowerSum: +lSum.toFixed(2), ratio: +ratio.toFixed(1), ideal, excessMm: +Math.abs(excessMm).toFixed(2), excessArch };
    };

    const distPair = (aId, bId, fr) => {
      const a = byFdi.get(aId), b = byFdi.get(bId);
      if (!a || !b) return null;
      const pA = toothWorldCenter(a, fr, m);
      const pB = toothWorldCenter(b, fr, new Float32Array(16));
      return Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]);
    };
    const spanDelta = (aId, bId) => {
      const initialMm = distPair(aId, bId, f0), finalMm = distPair(aId, bId, fEnd);
      if (initialMm === null || finalMm === null) return null;
      return { initialMm: +initialMm.toFixed(2), finalMm: +finalMm.toFixed(2), deltaMm: +(finalMm - initialMm).toFixed(2) };
    };

    return {
      widths,
      anterior6: calcBolton([13, 12, 11, 21, 22, 23], [43, 42, 41, 31, 32, 33], 77.2),
      overall12: calcBolton([16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26], [46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36], 91.3),
      archWidths: {
        upperCanine: spanDelta(13, 23),
        upperMolar: spanDelta(16, 26),
        lowerCanine: spanDelta(43, 33),
        lowerMolar: spanDelta(46, 36)
      }
    };
  }

  return { sha512Bytes, isEncrypted, decryptBuffer, parseIIWGL, isIdentityMat4, shouldComposeBase, mulMat4, evalTransform, evalObjectTransform, evalVisib, evalScalar, evalColor, evalMorph, computeToothGradient, computeGumMarginGradient, extractIPR, computeToothMovements, computeBoltonAndArch, smoothNormalsArray };
});

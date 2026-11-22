(function () {
  'use strict';

  importScripts('./iiwgl.js?v=11');

  /** Compute occlusal contact RGB per vertex using a 1.5 mm 3D spatial hash grid. */
  function computeContacts(upper, lower) {
    const CELL = 1.5, MAX_D = 1.0, MAX_D2 = MAX_D * MAX_D;
    const buildGrid = list => {
      const grid = new Map();
      let totalVerts = 0;
      for (const m of list) totalVerts += m.worldPos.length / 3;
      const step = totalVerts > 120000 ? 2 : 1;
      for (const m of list) {
        const arr = m.worldPos;
        for (let i = 0; i < arr.length; i += 3 * step) {
          const cx = Math.floor(arr[i] / CELL), cy = Math.floor(arr[i + 1] / CELL), cz = Math.floor(arr[i + 2] / CELL);
          const key = `${cx},${cy},${cz}`;
          let bucket = grid.get(key);
          if (!bucket) { bucket = []; grid.set(key, bucket); }
          bucket.push(arr[i], arr[i + 1], arr[i + 2]);
        }
      }
      return grid;
    };

    const gLower = buildGrid(lower);
    const gUpper = buildGrid(upper);

    const colorMesh = (worldPos, oppGrid) => {
      const n = worldPos.length / 3;
      const clr = new Float32Array(worldPos.length);
      for (let i = 0; i < n; i++) {
        const p = i * 3;
        const x = worldPos[p], y = worldPos[p + 1], z = worldPos[p + 2];
        const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL);
        let minD2 = MAX_D2;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const bucket = oppGrid.get(`${cx + dx},${cy + dy},${cz + dz}`);
              if (!bucket) continue;
              for (let j = 0; j < bucket.length; j += 3) {
                const vx = bucket[j] - x, vy = bucket[j + 1] - y, vz = bucket[j + 2] - z;
                const d2 = vx * vx + vy * vy + vz * vz;
                if (d2 < minD2) minD2 = d2;
              }
            }
          }
        }
        if (minD2 >= MAX_D2) {
          clr[p] = 1; clr[p + 1] = 1; clr[p + 2] = 1;
        } else {
          const d = Math.sqrt(minD2);
          if (d < 0.15) {
            clr[p] = 0.95; clr[p + 1] = 0.12; clr[p + 2] = 0.10;
          } else if (d < 0.45) {
            const t = (d - 0.15) / 0.30;
            clr[p] = 0.95 + 0.03 * t; clr[p + 1] = 0.12 + 0.60 * t; clr[p + 2] = 0.10 - 0.02 * t;
          } else {
            const t = (d - 0.45) / 0.55;
            clr[p] = 0.98 - 0.84 * t; clr[p + 1] = 0.72 + 0.10 * t; clr[p + 2] = 0.08 + 0.28 * t;
          }
        }
      }
      return clr;
    };

    const results = [];
    const transfers = [];
    for (const m of upper) {
      const colors = colorMesh(m.worldPos, gLower);
      results.push({ id: m.id, colors });
      transfers.push(colors.buffer);
    }
    for (const m of lower) {
      const colors = colorMesh(m.worldPos, gUpper);
      results.push({ id: m.id, colors });
      transfers.push(colors.buffer);
    }
    return { results, transfers };
  }

  self.onmessage = function (ev) {
    const msg = ev.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'smoothNormals') {
      const normals = self.IIWGL.smoothNormalsArray(msg.positions, msg.indices, msg.passes | 0);
      self.postMessage(
        { type: 'smoothNormals', gen: msg.gen, id: msg.id, morphKey: msg.morphKey || null, normals },
        [normals.buffer]
      );
    } else if (msg.type === 'occlusalContacts') {
      const { results, transfers } = computeContacts(msg.upper, msg.lower);
      self.postMessage({ type: 'occlusalContacts', gen: msg.gen, frameKey: msg.frameKey, results }, transfers);
    }
  };
})();

(function () {
  'use strict';

  const PLAY_BASE_RATE = 2.5;
  const ORTHO_FOV = 5;
  const ORTHO_HALF_TAN = Math.tan((ORTHO_FOV * 0.5) * Math.PI / 180);
  const $ = id => document.getElementById(id);
  const railWidth = () => (window.innerWidth <= 768 ? 50 : 64);

  const I18N = {
    en: {
      views: {
        front: 'Front', upper: 'Upper', lower: 'Lower', left: 'Left', right: 'Right',
        maxilla: 'Maxil.', mandible: 'Mandib.', occlusion: 'Occlus.', multi: 'Multi'
      },
      tips: {
        att: 'Attachments', ipr: 'R.I.P. / IPR', contact: 'Occlusal Contacts (H)',
        ghost: 'Step 0 Ghost', grid: 'Grid Line / 1mm Ruler (G)', caliper: '3D Ruler (M)',
        clip: 'Cross-Section Slicer (C)', compare: 'Split Compare', panel: 'Clinical Analytics',
        export: 'Export', open: 'Open .iiwgl', theme: 'Light / Dark Theme'
      },
      setupSub: '3D Treatment Setup', stepsLabel: 'Steps', staticLabel: 'Static 3D',
      ctrlFirst: 'First Stage', ctrlPrev: 'Previous Stage', ctrlPlay: 'Play / Pause',
      ctrlNext: 'Next Stage', ctrlLast: 'Final Stage', ctrlLoop: 'Loop Playback',
      dlMsg: 'Downloading 3D case\u2026', finMsg: 'Finalizing cloud upload\u2026', decMsg: 'Decoding 3D meshes\u2026',
      loadTitle: 'Load 3D Treatment Plan',
      loadDesc: 'Drop an OnyxCeph <code>.iiwgl</code> export here or select a file to inspect.',
      dropZone: 'Click or drag &amp; drop a <strong>.iiwgl</strong> file',
      encTitle: 'Encrypted Case',
      encDesc: 'Enter the case password to unlock this 3D treatment setup.',
      pwdPlaceholder: 'Case password', unlockBtn: 'Unlock & Render',
      clipTitle: 'Cross-Section Slicer', clipOff: 'Off', clipAxial: 'Axial', clipSag: 'Sagittal', clipCor: 'Coronal', clipFlip: 'Flip',
      expTitle: 'Export', expStl: 'STL Mesh (Current Stage)', expPng: 'Screenshot PNG', expJson: 'Clinical JSON Report',
      drawerTitle: 'Clinical Analytics', tabMov: 'Movements', tabBol: 'Bolton / IPR', tabAna: 'Anatomy',
      rulerHint: 'Click 2 points', stepPauseOn: 'Step pause ON', stepPauseOff: 'Step pause OFF',
      noIpr: 'No IPR contacts in this case', stlOk: 'STL exported', pngOk: 'PNG saved', jsonOk: 'JSON exported',
      attFull: 'Attachments: Full', attSubtle: 'Attachments: Subtle', attOff: 'Attachments: Hidden',
      cmpInitial: 'Initial \u00b7 Step 0', stepWord: 'Step'
    },
    fr: {
      views: {
        front: 'Face', upper: 'Haut', lower: 'Bas', left: 'Gauche', right: 'Droite',
        maxilla: 'Maxil.', mandible: 'Mandib.', occlusion: 'Occlus.', multi: 'Multi'
      },
      tips: {
        att: 'Taquets', ipr: 'R.I.P. / Stripping', contact: 'Contacts Occlusaux (H)',
        ghost: 'Fant\u00f4me \u00c9tape 0', grid: 'Grille / R\u00e8gle 1mm (G)', caliper: 'R\u00e8gle 3D (M)',
        clip: 'Plan de Coupe (C)', compare: 'Comparaison Split', panel: 'Analyse Clinique',
        export: 'Exporter', open: 'Ouvrir .iiwgl', theme: 'Th\u00e8me Clair / Sombre'
      },
      setupSub: 'Simulation 3D', stepsLabel: '\u00c9tapes', staticLabel: '3D Statique',
      ctrlFirst: 'Premi\u00e8re \u00e9tape', ctrlPrev: '\u00c9tape pr\u00e9c\u00e9dente', ctrlPlay: 'Lecture / Pause',
      ctrlNext: '\u00c9tape suivante', ctrlLast: 'Derni\u00e8re \u00e9tape', ctrlLoop: 'Lecture en boucle',
      dlMsg: 'T\u00e9l\u00e9chargement du cas 3D\u2026', finMsg: 'Finalisation de l\u2019envoi cloud\u2026', decMsg: 'D\u00e9codage des mod\u00e8les 3D\u2026',
      loadTitle: 'Charger un Plan de Traitement 3D',
      loadDesc: 'D\u00e9posez un fichier <code>.iiwgl</code> ici ou cliquez pour le s\u00e9lectionner.',
      dropZone: 'Cliquez ou glissez un fichier <strong>.iiwgl</strong>',
      encTitle: 'Cas Prot\u00e9g\u00e9',
      encDesc: 'Entrez le mot de passe du cas pour afficher la simulation 3D.',
      pwdPlaceholder: 'Mot de passe', unlockBtn: 'D\u00e9verrouiller',
      clipTitle: 'Plan de Coupe', clipOff: 'Off', clipAxial: 'Axial', clipSag: 'Sagittal', clipCor: 'Coronal', clipFlip: 'Inverser',
      expTitle: 'Exporter', expStl: 'Maillage STL (\u00c9tape active)', expPng: 'Capture PNG', expJson: 'Rapport JSON Clinique',
      drawerTitle: 'Analyse Clinique', tabMov: 'Mouvements', tabBol: 'Bolton / R.I.P.', tabAna: 'Anatomie',
      rulerHint: 'Cliquez 2 points', stepPauseOn: 'Pause par \u00e9tape ON', stepPauseOff: 'Pause par \u00e9tape OFF',
      noIpr: 'Aucun R.I.P. d\u00e9tect\u00e9', stlOk: 'STL export\u00e9', pngOk: 'PNG enregistr\u00e9', jsonOk: 'JSON export\u00e9',
      attFull: 'Taquets : Complets', attSubtle: 'Taquets : Discrets', attOff: 'Taquets : Masqu\u00e9s',
      cmpInitial: 'Initial \u00b7 \u00c9tape 0', stepWord: '\u00c9tape'
    }
  };

  const S = {
    model: null, customSub: null, objects: [], modelGen: 0,
    frame: 0, stepFloat: 0, targetStep: null, stepIdx: 0,
    playing: false, loop: false, speed: 1, stepPause: false, pauseUntil: 0,
    view: 'front', archFilter: 'both', lang: 'en',
    attMode: 'full', showIPR: false, showContact: false, showGhost: false,
    orthoGrid: false, caliperOn: false, compareMode: false,
    clipAxis: 'none', clipVal: 0, clipInvert: false,
    hiddenTeeth: new Set(), isolatedFdi: null,
    anatVis: { uGum: true, lGum: true, uTeeth: true, lTeeth: true, bones: true },
    ipr: [], movements: null, bolton: null, contactCache: new Map(),
    center: new THREE.Vector3(), upperCenter: new THREE.Vector3(), lowerCenter: new THREE.Vector3(),
    bboxMin: new THREE.Vector3(-30, -20, -25), bboxMax: new THREE.Vector3(30, 20, 25), radius: 40,
    pendingBuf: null, lastTick: 0, lastNormalTime: 0, dirtyUntil: 0, rafId: 0, orbiting: false,
    caliperPts: [],
    activeMultiKey: null,
    multiCells: {
      top: { dAz: 0, dEl: 0, zoom: 1 }, left: { dAz: 0, dEl: 0, zoom: 1 },
      center: { dAz: 0, dEl: 0, zoom: 1 }, right: { dAz: 0, dEl: 0, zoom: 1 },
      bottom: { dAz: 0, dEl: 0, zoom: 1 }
    }
  };

  let renderer, scene, cam, controls, rootGroup, ghostGroup, caliperGroup, envRT;
  let clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  let meshWorker = null, multiDrag = null, downPt = null, contactTimer = 0, toastTimer = 0, debugFps = false, inAnimate = false;
  let lastRulerSig = '';
  const raycaster = new THREE.Raycaster();
  const tmpMat = new Float32Array(16);

  const gov = {
    hist: [], idx: 0, dpr: 1, maxDpr: 1, dprLocked: false, preDropAvg: 0, dropAtCount: -1,
    fastStreak: 0, rendered: 0, skipped: 0, fpsCount: 0, lastFpsAt: 0,
    updateMaxDpr(W, H) {
      this.maxDpr = Math.min(window.devicePixelRatio || 1, 2, 1920 / Math.max(W, H, 1));
      if (this.dpr > this.maxDpr || !this.dpr) this.dpr = this.maxDpr;
      renderer.setPixelRatio(this.dpr);
    },
    record(dtMs, inMotion) {
      this.rendered++;
      this.fpsCount++;
      if (inMotion) {
        if (this.hist.length < 180) this.hist.push(dtMs);
        else { this.hist[this.idx] = dtMs; this.idx = (this.idx + 1) % 180; }
        if (dtMs < 14) this.fastStreak++; else this.fastStreak = 0;
        if (this.hist.length >= 30 && !this.dprLocked && (this.rendered % 30 === 0)) {
          let slow = 0, sum = 0, len = Math.min(30, this.hist.length);
          for (let i = 0; i < len; i++) {
            const v = this.hist[(this.idx - 1 - i + this.hist.length) % this.hist.length];
            sum += v;
            if (v > 22) slow++;
          }
          const avg = sum / len;
          if (this.dropAtCount > 0 && this.rendered - this.dropAtCount >= 30) {
            if ((this.preDropAvg - avg) / Math.max(1, this.preDropAvg) < 0.08) {
              this.dprLocked = true;
              this.dpr = this.maxDpr;
              renderer.setPixelRatio(this.dpr);
            }
            this.dropAtCount = -1;
          } else if (slow >= 20 && this.dpr > 0.75) {
            this.preDropAvg = avg;
            this.dropAtCount = this.rendered;
            this.dpr = Math.max(0.75, +(this.dpr - 0.25).toFixed(2));
            renderer.setPixelRatio(this.dpr);
          }
        }
        if (this.fastStreak >= 150 && this.dpr < this.maxDpr && !this.dprLocked) {
          this.dpr = this.maxDpr;
          this.fastStreak = 0;
          renderer.setPixelRatio(this.dpr);
        }
      }
      if (debugFps) {
        const now = performance.now();
        if (now - this.lastFpsAt >= 350) {
          const fps = Math.round((this.fpsCount * 1000) / Math.max(1, now - this.lastFpsAt));
          this.fpsCount = 0;
          this.lastFpsAt = now;
          const tris = renderer.info && renderer.info.render ? renderer.info.render.triangles : 0;
          $('fps-hud').textContent = `${fps} FPS \u00b7 ${dtMs.toFixed(1)}ms \u00b7 DPR ${this.dpr.toFixed(2)} \u00b7 ${Math.round(tris / 1000)}k tris`;
        }
      }
    }
  };

  function showToast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
  }

  function markDirty(ms = 650) {
    if (!renderer) return;
    S.dirtyUntil = Math.max(S.dirtyUntil, performance.now() + ms);
    if (!S.rafId && !inAnimate) {
      S.lastTick = 0;
      S.rafId = requestAnimationFrame(animate);
    }
  }

  function setupStudioEnv() {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x0c0f14);
      const addBox = (col, pos, rot, sz) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(sz[0], sz[1]), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
        m.position.set(...pos); m.rotation.set(...rot); envScene.add(m);
      };
      addBox(0xfff9ee, [0, 22, 8], [Math.PI / 2, 0, 0], [18, 12]);
      addBox(0xdbeafe, [-24, 6, 14], [0, Math.PI / 2.6, 0], [10, 10]);
      addBox(0xfef3c7, [24, 6, 14], [0, -Math.PI / 2.6, 0], [10, 10]);
      envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;
      envScene.children.forEach(c => { c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); });
      pmrem.dispose();
    } catch (_) {}
  }

  function initMeshWorker() {
    if (meshWorker || typeof Worker === 'undefined') return;
    try {
      meshWorker = new Worker('js/meshWorker.js?v=3');
      meshWorker.onmessage = ev => {
        const msg = ev.data;
        if (!msg || msg.gen !== S.modelGen) return;
        if (msg.type === 'smoothNormals') {
          const e = S.objects[msg.id];
          if (!e) return;
          if (msg.morphKey) {
            if (!e.o.mesh.morphNormals) e.o.mesh.morphNormals = {};
            e.o.mesh.morphNormals[msg.morphKey] = msg.normals;
            if (e.normAttr0 && msg.morphKey === e.o.keys.VTPOS[0]?.data[0]) {
              e.normAttr0.array.set(msg.normals);
              e.normAttr0.needsUpdate = true;
            }
          } else {
            const nAttr = e.geo.attributes.normal;
            if (nAttr && nAttr.array.length === msg.normals.length) {
              nAttr.array.set(msg.normals);
              nAttr.needsUpdate = true;
              if (e.normAttr0) { e.normAttr0.array.set(msg.normals); e.normAttr0.needsUpdate = true; }
              markDirty(120);
            }
          }
        } else if (msg.type === 'occlusalContacts') {
          const map = new Map();
          for (const r of msg.results) map.set(r.id, r.colors);
          S.contactCache.set(msg.frameKey, map);
          if (S.showContact && Math.round(S.frame) === msg.frameKey) applyContactMap(map);
        }
      };
    } catch (_) { meshWorker = null; }
  }

  function initThree() {
    const vp = $('viewport');
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (_) {
      try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); }
      catch (_) { renderer = null; return false; }
    }
    gov.updateMaxDpr(vp.clientWidth, vp.clientHeight);
    renderer.setSize(vp.clientWidth, vp.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setScissorTest(false);
    vp.appendChild(renderer.domElement);

    renderer.domElement.addEventListener('webglcontextlost', ev => {
      ev.preventDefault(); S.playing = false; updatePlayIcons();
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      onResize();
      if (S.model) applyFrame(S.frame, true);
      markDirty();
    });

    scene = new THREE.Scene();
    setupStudioEnv();

    scene.add(new THREE.HemisphereLight(0xfcf8f0, 0x1e2430, 0.34));
    const key = new THREE.DirectionalLight(0xfffaf0, 0.92); key.position.set(26, 42, 58); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.28); fill.position.set(-55, 8, 35); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8c2, 0.32); rim.position.set(0, -36, -45); scene.add(rim);

    const asp = vp.clientWidth / Math.max(1, vp.clientHeight);
    cam = new THREE.PerspectiveCamera(ORTHO_FOV, asp, 40, 8000);
    cam.position.set(0, 0, 1200);

    controls = new THREE.OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.85; controls.panSpeed = 0.85; controls.zoomSpeed = 1.1;
    controls.minDistance = 200; controls.maxDistance = 5000;
    controls.addEventListener('start', () => { S.orbiting = true; markDirty(450); });
    controls.addEventListener('end', () => { S.orbiting = false; });
    controls.addEventListener('change', () => { markDirty(450); });

    rootGroup = new THREE.Group();
    ghostGroup = new THREE.Group(); ghostGroup.visible = false;
    caliperGroup = new THREE.Group();
    scene.add(rootGroup, ghostGroup, caliperGroup);

    window.addEventListener('resize', onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        document.documentElement.style.setProperty('--vvh', `${window.visualViewport.height}px`);
        onResize();
      });
    }

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', () => { multiDrag = null; downPt = null; });
    dom.addEventListener('dblclick', onCanvasDblClick);
    dom.addEventListener('wheel', onCanvasWheel, { passive: true });
    initMeshWorker();
    return true;
  }

  function onResize() {
    if (!renderer) return;
    const vp = $('viewport'), W = vp.clientWidth, H = vp.clientHeight;
    gov.updateMaxDpr(W, H);
    renderer.setSize(W, H);
    cam.aspect = W / Math.max(1, H);
    cam.updateProjectionMatrix();
    lastRulerSig = '';
    markDirty();
  }

  function makeMaterial(obj) {
    const t = obj.type, isTooth = t >= 11 && t <= 85;
    const isGingiva = t === 227 || t === 228;
    const isAtt = t === 107 || (obj.name && obj.name.indexOf(':') !== -1);
    const isMalocc = t === 210 || t === 211;
    const isBone = t === 245 || t === 246;
    const fc = new THREE.Color(obj.faceColor[0], obj.faceColor[1], obj.faceColor[2]);

    const hasVC = !!(obj.mesh && obj.mesh.vertexColors && obj.useTexture && !isGingiva);
    const props = { side: THREE.DoubleSide, vertexColors: isTooth || hasVC };

    if (isTooth) {
      const ec = new THREE.Color(0xebe4d4).convertSRGBToLinear();
      Object.assign(props, {
        color: hasVC ? new THREE.Color(0xf7f2e8).convertSRGBToLinear() : ec,
        roughness: 0.28, metalness: 0.0, clearcoat: 0.58, clearcoatRoughness: 0.16, envMapIntensity: 0.35
      });
    } else if (isGingiva) {
      Object.assign(props, {
        color: new THREE.Color(0xc4565e).convertSRGBToLinear(),
        roughness: 0.34, metalness: 0.0, clearcoat: 0.48, clearcoatRoughness: 0.20, envMapIntensity: 0.28,
        transparent: true, opacity: 0.85, depthWrite: true
      });
    } else if (isAtt) {
      const col = obj.useFaceColor ? fc.clone().convertSRGBToLinear() : new THREE.Color(0xcfa156).convertSRGBToLinear();
      Object.assign(props, {
        color: col, roughness: 0.24, metalness: 0.05, clearcoat: 0.65, clearcoatRoughness: 0.12, envMapIntensity: 0.40,
        transparent: false, opacity: 1
      });
    } else if (isMalocc) {
      Object.assign(props, { color: 0x14b8a6, roughness: 0.45, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
    } else if (isBone) {
      Object.assign(props, { color: new THREE.Color(0xd9ceb8).convertSRGBToLinear(), roughness: 0.55, metalness: 0, envMapIntensity: 0.2, transparent: obj.opacity < 1, opacity: obj.opacity });
    } else {
      Object.assign(props, { color: obj.useFaceColor ? fc.clone().convertSRGBToLinear() : 0xc0c8d2, roughness: 0.35, metalness: 0.1, clearcoat: 0.3, envMapIntensity: 0.35, transparent: obj.opacity < 1, opacity: obj.opacity });
    }

    if (obj.textureBytes && obj.useTexture) {
      const url = URL.createObjectURL(new Blob([obj.textureBytes], { type: 'image/jpeg' }));
      const tex = new THREE.TextureLoader().load(url, () => URL.revokeObjectURL(url));
      tex.encoding = THREE.sRGBEncoding; tex.flipY = true;
      props.map = tex; props.color = 0xffffff;
    }
    return new THREE.MeshPhysicalMaterial(props);
  }

  function buildGeometry(m, isTooth) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.vertices), 3));
    geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    if (m.normals) geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    else geo.computeVertexNormals();
    if (m.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
    if (m.vertexColors) {
      const vc = new Float32Array(m.vertexColors);
      if (isTooth) m.origColors = new Float32Array(vc);
      geo.setAttribute('color', new THREE.BufferAttribute(vc, 3));
    } else if (isTooth) {
      const ones = new Float32Array(m.vertices.length);
      ones.fill(1);
      m.origColors = new Float32Array(ones);
      geo.setAttribute('color', new THREE.BufferAttribute(ones, 3));
    }
    geo.computeBoundingBox();
    return geo;
  }

  function clearGroup(grp, disposeRes) {
    while (grp.children.length) {
      const c = grp.children[0];
      grp.remove(c);
      if (disposeRes) {
        if (c.geometry) c.geometry.dispose();
        if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
      }
    }
  }

  function clearScene() {
    clearGroup(rootGroup, true);
    clearGroup(ghostGroup, false);
    if (ghostGroup.userData.mat) { ghostGroup.userData.mat.dispose(); ghostGroup.userData.mat = null; }
    clearCaliper();
    S.objects = [];
    S.contactCache.clear();
  }

  function queueWorkerSmoothing(gen) {
    if (!meshWorker) return;
    S.objects.forEach((e, idx) => {
      if (!e.o.mesh || (!e.isTooth && !e.isGingiva)) return;
      const passes = e.isGingiva ? 5 : 1;
      const posCopy = new Float32Array(e.geo.attributes.position.array);
      const idxCopy = new Uint32Array(e.o.mesh.indices);
      meshWorker.postMessage({ type: 'smoothNormals', gen, id: idx, positions: posCopy, indices: idxCopy, passes }, [posCopy.buffer, idxCopy.buffer]);
    });
    setTimeout(() => {
      if (S.modelGen !== gen || !meshWorker) return;
      S.objects.forEach((e, idx) => {
        if (!e.isGingiva || !e.o.mesh || !e.o.mesh.morphPositions) return;
        const keys = Object.keys(e.o.mesh.morphPositions);
        // shortcut: cap pre-baked morph normals at 30 keyframes, upgrade to LRU cache if cases exceed 30 steps
        for (let i = 0; i < Math.min(30, keys.length); i++) {
          const mk = keys[i], mp = e.o.mesh.morphPositions[mk];
          if (!mp) continue;
          const posCopy = new Float32Array(mp);
          const idxCopy = new Uint32Array(e.o.mesh.indices);
          meshWorker.postMessage({ type: 'smoothNormals', gen, id: idx, morphKey: mk, positions: posCopy, indices: idxCopy, passes: 5 }, [posCopy.buffer, idxCopy.buffer]);
        }
      });
    }, 120);
  }

  function updateSubtitle() {
    const t = I18N[S.lang];
    if (S.customSub) { $('case-sub').textContent = S.customSub; return; }
    if (!S.model) { $('case-sub').textContent = t.setupSub; return; }
    const total = Math.max(0, S.model.playback.length - 1);
    $('case-sub').textContent = S.model.playback.length > 1 ? `${total} ${t.stepsLabel}` : t.staticLabel;
  }

  function updateAttStyle() {
    const t = I18N[S.lang];
    const btn = $('tool-att');
    btn.classList.toggle('active', S.attMode !== 'hidden');
    btn.classList.toggle('resin-mode', S.attMode === 'full');
    btn.setAttribute('aria-pressed', S.attMode !== 'hidden' ? 'true' : 'false');
    btn.setAttribute('data-tip', S.attMode === 'subtle' ? t.attSubtle : S.attMode === 'hidden' ? t.attOff : t.attFull);
    for (const e of S.objects) {
      if (!e.isAtt) continue;
      if (S.attMode === 'subtle') {
        e.mat.color.setHex(0xf1ece2).convertSRGBToLinear();
        e.mat.opacity = 0.42;
        if (!e.mat.transparent) { e.mat.transparent = true; e.mat.needsUpdate = true; }
      } else if (S.attMode === 'full') {
        if (e.origAttColor) e.mat.color.copy(e.origAttColor);
        e.mat.opacity = 1;
        if (e.mat.transparent) { e.mat.transparent = false; e.mat.needsUpdate = true; }
      }
    }
    applyFrame(S.frame, false);
  }

  function applyContactMap(map) {
    for (const e of S.objects) {
      if (!e.isTooth || !e.geo.attributes.color) continue;
      const clr = map.get(e.o.type);
      if (clr && clr.length === e.geo.attributes.color.array.length) {
        e.geo.attributes.color.array.set(clr);
        e.geo.attributes.color.needsUpdate = true;
      }
    }
    markDirty(200);
  }

  function requestContacts() {
    if (!S.showContact || !S.model || !meshWorker) return;
    const fk = Math.round(S.frame);
    const cached = S.contactCache.get(fk);
    if (cached) { applyContactMap(cached); return; }
    const upper = [], lower = [];
    for (const e of S.objects) {
      if (!e.isTooth || !e.geo.attributes.position) continue;
      const pos = e.geo.attributes.position.array;
      const worldPos = new Float32Array(pos.length);
      const m = e.mesh.matrix.elements;
      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        worldPos[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
        worldPos[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        worldPos[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      }
      const item = { id: e.o.type, worldPos };
      if (e.o.group === 1) lower.push(item); else upper.push(item);
    }
    const transfers = [...upper.map(x => x.worldPos.buffer), ...lower.map(x => x.worldPos.buffer)];
    meshWorker.postMessage({ type: 'occlusalContacts', gen: S.modelGen, frameKey: fk, upper, lower }, transfers);
  }

  function restoreOriginalContacts() {
    for (const e of S.objects) {
      if (!e.isTooth || !e.geo.attributes.color || !e.o.mesh.origColors) continue;
      e.geo.attributes.color.array.set(e.o.mesh.origColors);
      e.geo.attributes.color.needsUpdate = true;
    }
    markDirty(200);
  }

  function ensureGhostMeshes() {
    if (ghostGroup.children.length || !S.model) return;
    const frame0 = S.model.playback.length ? S.model.playback[0].frame : 0;
    const mat = new THREE.MeshBasicMaterial({
      color: 0x7aa2f7, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide
    });
    ghostGroup.userData.mat = mat;
    for (const e of S.objects) {
      if (!e.isTooth) continue;
      const gm = new THREE.Mesh(e.geo, mat);
      gm.matrixAutoUpdate = false;
      IIWGL.evalObjectTransform(e.o, frame0, tmpMat);
      gm.matrix.fromArray(tmpMat);
      gm.matrixWorldNeedsUpdate = true;
      gm.userData = { group: e.o.group, fdi: e.o.type };
      ghostGroup.add(gm);
    }
    updateClipPlane();
  }

  function loadModel(model, titleHint) {
    clearScene();
    S.model = model;
    S.modelGen++;
    S.playing = false; S.targetStep = null; S.stepFloat = 0; S.lastTick = 0;
    S.hiddenTeeth.clear(); S.isolatedFdi = null;
    S.anatVis = { uGum: true, lGum: true, uTeeth: true, lTeeth: true, bones: true };
    updatePlayIcons();

    const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const uMin = new THREE.Vector3(Infinity, Infinity, Infinity), uMax = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const lMin = new THREE.Vector3(Infinity, Infinity, Infinity), lMax = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const frame0 = model.playback.length ? model.playback[0].frame : 0;

    for (let i = 0; i < model.objects.length; i++) {
      const o = model.objects[i];
      if (!o.mesh) continue;
      const isAtt = o.type === 107 || (o.name && o.name.indexOf(':') !== -1);
      if (isAtt) o.type = 107;
      const isTooth = o.type >= 11 && o.type <= 85;
      const isMalocc = o.type === 210 || o.type === 211;

      const geo = buildGeometry(o.mesh, isTooth);
      const mat = makeMaterial(o);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      IIWGL.evalObjectTransform(o, frame0, tmpMat);
      mesh.matrix.fromArray(tmpMat);
      mesh.matrixWorldNeedsUpdate = true;
      mesh.visible = isMalocc ? false : o.isVisible;
      mesh.userData = { idx: i, o };
      rootGroup.add(mesh);

      const hasVTPOS = !!(o.keys.VTPOS && o.keys.VTPOS.length);
      const entry = {
        o, mesh, mat, geo, isAtt, isMalocc, isTooth,
        isGingiva: o.type === 227 || o.type === 228,
        isBone: o.type === 245 || o.type === 246,
        origAttColor: isAtt ? mat.color.clone() : null,
        mat0: new Float32Array(mesh.matrix.elements),
        posAttr0: hasVTPOS ? geo.attributes.position.clone() : null,
        normAttr0: hasVTPOS ? geo.attributes.normal.clone() : null,
        lastMorphPos: '', lastMorphClr: '', origOpacity: mat.opacity
      };
      S.objects.push(entry);

      if (!isMalocc) {
        const b = geo.boundingBox.clone().applyMatrix4(mesh.matrix);
        min.min(b.min); max.max(b.max);
        if (o.group === 0) { uMin.min(b.min); uMax.max(b.max); }
        else if (o.group === 1) { lMin.min(b.min); lMax.max(b.max); }
      }
    }

    if (!isFinite(min.x)) { min.set(-30, -20, -25); max.set(30, 20, 25); }
    S.bboxMin.copy(min); S.bboxMax.copy(max);
    S.center.addVectors(min, max).multiplyScalar(0.5);
    S.upperCenter.copy(isFinite(uMin.x) ? uMin.clone().add(uMax).multiplyScalar(0.5) : S.center);
    S.lowerCenter.copy(isFinite(lMin.x) ? lMin.clone().add(lMax).multiplyScalar(0.5) : S.center);
    S.radius = min.distanceTo(max) * 0.5 || 40;
    controls.target.copy(S.center);
    onResize();

    S.ipr = IIWGL.extractIPR(model);
    S.movements = IIWGL.computeToothMovements(model);
    S.bolton = IIWGL.computeBoltonAndArch(model, frame0);

    buildStageBar();
    S.showIPR = S.ipr.length > 0;
    $('tool-ipr').classList.toggle('active', S.showIPR);
    $('tool-ipr').setAttribute('aria-pressed', S.showIPR ? 'true' : 'false');
    buildDrawer();
    document.querySelector('.stage-dock').style.display = model.playback.length > 1 ? '' : 'none';
    $('case-title').textContent = titleHint || (model.imageType || I18N[S.lang].setupSub);
    updateSubtitle();

    S.stepIdx = -1;
    updateAttStyle();
    applyFrame(frame0, true);
    setCameraView('front');
    if (S.clipAxis !== 'none') updateClipPlane();
    markDirty(1200);

    const gen = S.modelGen;
    setTimeout(() => queueWorkerSmoothing(gen), 30);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage('{"type":"LOADING","value":"finished"}', '*');
    }
  }

  function applyMorphPair(buf, aMap, bMap, t) {
    if (!aMap) return;
    if (!bMap || aMap === bMap || t <= 0) { buf.set(aMap); return; }
    if (t >= 1) { buf.set(bMap); return; }
    const inv = 1 - t;
    for (let i = 0; i < buf.length; i++) buf[i] = aMap[i] * inv + bMap[i] * t;
  }

  function isEntryVisible(e, frame) {
    if (e.isMalocc) return false;
    let vis = IIWGL.evalVisib(e.o.keys.VISIB, frame, e.o.isVisible);
    if (S.archFilter === 'upper' && e.o.group === 1) vis = false;
    if (S.archFilter === 'lower' && e.o.group === 0) vis = false;
    if (e.isAtt && S.attMode === 'hidden') vis = false;
    if (e.isGingiva && ((e.o.group === 0 && !S.anatVis.uGum) || (e.o.group === 1 && !S.anatVis.lGum))) vis = false;
    if (e.isBone && !S.anatVis.bones) vis = false;
    if (e.isTooth) {
      if ((e.o.group === 0 && !S.anatVis.uTeeth) || (e.o.group === 1 && !S.anatVis.lTeeth)) vis = false;
      if (S.hiddenTeeth.has(e.o.type)) vis = false;
      if (S.isolatedFdi !== null && e.o.type !== S.isolatedFdi) vis = false;
    }
    return vis;
  }

  function applyFrame(frame, forceNormals) {
    if (!S.model) return;
    S.frame = frame;
    const now = performance.now();
    const doNorm = forceNormals || (now - S.lastNormalTime > 70);
    if (doNorm) S.lastNormalTime = now;

    for (const e of S.objects) {
      const o = e.o;
      if (e.isMalocc) { e.mesh.visible = false; continue; }

      if (o.keys.TRANS.length) {
        IIWGL.evalObjectTransform(o, frame, tmpMat);
        e.mesh.matrix.fromArray(tmpMat);
        e.mesh.matrixWorldNeedsUpdate = true;
      }
      e.mesh.visible = isEntryVisible(e, frame);

      if (o.keys.COLOR.length && e.isAtt && S.attMode === 'full') {
        const rgb = IIWGL.evalColor(o.keys.COLOR, frame, o.faceColor);
        e.mat.color.setRGB(rgb[0], rgb[1], rgb[2]).convertSRGBToLinear();
      }

      if (o.keys.ALPHA.length && !e.isGingiva && !e.isAtt) {
        e.mat.opacity = IIWGL.evalScalar(o.keys.ALPHA, frame, e.origOpacity);
        e.mat.transparent = e.mat.opacity < 0.99;
      }

      if (o.keys.VTPOS.length) {
        const mp = IIWGL.evalMorph(o.keys.VTPOS, frame);
        if (mp) {
          const sig = `${mp.a}|${mp.b}|${mp.t.toFixed(4)}`;
          if (sig !== e.lastMorphPos) {
            e.lastMorphPos = sig;
            const attr = e.geo.attributes.position;
            applyMorphPair(attr.array, o.mesh.morphPositions[mp.a], o.mesh.morphPositions[mp.b], mp.t);
            attr.needsUpdate = true;
            const mn = o.mesh.morphNormals;
            if (mn && mn[mp.a] && mn[mp.b]) {
              const nAttr = e.geo.attributes.normal;
              applyMorphPair(nAttr.array, mn[mp.a], mn[mp.b], mp.t);
              nAttr.needsUpdate = true;
            } else if (doNorm) {
              e.geo.computeVertexNormals();
            }
          }
        }
      }

      if (o.keys.VTCLR.length && e.geo.attributes.color && !S.showContact) {
        const mc = IIWGL.evalMorph(o.keys.VTCLR, frame);
        if (mc) {
          const sig = `${mc.a}|${mc.b}|${mc.t.toFixed(4)}`;
          if (sig !== e.lastMorphClr) {
            e.lastMorphClr = sig;
            const attr = e.geo.attributes.color;
            applyMorphPair(attr.array, o.mesh.morphColors[mc.a], o.mesh.morphColors[mc.b], mc.t);
            attr.needsUpdate = true;
          }
        }
      }
    }

    if (S.showGhost && ghostGroup.visible) {
      for (const gm of ghostGroup.children) {
        let gv = true;
        if (S.archFilter === 'upper' && gm.userData.group === 1) gv = false;
        if (S.archFilter === 'lower' && gm.userData.group === 0) gv = false;
        if (S.hiddenTeeth.has(gm.userData.fdi)) gv = false;
        if (S.isolatedFdi !== null && gm.userData.fdi !== S.isolatedFdi) gv = false;
        gm.visible = gv;
      }
    }

    syncStageUI(frame, forceNormals);
    if (S.showContact) {
      clearTimeout(contactTimer);
      contactTimer = setTimeout(requestContacts, 180);
    }
    markDirty();
  }

  function stepFloatToFrame(sf) {
    const pbs = S.model.playback;
    if (!pbs.length) return 0;
    const safe = Number.isFinite(sf) ? sf : 0;
    const clamped = Math.max(0, Math.min(pbs.length - 1, safe));
    const g = Math.floor(clamped), g1 = Math.min(pbs.length - 1, g + 1);
    return pbs[g].frame + (pbs[g1].frame - pbs[g].frame) * (clamped - g);
  }

  function buildStageBar() {
    const track = $('stage-track');
    track.innerHTML = '';
    const meta = (S.movements && S.movements.stageMeta) || [];

    S.model.playback.forEach((p, idx) => {
      const btn = document.createElement('button');
      const m = meta[idx] || {
        upperActive: idx > 0 && !!(p.moves & 1),
        lowerActive: idx > 0 && !!(p.moves & 2),
        upperPassive: false,
        lowerPassive: false
      };
      btn.className = 'stage-cell' + (idx === 0 ? ' active' : '');
      btn.title = p.name || `Step ${idx}`;
      const uCls = m.upperActive ? ' on-u' : (m.upperPassive ? ' passive-move' : '');
      const lCls = m.lowerActive ? ' on-l' : (m.lowerPassive ? ' passive-move' : '');
      btn.innerHTML = `<span class="stage-num">${idx}</span><span class="stage-bars"><span class="arch-bar${uCls}"></span><span class="arch-bar${lCls}"></span></span>`;
      track.appendChild(btn);
    });
  }

  function syncStageUI(frame, force) {
    const pbs = S.model.playback;
    if (!pbs.length) return;
    const maxIdx = pbs.length - 1;
    const pct = maxIdx > 0 ? Math.max(0, Math.min(100, (S.stepFloat / maxIdx) * 100)) : 0;
    const sp = $('scrub-progress');
    if (sp) sp.style.width = `${pct.toFixed(1)}%`;

    let best = 0, dist = Infinity;
    for (let i = 0; i < pbs.length; i++) {
      const d = Math.abs(pbs[i].frame - frame);
      if (d < dist) { dist = d; best = i; }
    }
    if (!force && best === S.stepIdx) return;
    S.stepIdx = best;
    const badge = $('stage-badge');
    if (badge) badge.textContent = `${best} / ${maxIdx}`;
    const cmpR = $('cmp-right-lbl');
    if (cmpR) cmpR.textContent = `${I18N[S.lang].stepWord} ${best} / ${maxIdx}`;
    const cells = $('stage-track').children;
    for (let i = 0; i < cells.length; i++) cells[i].classList.toggle('active', i === best);
    if (cells[best]) cells[best].scrollIntoView({ behavior: S.playing ? 'auto' : 'smooth', inline: 'nearest', block: 'nearest' });
  }

  function jumpToStage(idx) {
    if (!S.model || !S.model.playback.length) return;
    S.playing = false; updatePlayIcons();
    S.targetStep = Math.max(0, Math.min(S.model.playback.length - 1, idx));
    markDirty();
  }

  function updatePlayIcons() {
    $('ico-play').style.display = S.playing ? 'none' : 'block';
    $('ico-pause').style.display = S.playing ? 'block' : 'none';
  }

  function getViewPose(view) {
    const d = Math.max(1075, (S.radius * 1.22) / ORTHO_HALF_TAN);
    const yBias = S.radius * 0.06;
    const map = {
      front:     { off: [0, 0, d],             up: [0, 1, 0],  arch: 'both',  tgt: S.center,      shift: [0, -yBias, 0] },
      upper:     { off: [0, 2, d],             up: [0, 1, 0],  arch: 'upper', tgt: S.upperCenter, shift: [0, -yBias, 0] },
      lower:     { off: [0, -2, d],            up: [0, 1, 0],  arch: 'lower', tgt: S.lowerCenter, shift: [0, -yBias, 0] },
      left:      { off: [d, 0, 0],             up: [0, 1, 0],  arch: 'both',  tgt: S.center,      shift: [0, -yBias, 0] },
      right:     { off: [-d, 0, 0],            up: [0, 1, 0],  arch: 'both',  tgt: S.center,      shift: [0, -yBias, 0] },
      maxilla:   { off: [0, -d, 0],            up: [0, 0, 1],  arch: 'upper', tgt: S.upperCenter, shift: [0, 0, -yBias] },
      mandible:  { off: [0, d, 0],             up: [0, 0, -1], arch: 'lower', tgt: S.lowerCenter, shift: [0, 0, yBias] },
      occlusion: { off: [0, -d * 0.82, d * 0.57], up: [0, 1, 0], arch: 'both', tgt: S.center,     shift: [0, -yBias * 0.57, -yBias * 0.82] }
    };
    const p = map[view] || map.front;
    const baseTgt = (p.tgt || S.center).clone();
    const isMulti = S.view === 'multi';
    if (!isMulti && p.shift) {
      baseTgt.x += p.shift[0];
      baseTgt.y += p.shift[1];
      baseTgt.z += p.shift[2];
    }
    return {
      pos: new THREE.Vector3(baseTgt.x + p.off[0], baseTgt.y + p.off[1], baseTgt.z + p.off[2]),
      up: new THREE.Vector3(...p.up),
      target: baseTgt,
      arch: p.arch
    };
  }

  function setArchVisibility(arch) {
    S.archFilter = arch || 'both';
    applyFrame(S.frame, false);
  }

  function getMultiRects(W, H) {
    const x0 = railWidth() + 14, x1 = W - 14;
    const dockEl = document.querySelector('.stage-dock');
    const bannerEl = document.querySelector('.top-banner');
    const stripEl = document.querySelector('.view-strip');
    const dockRect = (dockEl && dockEl.style.display !== 'none') ? dockEl.getBoundingClientRect() : null;
    const bannerRect = bannerEl ? bannerEl.getBoundingClientRect() : null;
    const stripRect = stripEl ? stripEl.getBoundingClientRect() : null;
    const availW = Math.max(240, x1 - x0);
    const cx = Math.round((x0 + x1) * 0.5);
    const stripBelowBanner = stripRect && bannerRect && stripRect.top >= bannerRect.bottom - 2;
    const stripBlocksCenter = stripBelowBanner && stripRect.right > (cx - availW * 0.16);
    const yTop = stripBlocksCenter ? Math.ceil(stripRect.bottom + 6)
      : (bannerRect ? Math.ceil(bannerRect.bottom + 6) : (W >= 1180 ? 70 : 134));
    const yBot = dockRect ? Math.floor(dockRect.top - 6)
      : ((dockEl && dockEl.style.display !== 'none') ? H - 160 : H - 16);
    const availH = Math.max(210, yBot - yTop);
    const cyMid = Math.round((yTop + yBot) * 0.5);
    const sz = Math.floor(Math.min(availW / 3.05, availH / 2.76));
    const stepX = Math.min(Math.round(availW * 0.295), Math.round(sz * 1.56));
    const stepY = Math.round(availH * 0.5 - sz * 0.45);
    return [
      { key: 'top',    view: 'maxilla',  arch: 'upper', cx,           cy: cyMid - stepY, size: sz },
      { key: 'left',   view: 'right',    arch: 'both',  cx: cx - stepX, cy: cyMid,       size: sz },
      { key: 'center', view: 'front',    arch: 'both',  cx,           cy: cyMid,         size: sz },
      { key: 'right',  view: 'left',     arch: 'both',  cx: cx + stepX, cy: cyMid,       size: sz },
      { key: 'bottom', view: 'mandible', arch: 'lower', cx,           cy: cyMid + stepY, size: sz }
    ];
  }

  function setCameraView(view) {
    S.view = view;
    document.querySelectorAll('.view-tile').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const isMulti = view === 'multi';
    if (isMulti && S.compareMode) toggleCompare(false);
    if (controls) controls.enabled = !isMulti;
    if (isMulti) {
      S.archFilter = 'both';
      applyFrame(S.frame, false);
      markDirty();
      return;
    }
    const pose = getViewPose(view);
    setArchVisibility(pose.arch);
    controls.enableDamping = false;
    controls.update();
    cam.position.copy(pose.pos);
    cam.up.copy(pose.up);
    controls.target.copy(pose.target);
    controls.update();
    controls.enableDamping = true;
    lastRulerSig = '';
    markDirty();
  }

  function updateRulerOverlay(force) {
    const svg = $('ruler-overlay');
    if (!svg) return;
    if (!S.orthoGrid || S.view === 'multi' || S.compareMode || !cam || !controls) {
      if (svg.childElementCount) { svg.innerHTML = ''; lastRulerSig = ''; }
      return;
    }
    const vp = $('viewport'), W = vp.clientWidth, H = vp.clientHeight;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const pA = controls.target.clone().project(cam);
    const pB = controls.target.clone().addScaledVector(right, 10).project(cam);
    const pxPerMm = (Math.abs(pB.x - pA.x) * W * 0.5) / 10;
    if (!Number.isFinite(pxPerMm) || pxPerMm < 0.25) return;

    const sig = `${W}|${H}|${pxPerMm.toFixed(3)}`;
    if (!force && sig === lastRulerSig) return;
    lastRulerSig = sig;

    const xMin = railWidth(), cx = W * 0.5, cy = H * 0.5;
    const majLen = Math.max(12, Math.min(26, pxPerMm * 2.0));
    const minLen = Math.max(6, Math.min(13, pxPerMm * 1.0));
    const subLen = Math.max(3, Math.min(6, pxPerMm * 0.35));

    let majD = '', minD = '', subD = '';
    const maxNegX = Math.floor((cx - xMin) / pxPerMm);
    const maxPosX = Math.floor((W - cx) / pxPerMm);
    const mmStep = pxPerMm < 2.2 ? 5 : 1;
    for (let mm = -maxNegX; mm <= maxPosX; mm += mmStep) {
      if (mm === 0) continue;
      const x = (cx + mm * pxPerMm).toFixed(1);
      if (mm % 10 === 0) majD += `M${x} ${cy.toFixed(1)}v${majLen.toFixed(1)}`;
      else minD += `M${x} ${cy.toFixed(1)}v${minLen.toFixed(1)}`;
    }
    const maxNegY = Math.floor(cy / pxPerMm);
    const maxPosY = Math.floor((H - cy) / pxPerMm);
    for (let mm = -maxNegY; mm <= maxPosY; mm += mmStep) {
      if (mm === 0) continue;
      const y = (cy + mm * pxPerMm).toFixed(1);
      if (mm % 10 === 0) majD += `M${cx.toFixed(1)} ${y}h${(-majLen).toFixed(1)}`;
      else minD += `M${cx.toFixed(1)} ${y}h${(-minLen).toFixed(1)}`;
    }
    if (pxPerMm >= 14) {
      for (let q = -40; q <= 40; q++) {
        if (q % 4 === 0) continue;
        const d = (q * 0.25) * pxPerMm;
        const x = cx + d, y = cy + d;
        if (x >= xMin && x <= W) subD += `M${x.toFixed(1)} ${cy.toFixed(1)}v${subLen.toFixed(1)}`;
        if (y >= 0 && y <= H) subD += `M${cx.toFixed(1)} ${y.toFixed(1)}h${(-subLen).toFixed(1)}`;
      }
    }

    const cxF = cx.toFixed(1), cyF = cy.toFixed(1);
    svg.innerHTML =
      `<line class="ruler-axis" x1="${xMin}" y1="${cyF}" x2="${W}" y2="${cyF}"/>` +
      `<line class="ruler-axis" x1="${cxF}" y1="0" x2="${cxF}" y2="${H}"/>` +
      (subD ? `<path class="ruler-tick-sub" fill="none" d="${subD}"/>` : '') +
      (minD ? `<path class="ruler-tick-min" fill="none" d="${minD}"/>` : '') +
      (majD ? `<path class="ruler-tick-maj" fill="none" d="${majD}"/>` : '') +
      `<circle class="ruler-dot" cx="${cxF}" cy="${cyF}" r="3.2"/>` +
      `<text class="ruler-lbl" x="${(cx + 5).toFixed(1)}" y="${(cy + 14).toFixed(1)}">1mm</text>`;
  }

  function toggleOrthoGrid(forceVal) {
    const next = forceVal !== undefined ? !!forceVal : !S.orthoGrid;
    if (next === S.orthoGrid) return;
    if (next && S.view === 'multi') setCameraView('front');
    S.orthoGrid = next;
    $('tool-grid').classList.toggle('active', next);
    $('tool-grid').setAttribute('aria-pressed', next ? 'true' : 'false');
    updateRulerOverlay(true);
    markDirty();
  }

  function toggleCompare(forceVal) {
    const next = forceVal !== undefined ? !!forceVal : !S.compareMode;
    if (next === S.compareMode) return;
    S.compareMode = next;
    $('tool-compare').classList.toggle('active', next);
    $('tool-compare').setAttribute('aria-pressed', next ? 'true' : 'false');
    $('compare-ui').classList.toggle('hidden', !next);
    if (next && S.view === 'multi') setCameraView('front');
    const maxIdx = S.model && S.model.playback.length ? S.model.playback.length - 1 : 0;
    $('cmp-left-lbl').textContent = I18N[S.lang].cmpInitial;
    $('cmp-right-lbl').textContent = `${I18N[S.lang].stepWord} ${Math.max(0, S.stepIdx)} / ${maxIdx}`;
    markDirty();
  }

  function updateClipPlane() {
    const active = S.clipAxis !== 'none';
    if (renderer) renderer.localClippingEnabled = active;
    if (active) {
      const n = S.clipAxis === 'x' ? [1, 0, 0] : S.clipAxis === 'y' ? [0, -1, 0] : [0, 0, -1];
      if (S.clipInvert) { n[0] = -n[0]; n[1] = -n[1]; n[2] = -n[2]; }
      clipPlane.normal.set(n[0], n[1], n[2]);
      const idx = S.clipAxis === 'x' ? 'x' : S.clipAxis === 'y' ? 'y' : 'z';
      const cVal = S.bboxMin[idx] + (S.bboxMax[idx] - S.bboxMin[idx]) * ((S.clipVal + 1) * 0.5);
      clipPlane.constant = -(n[0] * (idx === 'x' ? cVal : 0) + n[1] * (idx === 'y' ? cVal : 0) + n[2] * (idx === 'z' ? cVal : 0));
    }
    const planes = active ? [clipPlane] : [];
    for (const e of S.objects) {
      e.mat.clippingPlanes = (active && e.o.doClip !== false) ? planes : [];
    }
    if (ghostGroup.userData.mat) ghostGroup.userData.mat.clippingPlanes = planes;
    $('tool-clip').classList.toggle('active', active || !$('clip-popover').classList.contains('hidden'));
    markDirty();
  }

  function clearCaliper() {
    S.caliperPts = [];
    clearGroup(caliperGroup, true);
    const valEl = $('caliper-val');
    if (valEl) valEl.textContent = I18N[S.lang].rulerHint;
    markDirty(120);
  }

  function addCaliperPoint(pt) {
    if (S.caliperPts.length >= 2) clearCaliper();
    S.caliperPts.push(pt.clone());
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xc8a86b, depthTest: false })
    );
    sph.position.copy(pt);
    sph.renderOrder = 99;
    caliperGroup.add(sph);

    if (S.caliperPts.length === 2) {
      const [a, b] = S.caliperPts;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([a, b]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x7aa2f7, depthTest: false }));
      line.renderOrder = 98;
      caliperGroup.add(line);
      $('caliper-val').textContent = `${a.distanceTo(b).toFixed(2)} mm`;
    } else {
      $('caliper-val').textContent = '1 pt\u2026';
    }
    markDirty(200);
  }

  function updateIPROverlay() {
    const svg = $('ipr-tool-overlay');
    if (!svg) return;
    if (!S.showIPR || !S.ipr.length || S.view === 'multi' || S.compareMode || document.body.dataset.vcPresentation === '1') {
      if (svg.childElementCount) svg.innerHTML = '';
      return;
    }
    const activeItems = S.ipr.filter(item => item.stageIdx === S.stepIdx);
    if (!activeItems.length) {
      if (svg.childElementCount) svg.innerHTML = '';
      return;
    }
    const vp = $('viewport'), W = vp.clientWidth, H = vp.clientHeight;
    const dockEl = document.querySelector('.stage-dock');
    const dockTop = (dockEl && dockEl.style.display !== 'none') ? dockEl.getBoundingClientRect().top : H - 16;
    const byFdi = new Map();
    for (const e of S.objects) if (e.isTooth) byFdi.set(e.o.type, e);

    const proj2D = vec => {
      const p = vec.clone().project(cam);
      return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, z: p.z };
    };
    const acUpper = proj2D(S.upperCenter);
    const acLower = proj2D(S.lowerCenter);
    const isOccl = S.view === 'maxilla' || S.view === 'mandible' || S.view === 'occlusion';

    const pills = [];
    const v = new THREE.Vector3();
    for (const item of activeItems) {
      if (S.archFilter === 'upper' && item.group === 1) continue;
      if (S.archFilter === 'lower' && item.group === 0) continue;
      const ent = byFdi.get(item.fdiA);
      if (!ent || !ent.mesh.visible) continue;
      v.set(item.localAnchorA[0], item.localAnchorA[1], item.localAnchorA[2]).applyMatrix4(ent.mesh.matrix);
      const p = proj2D(v);
      if (p.z < -1 || p.z > 1) continue;
      if (p.x < railWidth() + 8 || p.x > W - 12 || p.y < 50 || p.y > dockTop - 8) continue;

      const ac = item.group === 1 ? acLower : acUpper;
      let dx = p.x - ac.x, dy = p.y - ac.y;
      const len0 = Math.hypot(dx, dy) || 1;
      dx /= len0; dy /= len0;
      if (!isOccl) {
        dy += item.group === 1 ? 0.95 : -0.95;
        const len1 = Math.hypot(dx, dy) || 1;
        dx /= len1; dy /= len1;
      }
      const dist = isOccl ? 56 : 72;
      const px = Math.max(railWidth() + 36, Math.min(W - 36, p.x + dx * dist));
      const py = Math.max(78, Math.min(dockTop - 22, p.y + dy * dist));
      pills.push({ sx: p.x, sy: p.y, px, py, item });
    }

    if (!pills.length) {
      if (svg.childElementCount) svg.innerHTML = '';
      return;
    }

    // Spread adjacent pills cleanly so labels never overlap
    pills.sort((a, b) => a.px - b.px);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < pills.length; i++) {
        for (let j = 0; j < i; j++) {
          if (Math.abs(pills[i].px - pills[j].px) < 58 && Math.abs(pills[i].py - pills[j].py) < 28) {
            pills[i].py += (pills[i].item.group === 1 ? 28 : -28);
            pills[i].py = Math.max(78, Math.min(dockTop - 22, pills[i].py));
          }
        }
      }
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const col = isLight ? '#1e252b' : '#ffffff';
    let defs = '<defs>', body = '';
    pills.forEach((p, idx) => {
      const gid = `ipr-g-${idx}`;
      defs += `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${p.sx.toFixed(1)}" y1="${p.sy.toFixed(1)}" x2="${p.px.toFixed(1)}" y2="${p.py.toFixed(1)}">` +
        `<stop offset="0%" stop-color="${col}" stop-opacity="0.28"/>` +
        `<stop offset="45%" stop-color="${col}" stop-opacity="0.82"/>` +
        `<stop offset="100%" stop-color="${col}" stop-opacity="0.90"/></linearGradient>`;
      const txt = p.item.mm.toFixed(2);
      const rw = Math.max(50, txt.length * 8 + 18);
      body += `<g class="ipr-g">` +
        `<line class="ipr-line" stroke="url(#${gid})" x1="${p.sx.toFixed(1)}" y1="${p.sy.toFixed(1)}" x2="${p.px.toFixed(1)}" y2="${p.py.toFixed(1)}"/>` +
        `<rect class="ipr-pill-bg" x="${(p.px - rw * 0.5).toFixed(1)}" y="${(p.py - 12).toFixed(1)}" width="${rw.toFixed(1)}" height="24"/>` +
        `<text class="ipr-pill-txt" x="${p.px.toFixed(1)}" y="${p.py.toFixed(1)}">${txt}</text></g>`;
    });
    svg.innerHTML = `${defs}</defs>${body}`;
  }

  function hitMultiCell(clientX, clientY) {
    if (clientX < railWidth()) return null;
    const vp = $('viewport'), W = vp.clientWidth, H = vp.clientHeight;
    const cells = getMultiRects(W, H);
    if (!cells.length) return null;
    let best = cells[0], bestD2 = Infinity;
    for (const r of cells) {
      const dx = clientX - r.cx, dy = clientY - r.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = r; }
    }
    return best;
  }

  function onPointerDown(ev) {
    downPt = { x: ev.clientX, y: ev.clientY };
    if (S.view === 'multi' && ev.button === 0) {
      const hit = hitMultiCell(ev.clientX, ev.clientY);
      if (hit) {
        S.activeMultiKey = hit.key;
        multiDrag = { key: hit.key, x: ev.clientX, y: ev.clientY };
        renderer.domElement.style.cursor = 'grabbing';
      }
    }
    markDirty();
  }

  function onPointerMove(ev) {
    if (!multiDrag) return;
    const cell = S.multiCells[multiDrag.key];
    if (!cell) return;
    cell.dAz -= (ev.clientX - multiDrag.x) * 0.01;
    cell.dEl = Math.max(-1.1, Math.min(1.1, cell.dEl - (ev.clientY - multiDrag.y) * 0.01));
    multiDrag.x = ev.clientX; multiDrag.y = ev.clientY;
    markDirty();
  }

  function onPointerUp(ev) {
    if (multiDrag) { multiDrag = null; renderer.domElement.style.cursor = ''; }
    if (S.caliperOn && ev.button === 0 && downPt && Math.hypot(ev.clientX - downPt.x, ev.clientY - downPt.y) < 5) {
      const vp = $('viewport'), rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, cam);
      const targets = S.objects.filter(e => !e.isMalocc && e.mesh.visible).map(e => e.mesh);
      const hits = raycaster.intersectObjects(targets, false);
      const hit = hits.find(h => S.clipAxis === 'none' || clipPlane.distanceToPoint(h.point) >= -0.01);
      if (hit) addCaliperPoint(hit.point);
    }
    downPt = null;
  }

  function onCanvasWheel(ev) {
    if (S.view === 'multi') {
      const hit = hitMultiCell(ev.clientX, ev.clientY);
      if (hit && S.multiCells[hit.key]) {
        S.activeMultiKey = hit.key;
        const cell = S.multiCells[hit.key];
        cell.zoom = Math.max(0.22, Math.min(2.4, cell.zoom * (ev.deltaY > 0 ? 1.08 : 0.92)));
      }
    }
    markDirty(450);
  }

  function onCanvasDblClick() {
    if (S.view === 'multi') {
      S.activeMultiKey = null;
      for (const k in S.multiCells) { S.multiCells[k].dAz = 0; S.multiCells[k].dEl = 0; S.multiCells[k].zoom = 1; }
      markDirty();
    }
  }

  const _cellCam = new THREE.PerspectiveCamera(ORTHO_FOV, 1, 40, 25000);
  function renderViewCell(r, W, H) {
    const pose = getViewPose(r.view);
    const cell = S.multiCells[r.key] || { dAz: 0, dEl: 0, zoom: 1 };
    const halfWorld = Math.max(27, S.radius * 0.71);
    const cellDist = (halfWorld / ORTHO_HALF_TAN) * (cell.zoom || 1) * (H / Math.max(1, r.size));
    _cellCam.aspect = W / Math.max(1, H);
    _cellCam.near = Math.max(40, cellDist * 0.05);
    _cellCam.far = Math.max(12000, cellDist + S.radius * 20);
    _cellCam.setViewOffset(W, H, W * 0.5 - r.cx, H * 0.5 - r.cy, W, H);
    _cellCam.updateProjectionMatrix();

    const offset = pose.pos.clone().sub(pose.target).normalize().multiplyScalar(cellDist);
    const up0 = pose.up.clone().normalize();
    offset.applyAxisAngle(up0, cell.dAz);
    const right1 = new THREE.Vector3().crossVectors(up0, offset).normalize();
    offset.applyAxisAngle(right1, cell.dEl);

    _cellCam.position.copy(pose.target).add(offset);
    _cellCam.up.copy(up0).applyAxisAngle(right1, cell.dEl).normalize();
    _cellCam.lookAt(pose.target);

    const prevVis = S.objects.map(e => e.mesh.visible);
    if (r.arch === 'upper' || r.arch === 'lower') {
      for (const e of S.objects) {
        if (r.arch === 'upper' && e.o.group === 1) e.mesh.visible = false;
        if (r.arch === 'lower' && e.o.group === 0) e.mesh.visible = false;
      }
    }
    renderer.clearDepth();
    renderer.render(scene, _cellCam);
    for (let i = 0; i < S.objects.length; i++) S.objects[i].mesh.visible = prevVis[i];
  }

  function swapToStep0State() {
    const saved = [];
    for (const e of S.objects) {
      if (e.isMalocc) continue;
      saved.push({
        e,
        mat: new Float32Array(e.mesh.matrix.elements),
        pos: e.geo.attributes.position,
        norm: e.geo.attributes.normal,
        vis: e.mesh.visible
      });
      e.mesh.matrix.fromArray(e.mat0);
      e.mesh.matrixWorldNeedsUpdate = true;
      if (e.posAttr0) e.geo.setAttribute('position', e.posAttr0);
      if (e.normAttr0) e.geo.setAttribute('normal', e.normAttr0);
      if (e.o.keys.VISIB.length) {
        const prevFrame = S.frame;
        e.mesh.visible = isEntryVisible(e, S.model.playback.length ? S.model.playback[0].frame : 0);
        S.frame = prevFrame;
      }
    }
    return saved;
  }

  function restoreFromStep0Swap(saved) {
    for (const s of saved) {
      s.e.mesh.matrix.fromArray(s.mat);
      s.e.mesh.matrixWorldNeedsUpdate = true;
      if (s.e.geo.attributes.position !== s.pos) s.e.geo.setAttribute('position', s.pos);
      if (s.e.geo.attributes.normal !== s.norm) s.e.geo.setAttribute('normal', s.norm);
      s.e.mesh.visible = s.vis;
    }
  }

  function renderFrameNow(W, H) {
    if (S.view === 'multi') {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
      renderer.clear();
      renderer.autoClear = false;
      const cells = getMultiRects(W, H);
      if (S.activeMultiKey) cells.sort((a, b) => (a.key === S.activeMultiKey ? 1 : b.key === S.activeMultiKey ? -1 : 0));
      for (const r of cells) renderViewCell(r, W, H);
      renderer.autoClear = true;
      return;
    }

    if (S.compareMode) {
      controls.update();
      const x0 = railWidth(), usableW = Math.max(100, W - x0);
      const lw = Math.floor(usableW / 2), rw = usableW - lw;
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
      renderer.clear();
      renderer.autoClear = false;
      renderer.setScissorTest(true);

      const saved = swapToStep0State();
      cam.aspect = lw / Math.max(1, H);
      cam.updateProjectionMatrix();
      renderer.setViewport(x0, 0, lw, H);
      renderer.setScissor(x0, 0, lw, H);
      renderer.clearDepth();
      renderer.render(scene, cam);
      restoreFromStep0Swap(saved);

      cam.aspect = rw / Math.max(1, H);
      cam.updateProjectionMatrix();
      renderer.setViewport(x0 + lw, 0, rw, H);
      renderer.setScissor(x0 + lw, 0, rw, H);
      renderer.clearDepth();
      renderer.render(scene, cam);

      cam.aspect = W / Math.max(1, H);
      cam.updateProjectionMatrix();
      renderer.setScissorTest(false);
      renderer.autoClear = true;
      return;
    }

    controls.update();
    renderer.setViewport(0, 0, W, H);
    renderer.render(scene, cam);
  }

  function animate(now) {
    inAnimate = true;
    S.rafId = 0;
    try {
      if (!renderer) return;
      const dt = S.lastTick ? Math.max(0, Math.min(0.05, (now - S.lastTick) / 1000)) : 0.016;
      S.lastTick = now;

      if (S.playing && S.model && S.model.playback.length > 1) {
        if (S.stepPause && now < S.pauseUntil) {
          // Hold briefly on boundary stage during step-pause playback
        } else {
          const maxStep = S.model.playback.length - 1;
          const prevStepInt = Math.floor(S.stepFloat);
          S.stepFloat += PLAY_BASE_RATE * S.speed * dt;
          if (S.stepPause && Math.floor(S.stepFloat) > prevStepInt && prevStepInt + 1 < maxStep) {
            S.stepFloat = prevStepInt + 1;
            S.pauseUntil = now + 450;
          }
          if (S.stepFloat >= maxStep) {
            if (S.loop) S.stepFloat = 0;
            else { S.stepFloat = maxStep; S.playing = false; updatePlayIcons(); }
          }
          applyFrame(stepFloatToFrame(S.stepFloat), !S.playing);
        }
      } else if (S.targetStep !== null && S.model && S.model.playback.length) {
        const diff = S.targetStep - S.stepFloat;
        if (Math.abs(diff) < 0.015) {
          S.stepFloat = S.targetStep;
          S.targetStep = null;
          applyFrame(stepFloatToFrame(S.stepFloat), true);
        } else {
          S.stepFloat += diff * Math.min(1, dt * 12);
          applyFrame(stepFloatToFrame(S.stepFloat), false);
        }
      }

      const inMotion = S.playing || S.targetStep !== null || !!multiDrag || S.orbiting;
      const active = inMotion || now <= S.dirtyUntil;
      if (!active) return;

      const vp = $('viewport'), W = vp.clientWidth, H = vp.clientHeight;
      const t0 = performance.now();
      renderFrameNow(W, H);
      gov.record(performance.now() - t0, inMotion);
      updateIPROverlay();
      updateRulerOverlay(false);

      S.rafId = requestAnimationFrame(animate);
    } finally {
      inAnimate = false;
    }
  }

  function buildDrawer() {
    const movEl = $('tab-movements');
    const bolEl = $('tab-bolton');
    const anaEl = $('tab-anatomy');
    if (!S.model || !movEl || !bolEl || !anaEl) return;

    const teeth = (S.movements && S.movements.teeth) || [];
    const nHigh = teeth.filter(t => t.plausibility === 'high').length;
    const nImp = teeth.filter(t => t.plausibility === 'implausible').length;
    movEl.innerHTML = `<div class="card-box"><div class="kv-row"><span class="card-lbl">Summary</span><span class="mono">${teeth.length} teeth \u00b7 <span style="color:var(--c-warn)">${nHigh} high</span> \u00b7 <span style="color:var(--c-danger)">${nImp} >4mm</span></span></div></div>` +
      `<table class="data-tbl"><thead><tr><th>FDI</th><th>\u0394mm</th><th>Rot\u00b0</th><th>In/Ex</th><th>B/L</th><th></th></tr></thead><tbody>` +
      teeth.map(t => `<tr class="clickable" data-fdi="${t.fdi}"><td class="mono"><b>${t.fdi}</b></td><td class="mono">${t.transMm}</td><td class="mono">${t.rotDeg}</td><td class="mono">${t.intrusionMm}</td><td class="mono">${t.buccalMm}</td><td><span class="p-dot p-${t.plausibility}"></span></td></tr>`).join('') +
      `</tbody></table>`;

    movEl.querySelectorAll('tr[data-fdi]').forEach(tr => {
      const fdi = parseInt(tr.dataset.fdi, 10);
      tr.onclick = () => focusTooth(fdi);
      tr.ondblclick = () => { S.isolatedFdi = (S.isolatedFdi === fdi) ? null : fdi; buildAnatomyGrid(); applyFrame(S.frame, false); };
    });

    const b = S.bolton;
    const fmtB = (title, obj) => obj && obj.complete
      ? `<div class="kv-row"><span>${title}</span><span class="mono"><b>${obj.ratio}%</b> <small>(${obj.ideal}%)</small></span></div><div class="kv-row" style="color:var(--text-muted)"><span>Excess (${obj.excessArch})</span><span class="mono">${obj.excessMm} mm</span></div>`
      : `<div class="kv-row"><span>${title}</span><span class="mono" style="color:var(--text-muted)">Incomplete arch</span></div>`;
    const aw = (b && b.archWidths) || {};
    const fmtW = (lbl, o) => o ? `<div class="kv-row"><span>${lbl}</span><span class="mono">${o.initialMm} \u2192 ${o.finalMm} (${o.deltaMm >= 0 ? '+' : ''}${o.deltaMm})</span></div>` : '';

    bolEl.innerHTML = `<div class="card-box"><div class="card-lbl">Bolton Ratio</div>${fmtB('Anterior 6', b?.anterior6)}${fmtB('Overall 12', b?.overall12)}</div>` +
      `<div class="card-box"><div class="card-lbl">Arch Widths (mm)</div>${fmtW('Upper 13\u219423', aw.upperCanine)}${fmtW('Upper 16\u219426', aw.upperMolar)}${fmtW('Lower 43\u219433', aw.lowerCanine)}${fmtW('Lower 46\u219436', aw.lowerMolar)}</div>` +
      `<div class="card-box"><div class="card-lbl">IPR Stripping (${S.ipr.length})</div>` +
      (S.ipr.length ? `<table class="data-tbl"><tbody>` + S.ipr.map(x => `<tr class="clickable" data-st="${x.stageIdx}"><td class="mono">${x.fdiA}\u2013${x.fdiB}</td><td class="mono" style="color:var(--c-strip)">${x.mm.toFixed(2)} mm</td><td class="mono">Step ${x.stageIdx}</td></tr>`).join('') + `</tbody></table>` : `<span style="color:var(--text-muted)">${I18N[S.lang].noIpr}</span>`) +
      `</div>`;

    bolEl.querySelectorAll('tr[data-st]').forEach(tr => {
      tr.onclick = () => {
        if (!S.showIPR) toggleIPR(true);
        jumpToStage(parseInt(tr.dataset.st, 10));
      };
    });

    anaEl.innerHTML = `<div class="card-box"><div class="card-lbl">Layers</div>` +
      `<label class="kv-row"><span>Upper Gingiva</span><input type="checkbox" data-anat="uGum" ${S.anatVis.uGum ? 'checked' : ''}></label>` +
      `<label class="kv-row"><span>Lower Gingiva</span><input type="checkbox" data-anat="lGum" ${S.anatVis.lGum ? 'checked' : ''}></label>` +
      `<label class="kv-row"><span>Upper Teeth</span><input type="checkbox" data-anat="uTeeth" ${S.anatVis.uTeeth ? 'checked' : ''}></label>` +
      `<label class="kv-row"><span>Lower Teeth</span><input type="checkbox" data-anat="lTeeth" ${S.anatVis.lTeeth ? 'checked' : ''}></label>` +
      `<label class="kv-row"><span>Bones / Roots</span><input type="checkbox" data-anat="bones" ${S.anatVis.bones ? 'checked' : ''}></label>` +
      `<button id="ana-reset" class="mini-btn" type="button">Reset All</button></div>` +
      `<div class="card-box"><div class="card-lbl">FDI Teeth (Click toggle \u00b7 DblClick isolate)</div><div id="fdi-grid" class="fdi-grid"></div></div>`;

    anaEl.querySelectorAll('input[data-anat]').forEach(inp => {
      inp.onchange = () => { S.anatVis[inp.dataset.anat] = inp.checked; applyFrame(S.frame, false); };
    });
    $('ana-reset').onclick = () => {
      S.hiddenTeeth.clear(); S.isolatedFdi = null;
      S.anatVis = { uGum: true, lGum: true, uTeeth: true, lTeeth: true, bones: true };
      buildDrawer(); applyFrame(S.frame, false);
    };
    buildAnatomyGrid();
  }

  function buildAnatomyGrid() {
    const grid = $('fdi-grid');
    if (!grid) return;
    const fdis = S.objects.filter(e => e.isTooth).map(e => e.o.type).sort((a, b) => a - b);
    grid.innerHTML = fdis.map(f => `<button type="button" class="fdi-chip mono${S.hiddenTeeth.has(f) ? ' off' : ''}${S.isolatedFdi === f ? ' iso' : ''}" data-fdi="${f}">${f}</button>`).join('');
    grid.querySelectorAll('.fdi-chip').forEach(btn => {
      const fdi = parseInt(btn.dataset.fdi, 10);
      btn.onclick = () => {
        if (S.hiddenTeeth.has(fdi)) S.hiddenTeeth.delete(fdi); else S.hiddenTeeth.add(fdi);
        buildAnatomyGrid(); applyFrame(S.frame, false);
      };
      btn.ondblclick = () => {
        S.isolatedFdi = (S.isolatedFdi === fdi) ? null : fdi;
        buildAnatomyGrid(); applyFrame(S.frame, false);
      };
    });
  }

  function focusTooth(fdi) {
    const ent = S.objects.find(e => e.isTooth && e.o.type === fdi);
    if (!ent) return;
    const c = new THREE.Vector3(
      (ent.o.bbox.min[0] + ent.o.bbox.max[0]) * 0.5,
      (ent.o.bbox.min[1] + ent.o.bbox.max[1]) * 0.5,
      (ent.o.bbox.min[2] + ent.o.bbox.max[2]) * 0.5
    ).applyMatrix4(ent.mesh.matrix);
    controls.target.copy(c);
    controls.update();
    if (ent.mat.emissive) {
      ent.mat.emissive.setHex(0xc8a86b);
      ent.mat.emissiveIntensity = 0.45;
      setTimeout(() => { ent.mat.emissive.setHex(0x000000); markDirty(150); }, 650);
    }
    markDirty(400);
  }

  function toggleIPR(forceVal) {
    const next = forceVal !== undefined ? !!forceVal : !S.showIPR;
    if (next && !S.ipr.length) {
      showToast(I18N[S.lang].noIpr);
      return;
    }
    S.showIPR = next;
    $('tool-ipr').classList.toggle('active', next);
    $('tool-ipr').setAttribute('aria-pressed', next ? 'true' : 'false');
    updateIPROverlay();
    markDirty(120);
  }

  function exportSTL() {
    const tris = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3();
    for (const e of S.objects) {
      if (e.isMalocc || !e.mesh.visible) continue;
      const pos = e.geo.attributes.position.array, idx = e.geo.index ? e.geo.index.array : null;
      const count = idx ? idx.length : pos.length / 3;
      for (let i = 0; i < count; i += 3) {
        const i0 = (idx ? idx[i] : i) * 3, i1 = (idx ? idx[i + 1] : i + 1) * 3, i2 = (idx ? idx[i + 2] : i + 2) * 3;
        a.set(pos[i0], pos[i0 + 1], pos[i0 + 2]).applyMatrix4(e.mesh.matrix);
        b.set(pos[i1], pos[i1 + 1], pos[i1 + 2]).applyMatrix4(e.mesh.matrix);
        c.set(pos[i2], pos[i2 + 1], pos[i2 + 2]).applyMatrix4(e.mesh.matrix);
        ab.subVectors(b, a); ac.subVectors(c, a).cross(ab).negate().normalize();
        tris.push([ac.x, ac.y, ac.z, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z]);
      }
    }
    if (!tris.length) return;
    const buf = new ArrayBuffer(84 + tris.length * 50);
    const dv = new DataView(buf);
    dv.setUint32(80, tris.length, true);
    for (let i = 0, off = 84; i < tris.length; i++, off += 50) {
      const t = tris[i];
      for (let k = 0; k < 12; k++) dv.setFloat32(off + k * 4, t[k], true);
    }
    downloadBlob(new Blob([buf], { type: 'application/octet-stream' }), `velourcare-step-${S.stepIdx}.stl`);
    showToast(I18N[S.lang].stlOk);
  }

  function exportPNG() {
    if (!renderer) return;
    const vp = $('viewport'), W = vp.clientWidth, H = vp.clientHeight;
    renderFrameNow(W, H);
    const out = document.createElement('canvas');
    out.width = renderer.domElement.width; out.height = renderer.domElement.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? '#f1ede3' : '#11161c';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(renderer.domElement, 0, 0);
    out.toBlob(blob => {
      if (blob) { downloadBlob(blob, `velourcare-step-${S.stepIdx}.png`); showToast(I18N[S.lang].pngOk); }
    }, 'image/png');
  }

  function exportJSON() {
    if (!S.model) return;
    const payload = {
      title: $('case-title').textContent,
      steps: Math.max(0, S.model.playback.length - 1),
      currentStep: S.stepIdx,
      ipr: S.ipr,
      bolton: S.bolton,
      movements: S.movements
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `velourcare-report.json`);
    showToast(I18N[S.lang].jsonOk);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function tryOpenBuffer(buf, pwd, title) {
    S.pendingBuf = { buf, title };
    const t = I18N[S.lang];
    try {
      const model = IIWGL.parseIIWGL(buf, pwd);
      S.pendingBuf = null;
      $('entry-modal').classList.add('hidden');
      $('loader-overlay').classList.add('hidden');
      loadModel(model, title);
    } catch (err) {
      const needPwd = err.code === 'NEED_PASSWORD' || err.code === 'BAD_PASSWORD';
      if (!needPwd) S.pendingBuf = null;
      $('loader-overlay').classList.add('hidden');
      $('entry-modal').classList.remove('hidden');
      $('pwd-input').style.display = needPwd ? 'block' : 'none';
      $('pwd-submit').style.display = needPwd ? 'block' : 'none';
      if (err.code === 'NEED_PASSWORD') {
        $('modal-title').textContent = t.encTitle;
        $('modal-desc').textContent = t.encDesc;
        $('modal-err').textContent = '';
      } else {
        if (!needPwd) $('modal-title').textContent = t.loadTitle;
        $('modal-err').textContent = err.message || 'Unable to parse .iiwgl file';
      }
      if (needPwd) $('pwd-input').focus();
    }
  }

  function normalizeMlink(raw) {
    let s = (raw || '').trim();
    if (/^cases\.vcconnect\.link(\/|$)/i.test(s)) s = 'https://' + s;
    s = s.replace(/^(https?:\/\/cases\.vcconnect\.link)(?!\/|$)/i, '$1/');
    try {
      const u = new URL(s, location.href);
      if (u.protocol === 'http:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') u.protocol = 'https:';
      u.pathname = u.pathname.replace(/\/{2,}/g, '/');
      return u.toString();
    } catch (_) { return s; }
  }

  async function fetchIIWGL(rawUrl, pwd, title) {
    const url = normalizeMlink(rawUrl);
    let parsed = null;
    try { parsed = new URL(url, location.href); } catch (_) {}
    const isCasesHost = !!(parsed && parsed.hostname.toLowerCase() === 'cases.vcconnect.link');
    const useSameOrigin = isCasesHost &&
      (location.hostname === 'viewer.vcconnect.link' || location.hostname.endsWith('.workers.dev'));
    const fetchUrl = useSameOrigin ? `${location.origin}/cases${parsed.pathname}` : url;
    const t = I18N[S.lang];
    $('entry-modal').classList.add('hidden');
    $('loader-overlay').classList.remove('hidden');
    $('loader-msg').textContent = t.dlMsg;
    $('prog-fill').style.width = '5%';
    try {
      const readBody = async res => {
        const total = parseInt(res.headers.get('content-length') || '0', 10);
        const reader = res.body && res.body.getReader ? res.body.getReader() : null;
        if (!reader) return await res.arrayBuffer();
        const chunks = []; let got = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); got += value.length;
          if (total > 0) $('prog-fill').style.width = `${Math.min(98, Math.round((got / total) * 100))}%`;
        }
        const merged = new Uint8Array(got); let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        return merged.buffer;
      };
      const fetchAndRead = async (target, prefetched) => {
        const delays = [500, 1500];
        for (let attempt = 0; attempt <= delays.length; attempt++) {
          try {
            const res = (attempt === 0 && prefetched) ? await prefetched : await fetch(target);
            if (res.status === 404) { await res.body?.cancel?.(); return { status: 404, buf: null }; }
            if (res.ok) return { status: res.status, buf: await readBody(res) };
            if (res.status < 500 || attempt === delays.length) throw new Error(`HTTP ${res.status} loading case`);
          } catch (err) { if (attempt === delays.length) throw err; }
          await new Promise(r => setTimeout(r, delays[attempt]));
        }
      };

      let prefetch = null;
      if (window.__casePrefetch && window.__casePrefetch.url === fetchUrl) {
        prefetch = window.__casePrefetch.promise;
        window.__casePrefetch = null;
      }
      let out = await fetchAndRead(fetchUrl, prefetch);
      for (let retry = 1; out.status === 404 && isCasesHost && retry <= 16; retry++) {
        $('loader-msg').textContent = I18N[S.lang].finMsg;
        await new Promise(r => setTimeout(r, retry <= 4 ? 1500 : 2500));
        const sep = fetchUrl.includes('?') ? '&' : '?';
        out = await fetchAndRead(`${fetchUrl}${sep}r=${retry}`, null);
      }
      if (out.status === 404) throw new Error('HTTP 404 loading case');
      $('prog-fill').style.width = '100%';
      $('loader-msg').textContent = I18N[S.lang].decMsg;
      requestAnimationFrame(() => tryOpenBuffer(out.buf, pwd, title));
    } catch (e) {
      let host = '';
      try { host = new URL(fetchUrl, location.href).host; } catch (_) {}
      $('loader-overlay').classList.add('hidden');
      $('entry-modal').classList.remove('hidden');
      $('pwd-input').style.display = 'none';
      $('pwd-submit').style.display = 'none';
      $('modal-err').textContent = host ? `${e.message} (${host})` : e.message;
    }
  }

  function setTheme(theme) {
    const light = theme === 'light';
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    $('ico-sun').style.display = light ? 'none' : 'block';
    $('ico-moon').style.display = light ? 'block' : 'none';
    lastRulerSig = '';
    markDirty();
  }

  function setLang(lang) {
    S.lang = lang === 'fr' ? 'fr' : 'en';
    document.documentElement.lang = S.lang;
    $('lang-en').classList.toggle('active', S.lang === 'en');
    $('lang-fr').classList.toggle('active', S.lang === 'fr');
    const t = I18N[S.lang];
    document.querySelectorAll('[data-i18n-view]').forEach(el => {
      const k = el.dataset.i18nView;
      if (t.views[k]) el.textContent = t.views[k];
    });
    for (const [k, v] of Object.entries(t.tips)) {
      const el = $(`tool-${k}`);
      if (el) el.setAttribute('data-tip', v);
    }
    $('tool-att').setAttribute('data-tip', S.attMode === 'subtle' ? t.attSubtle : S.attMode === 'hidden' ? t.attOff : t.attFull);
    $('ctrl-first').title = t.ctrlFirst; $('ctrl-prev').title = t.ctrlPrev;
    $('ctrl-play').title = t.ctrlPlay; $('ctrl-next').title = t.ctrlNext;
    $('ctrl-last').title = t.ctrlLast; $('ctrl-loop').title = t.ctrlLoop;
    $('clip-title').textContent = t.clipTitle;
    $('clip-invert').textContent = t.clipFlip;
    const axesBtns = $('clip-axes').children;
    [t.clipOff, t.clipAxial, t.clipSag, t.clipCor].forEach((lbl, i) => { if (axesBtns[i]) axesBtns[i].textContent = lbl; });
    $('export-title').textContent = t.expTitle;
    $('exp-stl').textContent = t.expStl; $('exp-png').textContent = t.expPng; $('exp-json').textContent = t.expJson;
    $('drawer-title').textContent = t.drawerTitle;
    $('dtab-mov').textContent = t.tabMov; $('dtab-bol').textContent = t.tabBol; $('dtab-ana').textContent = t.tabAna;
    $('cmp-left-lbl').textContent = t.cmpInitial;
    $('pwd-input').placeholder = t.pwdPlaceholder; $('pwd-submit').textContent = t.unlockBtn;
    if ($('pwd-input').style.display !== 'none') {
      $('modal-title').textContent = t.encTitle; $('modal-desc').textContent = t.encDesc;
    } else {
      $('modal-title').textContent = t.loadTitle; $('modal-desc').innerHTML = t.loadDesc; $('drop-zone').innerHTML = t.dropZone;
    }
    updateSubtitle();
  }

  function wireStageScrub() {
    const track = $('stage-track');
    let scrubbing = false, startX = 0, moved = false, lastPointerJump = 0;
    const scrubAt = clientX => {
      if (!S.model || !S.model.playback.length) return;
      const pbs = S.model.playback, cells = track.children;
      if (cells.length < 2) return;
      const firstR = cells[0].getBoundingClientRect(), lastR = cells[cells.length - 1].getBoundingClientRect();
      const c0 = firstR.left + firstR.width * 0.5, c1 = lastR.left + lastR.width * 0.5;
      const frac = Math.max(0, Math.min(1, (clientX - c0) / Math.max(1, c1 - c0)));
      S.stepFloat = frac * (pbs.length - 1);
      S.playing = false; S.targetStep = null; updatePlayIcons();
      applyFrame(stepFloatToFrame(S.stepFloat), false);
    };
    track.addEventListener('pointerdown', ev => {
      if (ev.button !== 0 || !S.model || S.model.playback.length < 2) return;
      scrubbing = true; startX = ev.clientX; moved = false;
      track.setPointerCapture(ev.pointerId);
    });
    track.addEventListener('pointermove', ev => {
      if (!scrubbing) return;
      if (Math.abs(ev.clientX - startX) > 4) moved = true;
      if (moved) scrubAt(ev.clientX);
    });
    const endScrub = ev => {
      if (!scrubbing) return;
      scrubbing = false;
      if (track.hasPointerCapture(ev.pointerId)) track.releasePointerCapture(ev.pointerId);
      const cell = !moved && ev.target.closest('.stage-cell');
      if (cell) {
        const idx = Array.prototype.indexOf.call(track.children, cell);
        if (idx >= 0) { lastPointerJump = performance.now(); jumpToStage(idx); }
      } else if (S.model) {
        if (!moved) scrubAt(ev.clientX);
        applyFrame(S.frame, true);
      }
    };
    track.addEventListener('pointerup', endScrub);
    track.addEventListener('pointercancel', endScrub);
    track.addEventListener('click', ev => {
      if (performance.now() - lastPointerJump < 80) return;
      const cell = ev.target.closest('.stage-cell');
      if (!cell) return;
      const idx = Array.prototype.indexOf.call(track.children, cell);
      if (idx >= 0) jumpToStage(idx);
    });
    track.addEventListener('contextmenu', ev => {
      ev.preventDefault();
      S.stepPause = !S.stepPause;
      showToast(S.stepPause ? I18N[S.lang].stepPauseOn : I18N[S.lang].stepPauseOff);
    });
  }

  function closePopovers(except) {
    if (except !== 'clip') $('clip-popover').classList.add('hidden');
    if (except !== 'export') $('export-popover').classList.add('hidden');
    $('tool-clip').classList.toggle('active', S.clipAxis !== 'none' || !$('clip-popover').classList.contains('hidden'));
  }

  function wireUI() {
    $('tool-theme').onclick = () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    $('tool-att').onclick = () => {
      const order = ['full', 'subtle', 'hidden'];
      S.attMode = order[(order.indexOf(S.attMode) + 1) % 3];
      updateAttStyle();
    };
    $('tool-ipr').onclick = () => toggleIPR();
    $('tool-contact').onclick = () => {
      S.showContact = !S.showContact;
      $('tool-contact').classList.toggle('active', S.showContact);
      $('tool-contact').setAttribute('aria-pressed', S.showContact ? 'true' : 'false');
      $('contact-legend').classList.toggle('hidden', !S.showContact);
      if (S.showContact) requestContacts();
      else restoreOriginalContacts();
    };
    $('tool-ghost').onclick = () => {
      S.showGhost = !S.showGhost;
      $('tool-ghost').classList.toggle('active', S.showGhost);
      $('tool-ghost').setAttribute('aria-pressed', S.showGhost ? 'true' : 'false');
      if (S.showGhost) ensureGhostMeshes();
      ghostGroup.visible = S.showGhost;
      applyFrame(S.frame, false);
    };
    $('tool-grid').onclick = () => toggleOrthoGrid();
    $('tool-caliper').onclick = () => {
      S.caliperOn = !S.caliperOn;
      $('tool-caliper').classList.toggle('active', S.caliperOn);
      $('tool-caliper').setAttribute('aria-pressed', S.caliperOn ? 'true' : 'false');
      $('caliper-hud').classList.toggle('hidden', !S.caliperOn);
      if (!S.caliperOn) clearCaliper();
      else $('caliper-val').textContent = S.caliperPts.length === 2 ? $('caliper-val').textContent : I18N[S.lang].rulerHint;
    };
    $('caliper-clear').onclick = clearCaliper;

    $('tool-clip').onclick = () => {
      const hidden = $('clip-popover').classList.toggle('hidden');
      closePopovers(hidden ? null : 'clip');
    };
    $('clip-axes').querySelectorAll('.seg-btn').forEach(b => b.onclick = () => {
      S.clipAxis = b.dataset.axis;
      $('clip-axes').querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
      updateClipPlane();
    });
    $('clip-range').oninput = () => { S.clipVal = parseFloat($('clip-range').value); updateClipPlane(); };
    $('clip-invert').onclick = () => { S.clipInvert = !S.clipInvert; $('clip-invert').classList.toggle('active', S.clipInvert); updateClipPlane(); };

    $('tool-compare').onclick = () => toggleCompare();
    $('tool-panel').onclick = () => {
      const open = document.body.classList.toggle('drawer-open');
      $('tool-panel').classList.toggle('active', open);
      $('tool-panel').setAttribute('aria-pressed', open ? 'true' : 'false');
    };
    $('drawer-close').onclick = () => {
      document.body.classList.remove('drawer-open');
      $('tool-panel').classList.remove('active');
      $('tool-panel').setAttribute('aria-pressed', 'false');
    };
    document.querySelectorAll('.dtab').forEach(b => b.onclick = () => {
      document.querySelectorAll('.dtab').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${b.dataset.tab}`));
    });

    $('tool-export').onclick = () => {
      const hidden = $('export-popover').classList.toggle('hidden');
      closePopovers(hidden ? null : 'export');
    };
    $('exp-stl').onclick = () => { closePopovers(); exportSTL(); };
    $('exp-png').onclick = () => { closePopovers(); exportPNG(); };
    $('exp-json').onclick = () => { closePopovers(); exportJSON(); };
    $('tool-open').onclick = () => $('file-input').click();

    $('lang-en').onclick = () => setLang('en');
    $('lang-fr').onclick = () => setLang('fr');

    document.querySelectorAll('.view-tile').forEach(b => b.onclick = () => setCameraView(b.dataset.view));
    $('ctrl-first').onclick = () => jumpToStage(0);
    $('ctrl-prev').onclick = () => jumpToStage(S.stepIdx - 1);
    $('ctrl-next').onclick = () => jumpToStage(S.stepIdx + 1);
    $('ctrl-last').onclick = () => S.model && jumpToStage(S.model.playback.length - 1);
    $('ctrl-play').onclick = () => {
      if (!S.model || S.model.playback.length < 2) return;
      S.targetStep = null;
      S.lastTick = 0;
      const maxStep = S.model.playback.length - 1;
      if (!S.playing && S.stepFloat >= maxStep - 0.02) {
        S.stepFloat = 0;
        applyFrame(stepFloatToFrame(0), false);
      }
      S.playing = !S.playing; updatePlayIcons();
      markDirty();
    };
    $('ctrl-loop').onclick = () => { S.loop = !S.loop; $('ctrl-loop').classList.toggle('active', S.loop); };
    document.querySelectorAll('#speed-pills .spd-btn').forEach(b => b.onclick = () => {
      S.speed = parseFloat(b.dataset.spd);
      document.querySelectorAll('#speed-pills .spd-btn').forEach(x => x.classList.toggle('active', x === b));
    });
    wireStageScrub();

    const handleFile = file => {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => tryOpenBuffer(r.result, null, file.name.replace(/\.(iiwgl|unencrypted)$/i, ''));
      r.readAsArrayBuffer(file);
    };
    $('file-input').onchange = e => handleFile(e.target.files[0]);
    $('drop-zone').onclick = () => $('file-input').click();
    $('drop-zone').ondragover = e => { e.preventDefault(); $('drop-zone').classList.add('drag'); };
    $('drop-zone').ondragleave = () => $('drop-zone').classList.remove('drag');
    $('drop-zone').ondrop = e => { e.preventDefault(); $('drop-zone').classList.remove('drag'); handleFile(e.dataTransfer.files[0]); };
    document.body.ondragover = e => e.preventDefault();
    document.body.ondrop = e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

    const unlock = () => { if (S.pendingBuf) tryOpenBuffer(S.pendingBuf.buf, $('pwd-input').value, S.pendingBuf.title); };
    $('pwd-submit').onclick = unlock;
    $('pwd-input').onkeydown = e => { if (e.key === 'Enter') unlock(); };

    window.addEventListener('message', ev => {
      try {
        const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'PLAY_TO') jumpToStage(msg.key === 'first' ? 0 : msg.key === 'last' ? 9999 : parseInt(msg.key, 10) || 0);
        else if (msg.type === 'CAMERA' && msg.from) setCameraView(msg.from.toLowerCase());
        else if (msg.type === 'THEME') setTheme(msg.value);
        else if (msg.type === 'ATTACHMENT_STYLE') {
          S.attMode = msg.value === 'hidden' ? 'hidden' : (msg.value === 'ghost' || msg.value === 'subtle' ? 'subtle' : 'full');
          updateAttStyle();
        }
        else if (msg.type === 'HIDE_JAW') setArchVisibility(msg.jaw === 'upper' ? 'lower' : msg.jaw === 'lower' ? 'upper' : 'both');
        else if (msg.type === 'RULER_STYLE') toggleOrthoGrid(msg.value === 'ruler');
      } catch (_) {}
    });

    const viewKeys = ['front', 'upper', 'lower', 'left', 'right', 'maxilla', 'mandible', 'occlusion', 'multi'];
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { e.preventDefault(); $('ctrl-play').click(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); jumpToStage(S.stepIdx + 1); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); jumpToStage(S.stepIdx - 1); }
      else if (e.code === 'Home') { e.preventDefault(); jumpToStage(0); }
      else if (e.code === 'End' && S.model) { e.preventDefault(); jumpToStage(S.model.playback.length - 1); }
      else if (e.key >= '1' && e.key <= '9') setCameraView(viewKeys[parseInt(e.key, 10) - 1]);
      else if (e.key === 'g' || e.key === 'G') $('tool-grid').click();
      else if (e.key === 'i' || e.key === 'I') $('tool-ipr').click();
      else if (e.key === 'h' || e.key === 'H') $('tool-contact').click();
      else if (e.key === 'm' || e.key === 'M') $('tool-caliper').click();
      else if (e.key === 'c' || e.key === 'C') $('tool-clip').click();
      else if (e.code === 'Escape') {
        closePopovers();
        if (S.caliperOn) $('tool-caliper').click();
        if (document.body.classList.contains('drawer-open')) $('drawer-close').click();
      }
    });
  }

  function boot() {
    if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      location.replace('https://' + location.host + location.pathname + location.search + location.hash);
      return;
    }
    if (!initThree()) {
      $('entry-modal').classList.remove('hidden');
      $('modal-err').textContent = 'WebGL 3D is unavailable or disabled in this browser.';
      return;
    }
    wireUI();
    const qs = new URLSearchParams(location.search);
    if (window.self !== window.top) document.body.dataset.vcEmbed = '1';
    if (qs.get('patientView') === '1') document.body.dataset.vcPatient = '1';
    if (qs.get('presentation') === '1') document.body.dataset.vcPresentation = '1';
    if (qs.get('debugFps') === '1') { debugFps = true; $('fps-hud').classList.remove('hidden'); }
    if (qs.get('compareView') === '1') toggleCompare(true);
    S.customSub = qs.get('sub') || null;
    setLang(qs.get('lang') === 'fr' ? 'fr' : 'en');
    setTheme(qs.get('theme') === 'light' ? 'light' : 'dark');
    const mlink = qs.get('mlink');
    const pwd = qs.get('p') || qs.get('pw') || null;
    const title = qs.get('title') || null;
    if (mlink) fetchIIWGL(mlink, pwd, title);
    else $('entry-modal').classList.remove('hidden');
  }

  boot();
})();

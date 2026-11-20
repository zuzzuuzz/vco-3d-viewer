(function () {
  'use strict';

  const RAIL_W = 58;
  const $ = id => document.getElementById(id);

  const S = {
    model: null,
    objects: [],
    ghostMeshes: [],
    frame: 0,
    targetFrame: null,
    stepIdx: 0,
    playing: false,
    loop: false,
    speed: 1,
    view: 'front',
    archFilter: 'both',
    isOrtho: true,
    attMode: 'full', // 'full' | 'subtle' | 'hidden'
    ghostOn: false,
    clipAxis: 'none',
    clipVal: 0,
    clipInvert: false,
    caliperOn: false,
    caliperPts: [],
    caliperGroup: null,
    center: new THREE.Vector3(),
    radius: 40,
    bboxMin: new THREE.Vector3(-30, -20, -25),
    bboxMax: new THREE.Vector3(30, 20, 25),
    pendingBuf: null,
    lastTick: 0,
    camAnim: null,
    lastNormalTime: 0
  };

  let renderer, scene, orthoCam, perspCam, cam, controls, clipPlane;
  let rootGroup, ghostGroup, ptrDown = null;

  function initThree() {
    const vp = $('viewport');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(vp.clientWidth, vp.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.localClippingEnabled = true;
    renderer.setScissorTest(false);
    vp.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e5);

    // Procedural Dental Studio Softbox Environment (high-contrast reflections without washing out diffuse)
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
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xfcf8f0, 0x1e2430, 0.34));
    const key = new THREE.DirectionalLight(0xfffaf0, 0.92); key.position.set(26, 42, 58); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.28); fill.position.set(-55, 8, 35); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8c2, 0.32); rim.position.set(0, -36, -45); scene.add(rim);

    const asp = vp.clientWidth / Math.max(1, vp.clientHeight);
    orthoCam = new THREE.OrthographicCamera(-45 * asp, 45 * asp, 45, -45, -400, 400);
    perspCam = new THREE.PerspectiveCamera(32, asp, 0.5, 800);
    cam = orthoCam;
    cam.position.set(0, 0, 160);

    controls = new THREE.OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.85; controls.panSpeed = 0.85; controls.zoomSpeed = 1.1;

    rootGroup = new THREE.Group();
    ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    S.caliperGroup = new THREE.Group();
    scene.add(rootGroup, ghostGroup, S.caliperGroup);

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', ev => { ptrDown = { x: ev.clientX, y: ev.clientY, btn: ev.button }; });
    renderer.domElement.addEventListener('pointerup', onCanvasClick);
  }

  function updateCamProjection(aspect, radius) {
    const h = (radius || S.radius) * 1.28;
    orthoCam.left = -h * aspect; orthoCam.right = h * aspect;
    orthoCam.top = h; orthoCam.bottom = -h;
    orthoCam.updateProjectionMatrix();
    perspCam.aspect = aspect;
    perspCam.updateProjectionMatrix();
  }

  function onResize() {
    const vp = $('viewport');
    renderer.setSize(vp.clientWidth, vp.clientHeight);
    updateCamProjection(vp.clientWidth / Math.max(1, vp.clientHeight));
  }

  function makeMaterial(obj) {
    const t = obj.type, isTooth = t >= 11 && t <= 85;
    const isGingiva = t === 227 || t === 228;
    const isAtt = t === 107 || (obj.name && obj.name.indexOf(':') !== -1);
    const isMalocc = t === 210 || t === 211;
    const isBone = t === 245 || t === 246;
    const fc = new THREE.Color(obj.faceColor[0], obj.faceColor[1], obj.faceColor[2]);

    const useVC = !!(obj.mesh && obj.mesh.vertexColors && obj.useTexture && !isGingiva);
    const props = {
      side: THREE.DoubleSide,
      clippingPlanes: obj.doClip ? [clipPlane] : [],
      clipShadows: false,
      vertexColors: useVC
    };

    if (isTooth) {
      const ec = new THREE.Color(0xebe4d4).convertSRGBToLinear();
      Object.assign(props, { color: useVC ? new THREE.Color(0xf7f2e8).convertSRGBToLinear() : ec, roughness: 0.28, metalness: 0.0, clearcoat: 0.58, clearcoatRoughness: 0.16, envMapIntensity: 0.35 });
    } else if (isGingiva) {
      const col = new THREE.Color(0xc4565e).convertSRGBToLinear();
      Object.assign(props, { color: col, roughness: 0.34, metalness: 0.0, clearcoat: 0.48, clearcoatRoughness: 0.2, envMapIntensity: 0.28, transparent: true, opacity: 0.85, depthWrite: true });
    } else if (isAtt) {
      const col = obj.useFaceColor ? fc.clone().convertSRGBToLinear() : new THREE.Color(0xcfa156).convertSRGBToLinear();
      Object.assign(props, { color: col, roughness: 0.24, metalness: 0.05, clearcoat: 0.65, clearcoatRoughness: 0.12, envMapIntensity: 0.4, transparent: false, opacity: 1 });
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

  function buildGeometry(m) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.vertices), 3));
    geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    if (m.normals) geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    else geo.computeVertexNormals();
    if (m.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
    if (m.vertexColors) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.vertexColors), 3));
    geo.computeBoundingBox();
    return geo;
  }

  function clearScene() {
    while (rootGroup.children.length) {
      const c = rootGroup.children[0]; rootGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
    }
    while (ghostGroup.children.length) {
      const c = ghostGroup.children[0]; ghostGroup.remove(c);
      if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose();
    }
    clearCaliper();
    S.objects = []; S.ghostMeshes = [];
  }

  function loadModel(model, titleHint) {
    clearScene();
    S.model = model;
    S.playing = false;
    S.targetFrame = null;
    S.lastTick = 0;
    updatePlayIcons();
    $('gingiva-op').value = '0.85';
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const frame0 = model.playback.length ? model.playback[0].frame : 0;
    const ghostMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x14b8a6).convertSRGBToLinear(), transparent: true, opacity: 0.26,
      roughness: 0.42, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
    });

    for (let i = 0; i < model.objects.length; i++) {
      const o = model.objects[i];
      if (!o.mesh) continue;
      const isAtt = o.type === 107 || (o.name && o.name.indexOf(':') !== -1);
      if (isAtt) o.type = 107;
      const isMalocc = o.type === 210 || o.type === 211;

      const geo = buildGeometry(o.mesh);
      const mat = makeMaterial(o);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      IIWGL.evalObjectTransform(o, frame0, tmpMat);
      mesh.matrix.fromArray(tmpMat);
      mesh.matrixWorldNeedsUpdate = true;
      mesh.visible = isMalocc ? false : o.isVisible;
      mesh.userData = { idx: i, o };
      rootGroup.add(mesh);

      const entry = { o, mesh, mat, geo, isAtt, isMalocc, isGingiva: o.type === 227 || o.type === 228,
        userVisible: true, lastMorphPos: '', lastMorphClr: '', origColor: mat.color.clone(), origOpacity: mat.opacity };
      S.objects.push(entry);

      if (!isMalocc) {
        const b = geo.boundingBox.clone().applyMatrix4(mesh.matrix);
        min.min(b.min); max.max(b.max);
      }
    }

    // Build Step-0 ghost from segmented teeth first to avoid gingiva z-fighting; fall back to 210/211 casts
    const m0 = new Float32Array(16);
    for (const e of S.objects) {
      if (e.o.type >= 11 && e.o.type <= 85) {
        const gm = new THREE.Mesh(e.geo, ghostMat);
        gm.matrixAutoUpdate = false;
        IIWGL.evalObjectTransform(e.o, frame0, m0);
        gm.matrix.fromArray(m0);
        gm.matrixWorldNeedsUpdate = true;
        gm.userData = { group: e.o.group };
        ghostGroup.add(gm); S.ghostMeshes.push(gm);
      }
    }
    if (!S.ghostMeshes.length) {
      for (const e of S.objects) {
        if (e.isMalocc) {
          const gm = new THREE.Mesh(e.geo, ghostMat);
          gm.matrixAutoUpdate = false;
          IIWGL.evalObjectTransform(e.o, frame0, m0);
          gm.matrix.fromArray(m0);
          gm.matrixWorldNeedsUpdate = true;
          gm.userData = { group: e.o.group };
          ghostGroup.add(gm); S.ghostMeshes.push(gm);
        }
      }
    }

    if (!isFinite(min.x)) { min.set(-30, -20, -25); max.set(30, 20, 25); }
    S.bboxMin.copy(min); S.bboxMax.copy(max);
    S.center.addVectors(min, max).multiplyScalar(0.5);
    S.radius = min.distanceTo(max) * 0.5 || 40;
    controls.target.copy(S.center);
    updateCamProjection($('viewport').clientWidth / Math.max(1, $('viewport').clientHeight), S.radius);

    buildStageBar();
    buildInspector();
    const total = Math.max(0, model.playback.length - 1);
    const isAnim = model.playback.length > 1;
    document.querySelector('.stage-dock').style.display = isAnim ? '' : 'none';
    const hasU = model.playback.filter((p, idx) => idx > 0 && (p.moves === 1 || p.moves === 3)).length;
    const hasL = model.playback.filter((p, idx) => idx > 0 && (p.moves === 2 || p.moves === 3)).length;
    $('case-title').textContent = titleHint || (model.imageType || 'Orthodontic Treatment Setup');
    $('case-sub').textContent = isAnim
      ? `${total} Steps · U: ${hasU} · L: ${hasL} · v${model.version}`
      : `Static 3D · v${model.version}`;

    S.stepIdx = -1;
    applyFrame(model.playback.length ? model.playback[0].frame : 0, true);
    setCameraView('front', false);
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

  const tmpMat = new Float32Array(16);
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

      let vis = IIWGL.evalVisib(o.keys.VISIB, frame, o.isVisible);
      if (!e.userVisible) vis = false;
      if (S.archFilter === 'upper' && o.group === 1) vis = false;
      if (S.archFilter === 'lower' && o.group === 0) vis = false;
      if (e.isAtt) {
        if (S.attMode === 'hidden') vis = false;
        else if (S.attMode === 'subtle') {
          e.mat.color.setHex(0xf1ece2).convertSRGBToLinear();
          e.mat.opacity = 0.42;
          if (!e.mat.transparent) { e.mat.transparent = true; e.mat.needsUpdate = true; }
        } else {
          e.mat.color.copy(e.origColor);
          e.mat.opacity = 1;
          if (e.mat.transparent) { e.mat.transparent = false; e.mat.needsUpdate = true; }
        }
      }
      e.mesh.visible = vis;

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
            if (doNorm) e.geo.computeVertexNormals();
          }
        }
      }

      if (o.keys.VTCLR.length && e.geo.attributes.color) {
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
    for (const gm of S.ghostMeshes) {
      gm.visible = !(S.archFilter === 'upper' && gm.userData.group === 1) &&
                   !(S.archFilter === 'lower' && gm.userData.group === 0);
    }
    syncStageUI(frame, forceNormals);
  }

  function buildStageBar() {
    const track = $('stage-track');
    track.innerHTML = '';
    const pbs = S.model.playback;
    pbs.forEach((p, idx) => {
      const btn = document.createElement('button');
      btn.className = 'stage-cell' + (idx === 0 ? ' active' : '');
      btn.title = p.name || `Step ${idx}`;
      const uOn = (p.moves === 1 || p.moves === 3) ? ' on-u' : '';
      const lOn = (p.moves === 2 || p.moves === 3) ? ' on-l' : '';
      btn.innerHTML = `<span class="stage-num">${idx}</span><span class="stage-bars"><span class="arch-bar${uOn}"></span><span class="arch-bar${lOn}"></span></span>`;
      btn.onclick = () => jumpToStage(idx);
      track.appendChild(btn);
    });
  }

  function syncStageUI(frame, force) {
    const pbs = S.model.playback;
    if (!pbs.length) return;
    let best = 0, dist = Infinity;
    for (let i = 0; i < pbs.length; i++) {
      const d = Math.abs(pbs[i].frame - frame);
      if (d < dist) { dist = d; best = i; }
    }
    const changed = force || best !== S.stepIdx;
    S.stepIdx = best;
    if (!changed) return;
    $('step-readout').textContent = `Step ${best} / ${pbs.length - 1}`;
    const cells = $('stage-track').children;
    for (let i = 0; i < cells.length; i++) cells[i].classList.toggle('active', i === best);
    if (cells[best]) cells[best].scrollIntoView({ behavior: S.playing ? 'auto' : 'smooth', inline: 'nearest', block: 'nearest' });
  }

  function jumpToStage(idx) {
    if (!S.model || !S.model.playback.length) return;
    S.playing = false; updatePlayIcons();
    const clamped = Math.max(0, Math.min(S.model.playback.length - 1, idx));
    S.targetFrame = S.model.playback[clamped].frame;
  }

  function updatePlayIcons() {
    $('ico-play').style.display = S.playing ? 'none' : 'block';
    $('ico-pause').style.display = S.playing ? 'block' : 'none';
  }

  function getViewPose(view) {
    const d = Math.max(120, S.radius * 3.2), c = S.center;
    const map = {
      front:     { off: [0, 0, d], up: [0, 1, 0], arch: 'both' },
      upper:     { off: [0, 2, d], up: [0, 1, 0], arch: 'upper' },
      lower:     { off: [0, -2, d], up: [0, 1, 0], arch: 'lower' },
      left:      { off: [d, 0, 0], up: [0, 1, 0], arch: 'both' },
      right:     { off: [-d, 0, 0], up: [0, 1, 0], arch: 'both' },
      maxilla:   { off: [0, -d, 0], up: [0, 0, 1], arch: 'upper' },
      mandible:  { off: [0, d, 0], up: [0, 0, -1], arch: 'lower' }
    };
    const p = map[view] || map.front;
    return { pos: new THREE.Vector3(c.x + p.off[0], c.y + p.off[1], c.z + p.off[2]), up: new THREE.Vector3(...p.up), arch: p.arch };
  }

  function setArchVisibility(arch) {
    S.archFilter = arch || 'both';
    applyFrame(S.frame, false);
  }

  function setSplitLabels(mode) {
    const g = $('split-guides'), vp = $('viewport'), w = vp.clientWidth, h = vp.clientHeight;
    const ids = ['lbl-tl', 'lbl-tr', 'lbl-bl', 'lbl-br'];
    ids.forEach(id => $(id).style.display = 'none');
    g.className = '';
    if (mode === 'occlusion') {
      g.className = 'mode-occlus';
      $('lbl-tl').textContent = 'Maxilla'; $('lbl-tl').style.cssText = `display:block;top:140px;left:${RAIL_W + 18}px`;
      $('lbl-tr').textContent = 'Mandible'; $('lbl-tr').style.cssText = `display:block;top:140px;left:${Math.round((w + RAIL_W) / 2) + 16}px`;
    } else if (mode === 'multi') {
      g.className = 'mode-multi';
      const midX = Math.round((w + RAIL_W) / 2), midY = Math.round(h / 2);
      $('lbl-tl').textContent = 'Frontal'; $('lbl-tl').style.cssText = `display:block;top:140px;left:${RAIL_W + 18}px`;
      $('lbl-tr').textContent = 'Left Buccal'; $('lbl-tr').style.cssText = `display:block;top:140px;left:${midX + 16}px`;
      $('lbl-bl').textContent = 'Right Buccal'; $('lbl-bl').style.cssText = `display:block;top:${midY + 12}px;left:${RAIL_W + 18}px`;
      $('lbl-br').textContent = 'Maxillary Occlusal'; $('lbl-br').style.cssText = `display:block;top:${midY + 12}px;left:${midX + 16}px`;
    }
  }

  function setCameraView(view, animate) {
    S.view = view;
    document.querySelectorAll('.view-tile').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    setSplitLabels(view);
    if (view === 'occlusion' || view === 'multi') { S.archFilter = 'both'; applyFrame(S.frame, false); return; }

    const pose = getViewPose(view);
    setArchVisibility(pose.arch);
    if (!animate) {
      cam.position.copy(pose.pos); cam.up.copy(pose.up);
      controls.target.copy(S.center); orthoCam.zoom = 1; orthoCam.updateProjectionMatrix(); controls.update();
    } else {
      S.camAnim = { t: 0, p0: cam.position.clone(), p1: pose.pos, u0: cam.up.clone(), u1: pose.up, t0: controls.target.clone(), t1: S.center.clone(), z0: orthoCam.zoom };
    }
  }

  function buildInspector() {
    const list = $('insp-list'); list.innerHTML = '';
    for (const e of S.objects) {
      if (e.isMalocc) continue;
      const row = document.createElement('div'); row.className = 'insp-row';
      const lbl = document.createElement('label');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = e.o.isVisible;
      cb.onchange = () => { e.userVisible = cb.checked; applyFrame(S.frame, false); };
      const sp = document.createElement('span'); sp.textContent = e.o.name;
      lbl.append(cb, sp); row.appendChild(lbl); list.appendChild(row);
    }
  }

  function updateClipPlane() {
    const ax = S.clipAxis;
    if (ax === 'none') { clipPlane.constant = 1e5; return; }
    const s = S.clipInvert ? -1 : 1;
    const dir = new THREE.Vector3(ax === 'x' ? s : 0, ax === 'y' ? s : 0, ax === 'z' ? s : 0);
    const span = (ax === 'x' ? S.bboxMax.x - S.bboxMin.x : ax === 'y' ? S.bboxMax.y - S.bboxMin.y : S.bboxMax.z - S.bboxMin.z) * 0.55;
    const pt = S.center.clone().addScaledVector(dir, S.clipVal * span * s);
    clipPlane.setFromNormalAndCoplanarPoint(dir, pt);
  }

  function clearCaliper() {
    S.caliperPts = [];
    while (S.caliperGroup.children.length) {
      const c = S.caliperGroup.children[0]; S.caliperGroup.remove(c);
      if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose();
    }
    $('caliper-val').textContent = 'Click 2 points';
  }

  function onCanvasClick(ev) {
    if (!S.caliperOn || !ptrDown || ptrDown.btn !== 0 || ev.button !== 0 || S.view === 'multi' || S.view === 'occlusion') { ptrDown = null; return; }
    const moved = Math.hypot(ev.clientX - ptrDown.x, ev.clientY - ptrDown.y);
    ptrDown = null;
    if (moved > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, cam);
    const hits = ray.intersectObjects(rootGroup.children.filter(m => m.visible), false);
    if (!hits.length) return;
    if (S.caliperPts.length >= 2) clearCaliper();
    const p = hits[0].point.clone();
    S.caliperPts.push(p);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), new THREE.MeshBasicMaterial({ color: 0x0f766e, depthTest: false }));
    dot.renderOrder = 20;
    dot.position.copy(p); S.caliperGroup.add(dot);
    if (S.caliperPts.length === 2) {
      const d = S.caliperPts[0].distanceTo(S.caliperPts[1]);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(S.caliperPts), new THREE.LineBasicMaterial({ color: 0x14b8a6, depthTest: false }));
      line.renderOrder = 19;
      S.caliperGroup.add(line);
      $('caliper-val').textContent = `${d.toFixed(2)} mm`;
    } else {
      $('caliper-val').textContent = 'Pick 2nd point';
    }
  }

  function renderViewCell(x, y, w, h, viewName, archFilter, scaleMul, yBias) {
    const pose = getViewPose(viewName);
    const c = orthoCam;
    const asp = w / Math.max(1, h);
    const fr = S.radius * (scaleMul || 1.24);
    const tgt = S.center.clone();
    if (yBias) tgt.y += S.radius * yBias;
    c.left = -fr * asp; c.right = fr * asp; c.top = fr; c.bottom = -fr;
    c.zoom = 1; c.position.copy(pose.pos); if (yBias) c.position.y += S.radius * yBias;
    c.up.copy(pose.up); c.lookAt(tgt); c.updateProjectionMatrix();

    const prevVis = S.objects.map(e => e.mesh.visible);
    if (archFilter) {
      for (const e of S.objects) {
        if (archFilter === 'upper' && e.o.group === 1) e.mesh.visible = false;
        if (archFilter === 'lower' && e.o.group === 0) e.mesh.visible = false;
      }
    }
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    renderer.render(scene, c);
    for (let i = 0; i < S.objects.length; i++) S.objects[i].mesh.visible = prevVis[i];
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = S.lastTick ? Math.min(0.05, (now - S.lastTick) / 1000) : 0.016;
    S.lastTick = now;

    if (S.playing && S.model && S.model.playback.length > 1) {
      const pbs = S.model.playback, f0 = pbs[0].frame, f1 = pbs[pbs.length - 1].frame;
      const rate = ((f1 - f0) / Math.max(4, Math.min(18, pbs.length * 0.9))) * S.speed;
      let nf = S.frame + rate * dt;
      if (nf >= f1) {
        if (S.loop) nf = f0;
        else { nf = f1; S.playing = false; updatePlayIcons(); }
      }
      applyFrame(nf, !S.playing);
    } else if (S.targetFrame !== null) {
      const diff = S.targetFrame - S.frame;
      if (Math.abs(diff) < 0.8) { applyFrame(S.targetFrame, true); S.targetFrame = null; }
      else applyFrame(S.frame + diff * 0.25, false);
    }

    if (S.camAnim) {
      const a = S.camAnim; a.t = Math.min(1, a.t + dt / 0.28);
      const k = 1 - Math.pow(1 - a.t, 3);
      cam.position.lerpVectors(a.p0, a.p1, k);
      cam.up.lerpVectors(a.u0, a.u1, k).normalize();
      controls.target.lerpVectors(a.t0, a.t1, k);
      if (S.isOrtho) { orthoCam.zoom = a.z0 + (1 - a.z0) * k; orthoCam.updateProjectionMatrix(); }
      if (a.t >= 1) S.camAnim = null;
    }

    const vp = $('viewport'), W = vp.clientWidth, H = vp.clientHeight;
    if (S.view === 'occlusion') {
      renderer.setScissorTest(true);
      const availW = W - RAIL_W, hw = Math.floor(availW / 2);
      renderViewCell(RAIL_W, 0, hw, H, 'maxilla', 'upper');
      renderViewCell(RAIL_W + hw, 0, availW - hw, H, 'mandible', 'lower');
      renderer.setScissorTest(false);
    } else if (S.view === 'multi') {
      renderer.setScissorTest(true);
      const availW = W - RAIL_W, hw = Math.floor(availW / 2), hh = Math.floor(H / 2);
      renderViewCell(RAIL_W, hh, hw, H - hh, 'front', 'both', 1.48, 0.22);
      renderViewCell(RAIL_W + hw, hh, availW - hw, H - hh, 'left', 'both', 1.48, 0.22);
      renderViewCell(RAIL_W, 0, hw, hh, 'right', 'both', 1.48, -0.18);
      renderViewCell(RAIL_W + hw, 0, availW - hw, hh, 'maxilla', 'upper', 1.48, 0);
      renderer.setScissorTest(false);
    } else {
      controls.update();
      renderer.setViewport(0, 0, W, H);
      renderer.render(scene, cam);
    }
  }

  function tryOpenBuffer(buf, pwd, title) {
    S.pendingBuf = { buf, title };
    try {
      const model = IIWGL.parseIIWGL(buf, pwd);
      $('entry-modal').classList.add('hidden');
      $('loader-overlay').classList.add('hidden');
      loadModel(model, title);
    } catch (err) {
      $('loader-overlay').classList.add('hidden');
      $('entry-modal').classList.remove('hidden');
      $('pwd-input').style.display = 'block';
      $('pwd-submit').style.display = 'block';
      if (err.code === 'NEED_PASSWORD') {
        $('modal-title').textContent = 'Encrypted Case';
        $('modal-desc').textContent = 'Enter the OnyxCeph WebExport password to unlock this 3D setup.';
        $('modal-err').textContent = '';
      } else {
        $('modal-err').textContent = err.message || 'Unable to parse .iiwgl file';
      }
      $('pwd-input').focus();
    }
  }

  function normalizeMlink(raw) {
    let s = (raw || '').trim();
    if (/^cases\.vcconnect\.link(\/|$)/i.test(s)) s = 'https://' + s;
    s = s.replace(/^(https?:\/\/cases\.vcconnect\.link)(?!\/|$)/i, '$1/');
    try {
      const u = new URL(s, location.href);
      if (u.protocol === 'http:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
        u.protocol = 'https:';
      }
      u.pathname = u.pathname.replace(/\/{2,}/g, '/');
      return u.toString();
    } catch (_) {
      return s;
    }
  }

  async function fetchIIWGL(rawUrl, pwd, title) {
    const url = normalizeMlink(rawUrl);
    $('entry-modal').classList.add('hidden');
    $('loader-overlay').classList.remove('hidden');
    $('prog-fill').style.width = '5%';
    try {
      let res;
      try {
        res = await fetch(url);
      } catch (_) {
        await new Promise(r => setTimeout(r, 800));
        res = await fetch(url);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} loading case`);
      const total = parseInt(res.headers.get('content-length') || '0', 10);
      const reader = res.body && res.body.getReader ? res.body.getReader() : null;
      let buf;
      if (reader) {
        const chunks = []; let got = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); got += value.length;
          if (total > 0) $('prog-fill').style.width = `${Math.min(98, Math.round((got / total) * 100))}%`;
        }
        const merged = new Uint8Array(got); let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        buf = merged.buffer;
      } else {
        buf = await res.arrayBuffer();
      }
      $('prog-fill').style.width = '100%';
      $('loader-msg').textContent = 'Decoding OpenCTM meshes...';
      requestAnimationFrame(() => tryOpenBuffer(buf, pwd, title));
    } catch (e) {
      let host = '';
      try { host = new URL(url, location.href).host; } catch (_) {}
      $('loader-overlay').classList.add('hidden');
      $('entry-modal').classList.remove('hidden');
      $('modal-err').textContent = host ? `${e.message} (${host})` : e.message;
    }
  }

  function setTheme(theme) {
    const light = theme === 'light';
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    $('ico-sun').style.display = light ? 'none' : 'block';
    $('ico-moon').style.display = light ? 'block' : 'none';
  }

  function wireUI() {
    $('tool-theme').onclick = () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    $('tool-att').onclick = () => {
      const order = ['full', 'subtle', 'hidden'];
      S.attMode = order[(order.indexOf(S.attMode) + 1) % 3];
      $('tool-att').setAttribute('data-tip', 'Attachments: ' + S.attMode[0].toUpperCase() + S.attMode.slice(1));
      $('tool-att').classList.toggle('active', S.attMode !== 'hidden');
      $('tool-att').classList.toggle('has-state', S.attMode === 'subtle');
      applyFrame(S.frame, false);
    };
    $('tool-ghost').onclick = () => {
      S.ghostOn = !S.ghostOn; ghostGroup.visible = S.ghostOn;
      $('tool-ghost').classList.toggle('active', S.ghostOn);
    };
    $('tool-clip').onclick = () => {
      const open = $('clip-popover').classList.toggle('open');
      $('tool-clip').classList.toggle('active', open || S.clipAxis !== 'none');
    };
    document.querySelectorAll('#clip-axes button').forEach(b => b.onclick = () => {
      S.clipAxis = b.dataset.axis;
      document.querySelectorAll('#clip-axes button').forEach(x => x.classList.toggle('active', x === b));
      $('tool-clip').classList.toggle('active', S.clipAxis !== 'none' || $('clip-popover').classList.contains('open'));
      updateClipPlane();
    });
    $('clip-slider').oninput = e => { S.clipVal = parseFloat(e.target.value); updateClipPlane(); };
    $('clip-inv').onclick = () => { S.clipInvert = !S.clipInvert; $('clip-inv').classList.toggle('active', S.clipInvert); updateClipPlane(); };

    $('tool-caliper').onclick = () => {
      S.caliperOn = !S.caliperOn;
      $('tool-caliper').classList.toggle('active', S.caliperOn);
      $('caliper-pill').classList.toggle('open', S.caliperOn);
      if (!S.caliperOn) clearCaliper();
    };
    $('caliper-clear').onclick = clearCaliper;

    $('tool-insp').onclick = () => { const op = $('inspector').classList.toggle('open'); $('tool-insp').classList.toggle('active', op); };
    $('insp-close').onclick = () => { $('inspector').classList.remove('open'); $('tool-insp').classList.remove('active'); };
    $('gingiva-op').oninput = e => {
      const val = parseFloat(e.target.value);
      for (const obj of S.objects) if (obj.isGingiva) {
        obj.mat.opacity = val;
        obj.mat.transparent = val < 0.99;
        obj.mat.needsUpdate = true;
      }
    };

    $('btn-cam-mode').onclick = () => {
      S.isOrtho = !S.isOrtho;
      const prevPos = cam.position.clone(), prevUp = cam.up.clone(), prevTgt = controls.target.clone();
      cam = S.isOrtho ? orthoCam : perspCam;
      cam.position.copy(prevPos); cam.up.copy(prevUp);
      controls.object = cam; controls.target.copy(prevTgt); controls.update();
      $('btn-cam-mode').textContent = S.isOrtho ? 'Ortho' : 'Persp';
      $('btn-cam-mode').classList.toggle('active', S.isOrtho);
    };

    document.querySelectorAll('.view-tile').forEach(b => b.onclick = () => setCameraView(b.dataset.view, true));
    $('ctrl-first').onclick = () => jumpToStage(0);
    $('ctrl-prev').onclick = () => jumpToStage(S.stepIdx - 1);
    $('ctrl-next').onclick = () => jumpToStage(S.stepIdx + 1);
    $('ctrl-last').onclick = () => S.model && jumpToStage(S.model.playback.length - 1);
    $('ctrl-play').onclick = () => {
      if (!S.model || S.model.playback.length < 2) return;
      S.targetFrame = null;
      S.lastTick = performance.now();
      const last = S.model.playback[S.model.playback.length - 1].frame;
      if (!S.playing && Math.abs(S.frame - last) < 1) applyFrame(S.model.playback[0].frame, false);
      S.playing = !S.playing; updatePlayIcons();
    };
    $('ctrl-loop').onclick = () => { S.loop = !S.loop; $('ctrl-loop').classList.toggle('active', S.loop); };
    document.querySelectorAll('#speed-pills .spd-btn').forEach(b => b.onclick = () => {
      S.speed = parseFloat(b.dataset.spd);
      document.querySelectorAll('#speed-pills .spd-btn').forEach(x => x.classList.toggle('active', x === b));
    });

    const handleFile = file => {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => tryOpenBuffer(r.result, null, file.name.replace(/\.(iiwgl|unencrypted)$/i, ''));
      r.readAsArrayBuffer(file);
    };
    $('btn-open-file').onclick = () => $('file-input').click();
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
        else if (msg.type === 'CAMERA' && msg.from) setCameraView(msg.from.toLowerCase(), true);
        else if (msg.type === 'THEME') setTheme(msg.value);
        else if (msg.type === 'ATTACHMENT_STYLE') { S.attMode = msg.value === 'ghost' ? 'subtle' : msg.value; applyFrame(S.frame, false); }
        else if (msg.type === 'MALOCCLUSION_STYLE') { S.ghostOn = msg.value === 'ghost'; ghostGroup.visible = S.ghostOn; }
        else if (msg.type === 'HIDE_JAW') setArchVisibility(msg.jaw === 'upper' ? 'lower' : msg.jaw === 'lower' ? 'upper' : 'both');
      } catch (_) {}
    });

    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { e.preventDefault(); $('ctrl-play').click(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); jumpToStage(S.stepIdx + 1); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); jumpToStage(S.stepIdx - 1); }
      else if (e.code === 'Home') { e.preventDefault(); jumpToStage(0); }
      else if (e.code === 'End' && S.model) { e.preventDefault(); jumpToStage(S.model.playback.length - 1); }
      else if (e.code === 'Escape') {
        $('clip-popover').classList.remove('open');
        $('tool-clip').classList.toggle('active', S.clipAxis !== 'none');
        $('inspector').classList.remove('open');
        $('tool-insp').classList.remove('active');
        if (S.caliperOn) {
          S.caliperOn = false;
          $('tool-caliper').classList.remove('active');
          $('caliper-pill').classList.remove('open');
          clearCaliper();
        }
      }
    });
  }

  function boot() {
    if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      location.replace('https://' + location.host + location.pathname + location.search + location.hash);
      return;
    }
    initThree();
    wireUI();
    requestAnimationFrame(animate);
    const qs = new URLSearchParams(location.search);
    setTheme(qs.get('theme') === 'light' ? 'light' : 'dark');
    const mlink = qs.get('mlink');
    const pwd = qs.get('p') || qs.get('pw') || null;
    const title = qs.get('title') || null;
    if (mlink) fetchIIWGL(mlink, pwd, title);
    else $('entry-modal').classList.remove('hidden');
  }

  boot();
})();

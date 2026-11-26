/* eodi 히어로: 국내는 KTX 역, 해외는 공항. 맑은 하늘 아래 실사 느낌의 빛과 재질로 그려짐 */
(function () {
  const S = window.SCENE;
  // 전광판 포스터는 입체 지도의 장소와 같은 id: 이름, 축제 여부, 열리는 때, 가는 길을 지도 자료에서 채움
  for (const B of [S.board, S.airport.board]) B.ads = B.ads.map((ad) => {
    const p = S.atlas.places.find((q) => q.id === ad.id);
    return p ? { kind: p.kind || 'place', name: p.name, when: p.when || '사계절', trip: p.trip, ...ad } : ad;
  });
  const C = S.colors;
  const M = S.motion;
  const LK = S.look;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const prog = (t, start, dur) => clamp01((t - start) / dur);
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeOutQuart = (p) => 1 - Math.pow(1 - p, 4);
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOutBack = (p) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  // ---------- renderer / scene / camera ----------
  const host = document.getElementById('stage');
  const params = new URLSearchParams(location.search);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const Q = [ // 품질 단계: 기기가 버거워하면 아래 단계로 내려감
    { dpr: Math.min(window.devicePixelRatio, LK.maxDpr), shadow: 1024 }, // 그림자 해상도 1024: 필름 번짐이 가장자리를 덮어 차이가 거의 안 보임
    { dpr: Math.min(window.devicePixelRatio, 1), shadow: 1024 },
    { dpr: Math.min(window.devicePixelRatio, 0.8), shadow: 1024 },
    { dpr: Math.min(window.devicePixelRatio, 0.65), shadow: 1024 },
  ];
  let qi = 0;
  renderer.setPixelRatio(Q[0].dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // 부드러운 그림자(PCFSoft)보다 표본이 적어 가벼움
  renderer.shadowMap.autoUpdate = false; // 물체가 움직일 때만 그림자를 다시 계산
  // 톤 매핑과 색 보정은 필름 필터 단계(film)에서 한 번에 처리
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const target = new THREE.Vector3(...S.camera.target);
  const camDir = new THREE.Vector3(1, 1, 1).normalize();
  const camDist = 120;
  const povCam = new THREE.PerspectiveCamera(2, 1, 1, 10);
  let viewP = 0, viewAnim = null, viewTarget = 0;

  // 디자인 색(sRGB)을 렌더러가 쓰는 선형 색으로 바꿈
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const col = (key) => lin(C[key]);
  const MD = window.EODI_MODELS; // models/models.js: 실사풍 모델과 표면 재질
  const OBJ = window.EODI_OBJECTS(THREE, MD); // objects.js: 의자, 가로등, 휴지통, 고깔, 게이트 좌석, 조명탑 모델
  const DR = window.EODI_DREAM(THREE, S.dream, S.atlas); // dream.js: 진주빛 도장, 등고선, 그라데이션 유리, 오렌지 글로우
  const modelMat = (name, fade) => { const m = MD.materials[name].clone(); if (fade) { m.transparent = true; m.opacity = 0; } return m; };

  // ---------- 하늘: 반사와 은은한 빛을 주는 환경맵 (시간대가 바뀌면 다시 구움) ----------
  const envSky = new THREE.Scene();
  let bakeEnv;
  {
    const skyScene = envSky;
    const sunDir = new THREE.Vector3(...LK.sun.pos).normalize();
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: lin(C.skyTop) }, mid: { value: lin(C.skyMid) }, low: { value: lin(C.haze) }, ground: { value: lin(LK.sky.ground) }, sun: { value: sunDir }, sunAmt: { value: 1 }, panel: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `
        uniform vec3 top, mid, low, ground, sun; uniform float sunAmt, panel; varying vec3 vD;
        void main(){
          float y = vD.y;
          vec3 c = y > 0. ? mix(low, mix(mid, top, smoothstep(.25, .9, y)), smoothstep(0., .25, y)) : mix(low, ground, smoothstep(0., -.2, y));
          float s = max(dot(normalize(vD), sun), 0.);
          c += vec3(1., .97, .9) * (pow(s, 900.) * 40. + pow(s, 12.) * .35) * sunAmt; // 해와 그 주변의 밝은 기운
          // 반사에만 보이는 스튜디오 조명: 화면 시점(대각선 위)에서 광택 면에 실제로 맺히는 방향에 둠
          // 차체 어깨에 길게 맺히는 흰 빛 띠, 윗면에 비치는 연보라 천장, 옆면과 유리에 비치는 분홍·라일락 바닥(사진 스튜디오의 무한 배경처럼)
          vec3 d = normalize(vD);
          float key = smoothstep(.955, .985, dot(d, normalize(vec3(.55, .6, -.58))));
          float fill = smoothstep(.8, .95, dot(d, normalize(vec3(-.58, .62, -.58))));
          float rimL = smoothstep(.93, .975, dot(d, normalize(vec3(-.2, .35, .92))));
          vec3 cyc = mix(vec3(.86, .74, 1.), vec3(1., .78, .86), smoothstep(-.6, .6, d.x - d.z)); // 라일락 → 분홍 바닥
          c = mix(c, cyc, smoothstep(.02, -.25, y) * panel);
          c += (vec3(1.) * key * 3. + vec3(.82, .8, 1.) * fill * .8 + vec3(1., .8, .9) * rimL * 1.6) * panel;
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    skyScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), skyMat));
    bakeEnv = (P) => { // P: 지금 시간대 값
      const u = skyMat.uniforms;
      u.top.value.copy(P.sky[0]); u.mid.value.copy(P.sky[1]); u.low.value.copy(P.sky[3]); u.ground.value.copy(P.hemi[1]);
      u.sun.value.set(...P.sun[0]).normalize(); u.sunAmt.value = P.glow[1] / 0.18; u.panel.value = 1 - 0.8 * P.lights;
      const pmrem = new THREE.PMREMGenerator(renderer), old = scene.environment;
      scene.environment = pmrem.fromScene(skyScene, 0.02).texture;
      pmrem.dispose(); if (old) old.dispose();
    };
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(skyScene, 0.02).texture;
    pmrem.dispose();
  }

  const hemi = new THREE.HemisphereLight(lin(LK.sky.top), lin(LK.sky.ground), LK.sky.intensity);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(lin(LK.sun.color), LK.sun.intensity);
  sun.position.set(...LK.sun.pos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q[0].shadow, Q[0].shadow);
  sun.shadow.radius = 2; // 낮은 해상도에서 가장자리를 살짝 부드럽게
  sun.shadow.camera.left = -42; sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42; sun.shadow.camera.bottom = -42;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const sunBase = new THREE.Vector3(...LK.sun.pos); // 시간대에 따라 바뀌는 해(밤에는 달)의 위치
  let shadowDirty = true;
  const SH_HALF = 42;

  // 멀어질수록 하늘빛 안개 (화면 밖으로 이어지는 선로와 활주로 끝이 하늘에 녹음)
  scene.fog = new THREE.Fog(lin(C.haze), camDist + LK.haze.near, camDist + LK.haze.far);

  // 재질: 색 키마다 실제 소재처럼 거칠기, 금속성, 코팅을 정함
  const FINISH = {
    platformTop: { roughness: 0.9 },              // 흰 콘크리트
    platformSide: { roughness: 0.92 },
    safetyLine: { roughness: 0.7 },
    trackBed: { roughness: 1 },                   // 자갈
    sleeper: { roughness: 0.95 },
    rail: { roughness: 0.28, metalness: 0.9 },    // 강철
    canopy: { roughness: 0.42, clearcoat: 0.6 },  // 코팅된 흰 지붕
    pillar: { roughness: 0.5, metalness: 0.15 },
    building: { roughness: 0.85 },
    glass: { roughness: 0.04, metalness: 0.25, envMapIntensity: 1.6 },
    trainBody: { roughness: 0.16, envMapIntensity: 0.9 }, // 광택 도장
    planeBody: { roughness: 0.16, envMapIntensity: 0.9 },
    planeWing: { roughness: 0.35, metalness: 0.2, clearcoat: 0.5 },
    trainWindow: { roughness: 0.04, metalness: 0.35, envMapIntensity: 1.5 },
    trainStripe: { roughness: 0.25, clearcoat: 1 },
    bogie: { roughness: 0.55, metalness: 0.45 },
    asphalt: { roughness: 0.96 },
    mark: { roughness: 0.75 },
    accent: { roughness: 0.2, emissiveIntensity: 0.9 },
  };
  const mat = (key, extra = {}) => {
    const f = FINISH[key] || { roughness: 0.8 };
    const o = { color: col(key), metalness: 0, envMapIntensity: LK.envMatte, ...f, ...extra }; // 거친 면은 하늘 반사를 약하게 받아 그늘이 푸르게 남음
    if (key === 'accent') { o.emissive = col(key); }
    delete o.clearcoat; delete o.clearcoatRoughness; // 코팅은 계산이 두 배라 쓰지 않음
    const m = new THREE.MeshStandardMaterial(o);
    if (key === 'accent') m.userData.accent = true; // 밤에 다홍으로 밝아지는 활주로 등
    return m;
  };

  // 그림자만 받는 바닥 (하늘 위에 떠 있는 장면이 바닥에 푸른 그림자를 드리움)
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: lin(LK.shadow.color), opacity: LK.shadow.opacity }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.receiveShadow = true;
  // 구조물이 화면 밖까지 이어지므로 허공에 드리우는 바닥 그림자는 쓰지 않음 (물체끼리의 그림자는 그대로)

  // ---------- 땅에서 솟아오르는 구조물 ----------
  // 승강장, 건물, 도상은 지면 아래로 긴 몸통이 있어 화면 밖 아래에서부터 빌딩처럼 올라옴. 넓고 낮은 판은 타일로 나눠 물결처럼 솟음
  const RS = S.rise;
  const easeRise = (p) => 1 - Math.pow(1 - p, 4); // 빠르게 솟아 천천히 자리 잡음
  const hazeColor = lin(C.skyLow).multiplyScalar(RS.haze.gain);
  // 몸통 아래쪽은 높이에 따라 하늘빛으로 옅어짐 (멀어지는 빌딩처럼)
  const hazeDown = (m) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uHazeC = { value: hazeColor };
      sh.uniforms.uHazeR = { value: new THREE.Vector3(RS.haze.from, RS.haze.to, RS.haze.amount) };
      sh.vertexShader = 'varying float vHazeY;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 hazeP = vec4(transformed, 1.);
#ifdef USE_INSTANCING
        hazeP = instanceMatrix * hazeP;
#endif
        vHazeY = (modelMatrix * hazeP).y;`);
      sh.fragmentShader = 'varying float vHazeY; uniform vec3 uHazeC, uHazeR;\n' + sh.fragmentShader.replace('#include <fog_fragment>', `#include <fog_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeC, smoothstep(uHazeR.x, uHazeR.y, vHazeY) * uHazeR.z);`);
    };
    // 초현실 실사 재질로 바꿔 돌려줌: 유리는 다이크로익, 지붕은 도자기 광택, 금속은 코팅 광택, 나무는 니스, 바닥·벽·기둥은 콘크리트 그대로 (대리석 종류는 S.dream.kinds.marble로 남겨 둠)
    const n = m.name || '';
    const kind = n === 'glass' || (m.roughness < 0.1 && m.metalness >= 0.25) ? 'glass' : n === 'roof' ? 'roof'
      : /^metal/.test(n) ? 'mech' : n === 'wood' ? 'varnish' : 'structure';
    return DR.patch(m, kind);
  };
  const gD = new THREE.Group(), gO = new THREE.Group(); // 국내, 해외 장면
  scene.add(gD, gO);
  const stationRoot = new THREE.Group();
  gD.add(stationRoot);
  const domRises = [], airRises = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1), riseDummy = new THREE.Object3D();
  const topOf = (b) => b.pos[1] + b.size[1] / 2;
  // 함께 솟는 묶음: 가장 높은 부품의 꼭대기가 땅속에 들어갈 만큼 내려가서 출발
  // 판 위에 놓인 것의 출발 시각: 발밑의 어떤 타일보다 살짝 늦게 출발해서, 항상 판과 함께 올라오고 판보다 먼저 공중에 보이지 않음
  const rideDelay = (x, z, w, d, cx) => {
    const P = RS.ridePad, zMin = z - d / 2 - P, xFar = Math.max(Math.abs(x - w / 2 - cx), Math.abs(x + w / 2 - cx)) + P;
    return RS.start + RS.follow + Math.max(0, RS.z0 - zMin) * RS.waveZ + xFar * RS.waveX;
  };
  const onDeck = (b, parentId) => !RS.columns.test(b.id) && !(parentId && RS.columns.test(parentId));
  const phaseOf = (id) => { const hit = RS.phases.find(([re]) => re.test(id)); return hit ? hit[1] : 0; };
  const riseDelay = (id, x, z, cx) => RS.start + phaseOf(id) + Math.max(0, RS.z0 - z) * RS.waveZ + Math.abs(x - cx) * RS.waveX;

  // 지면 아래로 몸통을 늘린 사양 (꼭대기 높이는 그대로)
  const withBody = (b) => (RS.body.test(b.id) ? { ...b, size: [b.size[0], b.size[1] + RS.depth, b.size[2]], pos: [b.pos[0], b.pos[1] - RS.depth / 2, b.pos[2]] } : b);
  function solid(b) {
    const tower = { tower: [0.62, 0.74, 20], 'tower-cab': [1.8, 1.45, 12], 'tower-top': [2.05, 2.0, 20] }[b.id];
    const geo = /pillar/.test(b.id) ? new THREE.CylinderGeometry(b.size[0] / 2, (b.size[0] / 2) * 1.08, b.size[1], 12)
      : tower ? new THREE.CylinderGeometry(tower[0], tower[1], b.size[1], tower[2])
      : MD.roundedBox(...b.size, b.id === 'jet-bridge' ? 0.4 : MD.radiusFor(b.size));
    const m = hazeDown(MD.skinFor(b.color, b.size, {}));
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...b.pos);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = b.id;
    return { mesh, m };
  }
  // 넓은 판: 타일 여러 장을 한 번에 그림
  function tiledSlab(b, parent, rises, cx, px, ride) {
    const [nx, nz] = RS.tiles[b.id], tw = b.size[0] / nx, td = b.size[2] / nz;
    const m = hazeDown(MD.skinFor(b.color, [tw, b.size[1], td], {}));
    const body = withBody(b);
    const mesh = new THREE.InstancedMesh(unitBox, m, nx * nz);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = b.id;
    const items = [];
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const x = b.pos[0] - b.size[0] / 2 + tw * (i + 0.5), z = b.pos[2] - b.size[2] / 2 + td * (k + 0.5);
      items.push({ x, y: body.pos[1], z, w: tw, h: body.size[1], d: td, rise: RS.fall, delay: ride ? rideDelay(x, z, tw, td, cx) : riseDelay(b.id, px === undefined ? x : px + (x - b.pos[0]), z, cx) }); // 묶음은 부모와 같은 타이밍
    }
    parent.add(mesh);
    rises.push({ mesh, items });
    return { mesh, m };
  }
  function raise(b, list, parent, rises, cx) {
    const parentId = /^pillar/.test(b.id) ? 'canopy' : RS.parent[b.id];
    const pb = parentId && list.find((x) => x.id === parentId); // 붙어 있는 부품은 부모와 같은 시각에 출발
    const ride = onDeck(b, parentId);
    if (RS.tiles[b.id]) return tiledSlab(b, parent, rises, cx, pb ? pb.pos[0] : undefined, ride);
    const eb = withBody(b), made = solid(eb), base = pb || b;
    parent.add(made.mesh);
    const delay = ride ? rideDelay(base.pos[0], base.pos[2], base.size[0], base.size[2], cx) : riseDelay(base.id, base.pos[0], base.pos[2], cx);
    rises.push({ obj: made.mesh, y: eb.pos[1], rise: RS.fall, delay });
    return made;
  }
  // 시간 t에 대해 구조물 높이를 계산
  function applyRise(w, t) {
    if (t > w.riseEnd && w.riseLast > w.riseEnd) return;
    for (const r of w.rises) {
      if (r.obj) {
        const p = prog(t, r.delay, RS.dur);
        r.obj.visible = p > 0;
        r.obj.position.y = r.y - (1 - easeRise(p)) * r.rise;
      } else {
        r.items.forEach((it, i) => {
          const p = prog(t, it.delay, RS.dur);
          riseDummy.position.set(it.x, it.y - (1 - easeRise(p)) * it.rise, it.z);
          if (p > 0) riseDummy.scale.set(it.w, it.h, it.d); else riseDummy.scale.setScalar(0); // 솟기 전에는 아예 없음
          riseDummy.rotation.y = it.ry || 0;
          riseDummy.updateMatrix();
          r.mesh.setMatrixAt(i, riseDummy.matrix);
        });
        riseDummy.rotation.y = 0;
        r.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    w.riseLast = t;
  }

  for (const b of S.boxes) raise(b, S.boxes, stationRoot, domRises, -3);

  // ---------- 전광판 ----------
  // 포스터 여섯 장을 모은 한 장을 칸마다 스크롤해서 보여 주는 화면. 움직여도 텍스처를 다시 올리지 않아 가벼움
  function adScreen(ads, w, h) {
    const P = window.EODI_POSTERS, canvas = P.make();
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; // 칸이 바뀌는 경계에 선이 생기지 않게
    P.ready().then(() => { P.draw(canvas, ads); tex.needsUpdate = true; dirty = true; });
    const m = new THREE.ShaderMaterial({
      uniforms: { tAds: { value: tex }, uS: { value: new THREE.Vector3(0, -2, 4) }, uOn: { value: 0 }, uGain: { value: S.film.screenGain } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform sampler2D tAds; uniform vec3 uS; uniform float uGain, uOn; varying vec2 vUv;
        const float C = 3., R = 2., N = 6.;
        void main() {
          float cx = vUv.x * 3., c = floor(min(cx, 2.999)), lx = cx - c;
          float s = c < .5 ? uS.x : c < 1.5 ? uS.y : uS.z;
          float y = (1. - vUv.y) + s, idx = mod(c > .5 && c < 1.5 ? -floor(y) : floor(y), N), ly = fract(y); // 가운데 칸은 반대 방향으로 흐르되 순서는 같게
          float GAP = .012, lu = (lx - GAP) / (1. - 2. * GAP);
          float inside = step(0., lu) * step(lu, 1.) * smoothstep(0., .004, ly) * smoothstep(0., .004, 1. - ly);
          vec2 cell = vec2(mod(idx, C), floor(idx / C));
          vec2 p = (cell + clamp(vec2(lu, ly), .002, .998)) / vec2(C, R);
          vec3 col = pow(texture2D(tAds, vec2(p.x, 1. - p.y)).rgb, vec3(2.2)) * uGain * inside;
          float sheen = smoothstep(.62, .95, vUv.x * .55 + vUv.y * .75) * .045; // 유리 덮개의 옅은 반사
          gl_FragColor = vec4(mix(vec3(.012, .016, .024), col, uOn) + sheen, 1.); // 꺼져 있으면 어두운 유리
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    return { mesh, m };
  }
  function buildBoard(B, pov, parent) {
    const g = new THREE.Group();
    g.position.set(...B.pos);
    g.rotation.y = Math.atan2(pov.eye[0] - B.pos[0], pov.eye[2] - B.pos[2]); // 도착 시점의 눈을 바라보도록 돌림
    const leg = B.hang ? B.hang - B.pos[1] - B.h / 2 : B.pos[1] - B.h / 2 - 1; // 천장에 매달거나 바닥에 세움
    const legY = B.hang ? B.h / 2 + leg / 2 : -B.h / 2 - leg / 2;
    const parts = [
      [[B.w, B.h, 0.2], [0, 0, 0], 'dark', 0.07],                                 // 얇은 알루미늄 몸체
      [[B.w * 0.56, B.h * 0.56, 0.12], [0, 0, -0.14], 'dark', 0.05],              // 뒤쪽 전원부
      [[0.14, leg, 0.14], [-B.w * 0.36, legY, -0.03], 'metal', 0.05],
      [[0.14, leg, 0.14], [B.w * 0.36, legY, -0.03], 'metal', 0.05],
    ];
    if (!B.hang) for (const s of [-1, 1]) parts.push([[0.5, 0.04, 0.5], [s * B.w * 0.36, legY - leg / 2 + 0.02, -0.03], 'metal', 0.015]); // 바닥 고정판
    for (const [size, at, key, r] of parts) {
      const mesh = new THREE.Mesh(MD.roundedBox(...size, r), modelMat(key));
      mesh.position.set(...at);
      mesh.castShadow = true;
      g.add(mesh);
    }
    const { mesh: screen, m } = adScreen(B.ads, B.w - 0.1, B.h - 0.1);
    screen.position.z = 0.102;
    g.add(screen);
    g.userData.screen = m;
    parent.add(g);
    return g;
  }
  const boardFace = buildBoard(S.board, S.pov, stationRoot);
  domRises.push({ obj: boardFace, y: S.board.pos[1], rise: RS.fall, delay: rideDelay(S.board.pos[0], S.board.pos[2], S.board.w, S.board.w, -3) }); // 승강장과 함께 올라옴

  // ---------- 작은 상자 모음 (정거장, 공항 공용) ----------
  // 작은 상자를 재질별로 한 번에 그림. 각 묶음은 놓인 판이나 건물과 같은 시각에 함께 올라옴
  function detailMats() {
    const D = S.stationDetail, mat = (o) => hazeDown(new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o, color: lin(o.color) }));
    const OM = D.objects;
    // 좌석 천: 촘촘한 사선 짜임과 작은 점무늬가 있는 모켓 (색 셋: 바탕, 밝은 실, 어두운 실)
    const fabric = (name, base, hi, lo) => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.fillStyle = base; x.fillRect(0, 0, 128, 128);
      for (let i = -128; i < 128; i += 4) { x.strokeStyle = lo; x.lineWidth = 1.2; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); }
      for (let yy = 8; yy < 128; yy += 16) for (let xx = (yy / 16) % 2 ? 8 : 0; xx < 128; xx += 16) { x.fillStyle = hi; x.fillRect(xx, yy, 3, 3); }
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); t.anisotropy = 8;
      const m = mat({ name, color: '#FFFFFF', roughness: 0.96 }); m.map = t; m.needsUpdate = true; return m;
    };
    return {
      white: mat({ color: C.canopy, roughness: 0.55 }), wall: mat({ name: 'side', color: C.building, roughness: 0.8 }),
      // 오브제 재질: 원목, 주철, 짙은 금속, 스테인리스
      fabric: fabric('fabric', '#1C2B57', '#3F5A9A', '#14204A'), fabricAir: fabric('fabric', '#3A475E', '#56647C', '#2C3648'), // KTX 남색 모켓, 비행기 회청색 천
      wood: mat({ name: 'wood', color: OM.wood, roughness: 0.55 }), iron: mat({ name: 'metal-iron', color: OM.iron, roughness: 0.42, metalness: 0.6 }),
      graphite: mat({ name: 'metal-graphite', color: OM.graphite, roughness: 0.3, metalness: 0.85 }), brushed: mat({ name: 'metal-brushed', color: OM.brushed, roughness: 0.26, metalness: 1 }),
      steel: mat({ color: D.steel, roughness: 0.4, metalness: 0.5 }), dark: mat({ color: C.bogie, roughness: 0.5, metalness: 0.2 }),
      glass: mat({ color: C.glass, roughness: 0.06, metalness: 0.3, envMapIntensity: 1.5 }),
      seat: mat({ color: D.seat, roughness: 0.45 }), navy: mat({ color: D.navy, roughness: 0.55 }), carpet: mat({ color: D.carpet, roughness: 0.95 }),
      joint: mat({ color: D.joint, roughness: 0.9 }), mark: mat({ color: C.mark, roughness: 0.8 }), lime: mat({ color: C.safetyLine, roughness: 0.7 }),
      light: mat({ color: C.headlight, roughness: 0.4, emissive: lin(C.headlight), emissiveIntensity: 0.6 }),
    };
  }
  function kit(cx, mats) {
    const bins = new Map();
    let delay = 0;
    return {
      box: (m, x, y, z, w, h, d, shadow = true) => { const k = m + (shadow ? '+' : ''); if (!bins.has(k)) bins.set(k, []); bins.get(k).push({ x, y, z, w, h, d, rise: RS.fall, delay }); },
      // 깎은 모델 (objects.js): 조각마다 한 묶음. y는 바닥 높이, ry는 세로축 회전
      model: (name, x, y, z, ry = 0) => OBJ[name].forEach((p, i) => { const k = '@' + name + '#' + i; if (!bins.has(k)) bins.set(k, []); bins.get(k).push({ x, y, z, w: 1, h: 1, d: 1, ry, rise: RS.fall, delay }); }),
      on: (x, z, w, d) => { delay = rideDelay(x, z, w, d, cx); },
      at: (t) => { delay = t; },
      flush(parent, rises) { // rises가 없으면 처음 자리에 고정 (실내용)
        const made = [];
        for (const [k, items] of bins) {
          const part = k[0] === '@' ? OBJ[k.slice(1).split('#')[0]][+k.split('#')[1]] : null;
          const shadow = !!part || k.endsWith('+'), inst = new THREE.InstancedMesh(part ? part.geo : unitBox, mats[part ? part.mat : k.replace('+', '')], items.length);
          inst.castShadow = shadow; inst.receiveShadow = true; inst.frustumCulled = false; inst.name = 'detail-' + k;
          parent.add(inst); made.push(inst);
          if (rises) rises.push({ mesh: inst, items });
          else { items.forEach((it, i) => { riseDummy.position.set(it.x, it.y, it.z); riseDummy.rotation.y = it.ry || 0; riseDummy.scale.set(it.w, it.h, it.d); riseDummy.updateMatrix(); inst.setMatrixAt(i, riseDummy.matrix); }); riseDummy.rotation.y = 0; }
        }
        return made;
      },
    };
  }
  const DM = detailMats();

  // ---------- 정거장 디테일 ----------
  function stationDetails(D) {
    const CX = -3, RX = (id, b) => riseDelay(id, b.pos[0], b.pos[2], CX), find = (id) => S.boxes.find((b) => b.id === id);
    const K = kit(CX, DM), { box, on, at } = K;
    const ring = (m, x0, x1, z0, z1, top, h, t) => { // 지붕 둘레 턱
      const y = top + h / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      box(m, cx, y, z0 + t / 2, x1 - x0, h, t); box(m, cx, y, z1 - t / 2, x1 - x0, h, t);
      box(m, x0 + t / 2, y, cz, t, h, z1 - z0); box(m, x1 - t / 2, y, cz, t, h, z1 - z0);
    };

    // 승강장 바닥: 줄눈과 가장자리 마감
    for (const [x0, x1, edge] of [[2.35, 9.3, 1.99], [-9.3, -2.35, -1.99]]) {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      for (let z = -16; z <= 16; z += D.pavingStep) { on(cx, z, w, 0.04); box('joint', cx, 1.003, z, w, 0.006, 0.04, false); }
      on(edge, 0, 0.18, 34); box('white', edge, 1.004, 0, 0.18, 0.008, 34, false);
    }

    // 앞 승강장: 난간
    on(D.railX, 0, 0.05, 34);
    for (let z = -16.8; z <= 16.81; z += 2.4) box('steel', D.railX, 1.52, z, 0.05, 1.04, 0.05);
    box('steel', D.railX, 2.04, 0, 0.06, 0.05, 33.6); box('steel', D.railX, 1.6, 0, 0.025, 0.025, 33.6, false);
    // 조명
    for (const z of D.lamps.z) {
      const x = D.lamps.x; on(x - 0.45, z, 1, 0.2);
      K.model('lamp', x, 1, z);
    }
    // 의자와 휴지통
    const bench = (x, z) => K.model('bench', x, 1, z);
    for (const z of D.benches.z) { const x = D.benches.x; on(x, z + 0.3, 0.5, 2.6); bench(x, z); K.model('bin', x, 1, z + 1.4); }
    // 대기 쉼터
    { const { x, z } = D.shelter; on(x, z, 2.2, 4.4); bench(x, z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('steel', x + sx, 2.22, z + sz * 2.1, 0.08, 2.44, 0.08);
      box('glass', x + 1.02, 2.15, z, 0.03, 2.2, 4.2); box('glass', x, 2.15, z - 2.12, 2, 2.2, 0.03);
      box('white', x, 3.49, z, 2.3, 0.1, 4.5); box('glass', x, 3.55, z, 1.1, 0.02, 3.5, false); }
    // 승강기
    { const { x, z } = D.lift; on(x, z, 1.7, 1.7);
      box('glass', x, 2.4, z, 1.5, 2.8, 1.5); box('white', x, 3.91, z, 1.72, 0.22, 1.72);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('white', x + sx * 0.76, 2.4, z + sz * 0.76, 0.12, 2.8, 0.12);
      box('steel', x, 2.08, z + 0.77, 0.8, 2.1, 0.03, false); }
    // 자동판매기
    { const { x, z } = D.vending; on(x, z, 1, 0.7);
      box('white', x, 1.95, z, 1, 1.9, 0.7); box('glass', x, 2.25, z + 0.36, 0.76, 1.05, 0.02, false); box('dark', x, 1.4, z + 0.36, 0.5, 0.14, 0.02, false); }

    // 캐노피: 골조, 천창, 물받이, 천장 조명 (기둥과 같은 시각)
    { const c = find('canopy'), top = c.pos[1] + c.size[1] / 2, x = c.pos[0], n = RS.tiles.canopy[1], td = c.size[2] / n, Z0 = c.pos[2] - c.size[2] / 2;
      const clip = (a, b, half) => [Math.max(a, -half), Math.min(b, half)]; // 천창 구간 안으로 자름
      for (let i = 0; i < n; i++) { // 캐노피 타일 한 장마다 나눠서, 그 타일과 정확히 같은 시각에 올라옴
        const a = Z0 + td * i, b = a + td, zc = (a + b) / 2; on(x, zc, c.size[0], td);
        for (const [m, y, w, h, half] of [['white', top + 0.025, 1.56, 0.05, 11.6], ['glass', top + 0.06, 1.3, 0.03, 11.5]]) { const [p, q] = clip(a, b, half); if (q > p) box(m, x, y, (p + q) / 2, w, h, q - p, false); }
        box('steel', x + c.size[0] / 2 + 0.05, top - 0.14, zc, 0.1, 0.2, td, false);
        for (let z = Z0 + D.canopyRib / 2; z < Z0 + c.size[2]; z += D.canopyRib) if (z >= a && z < b) box('white', x, top + 0.06, z, c.size[0] - 0.1, 0.07, 0.1, false);
        for (let z = -7.5; z <= 12.5; z += 5) if (z >= a && z < b) box('light', -3.6, c.pos[1] - c.size[1] / 2 - 0.02, z, 0.16, 0.04, 1.6, false);
        for (let z = a + 0.25; z < b; z += 0.5) for (const sx of [-1, 1]) box('joint', x + sx * 1.9, top + 0.012, z, 2.3, 0.012, 0.03, false); // 금속 지붕 이음 골 (천창 양옆)
        box('steel', x - c.size[0] / 2 - 0.03, top - 0.1, zc, 0.06, 0.26, td, false);                   // 반대쪽 처마 테
      } }

    // 역 건물: 깊은 세로 핀 유리벽, 가는 가로 살, 아래 벽 판 줄눈, 금속 갓돌, 옥상 실외기 (건물과 같은 시각)
    { const b = find('building'), g = find('building-glass'), top = b.pos[1] + b.size[1] / 2; at(RX('building', b));
      const [x0, x1, z0, z1] = [b.pos[0] - b.size[0] / 2, b.pos[0] + b.size[0] / 2, b.pos[2] - b.size[2] / 2, b.pos[2] + b.size[2] / 2];
      ring('wall', x0, x1, z0, z1, top, 0.3, 0.16);
      ring('steel', x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02, top + 0.3, 0.04, 0.2);               // 금속 갓돌
      for (const z of [-1.3, 1.3]) K.model('hvac', b.pos[0], top, z);
      box('steel', x0 + 0.45, top + 0.25, z1 - 0.7, 0.12, 0.5, 0.12);
      const gz0 = g.pos[2] - g.size[2] / 2, gx = g.pos[0] + 0.05, gy0 = g.pos[1] - g.size[1] / 2, gy1 = g.pos[1] + g.size[1] / 2;
      for (let k = 0; k <= 10; k++) box('white', gx + 0.1, g.pos[1], gz0 + (k * g.size[2]) / 10, 0.24, g.size[1] + 0.2, 0.05); // 깊은 세로 핀
      for (const y of [gy0 + 0.03, g.pos[1], gy1 - 0.03]) box('steel', gx - 0.02, y, g.pos[2], 0.04, 0.03, g.size[2], false);  // 가는 가로 살
      box('graphite', x1 + 0.02, gy0 - 0.12, g.pos[2], 0.05, 0.2, g.size[2] + 0.3, false);           // 유리 아래 어두운 띠
      for (let y = 1.6; y < gy0 - 0.3; y += 0.62) box('joint', x1 + 0.006, y, b.pos[2], 0.012, 0.02, b.size[2] - 0.1, false); // 아래 벽 가로 줄눈
      for (let z = z0 + 1.3; z < z1 - 0.1; z += 1.3) box('joint', x1 + 0.006, (1 + gy0 - 0.25) / 2, z, 0.012, gy0 - 1.25, 0.02, false); // 세로 줄눈
      // 옆면 창: 깊은 핀
      const zf = z1 + 0.02; box('glass', b.pos[0], 5.3, zf, 2.7, 2.6, 0.04, false);
      for (let k = 0; k <= 3; k++) box('white', b.pos[0] - 1.35 + k * 0.9, 5.3, zf + 0.1, 0.05, 2.7, 0.2, false);
      box('steel', b.pos[0], 5.3, zf + 0.02, 2.7, 0.03, 0.04, false); }
    // 캐노피 기둥: 네 갈래로 뻗은 금속 기둥머리와 받침판 (기둥과 같은 시각)
    for (const id of ['pillar-1', 'pillar-2', 'pillar-3', 'pillar-4', 'pillar-5']) { const p = find(id); if (!p) continue; at(RX(id, p)); K.model('treeCap', p.pos[0], 1, p.pos[2]); }
    // 앞 승강장 바깥 옆면: 바닥판 두께를 드러내는 어두운 줄
    on(9.3, 0, 0.1, 34); box('graphite', 9.31, 0.84, 0, 0.02, 0.05, 34, false);
    // 별관: 옥상 천창, 정면 유리 (건물과 같은 시각)
    { const b = find('annex'), top = b.pos[1] + b.size[1] / 2; at(RX('annex', b));
      const [x0, x1, z0, z1] = [b.pos[0] - b.size[0] / 2, b.pos[0] + b.size[0] / 2, b.pos[2] - b.size[2] / 2, b.pos[2] + b.size[2] / 2];
      ring('wall', x0, x1, z0, z1, top, 0.22, 0.16);
      ring('steel', x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02, top + 0.22, 0.04, 0.2);             // 금속 갓돌
      for (let z = z0 + 1.4; z < z1 - 0.8; z += 2.1) { box('white', b.pos[0], top + 0.05, z, 1.9, 0.1, 1.5); box('glass', b.pos[0], top + 0.12, z, 1.6, 0.05, 1.2, false); }
      const zf = z1 + 0.02; box('glass', b.pos[0], 2.15, zf, 3, 1.9, 0.04, false);
      for (let k = 0; k <= 4; k++) box('white', b.pos[0] - 1.5 + k * 0.75, 2.15, zf + 0.1, 0.05, 1.95, 0.2, false); // 깊은 세로 핀
      box('white', b.pos[0], 3.12, zf + 0.06, 3.4, 0.08, 0.5);
      box('glass', x1 + 0.02, 2.4, b.pos[2], 0.04, 1, 5.6, false);
      for (let k = 0; k <= 7; k++) box('white', x1 + 0.1, 2.4, b.pos[2] - 2.8 + k * 0.8, 0.2, 1.05, 0.05, false); // 깊은 세로 핀
      box('steel', x1 + 0.03, 2.4, b.pos[2], 0.03, 0.03, 5.6, false); }

    K.flush(detailRoot, domRises);
  }
  const detailRoot = new THREE.Group(); // 클릭 판정에는 넣지 않음 (아래 판이 대신 받음)
  gD.add(detailRoot);
  stationDetails(S.stationDetail);
  // 역 이름판: 역 건물 유리벽 위 남색 판에 흰 글자 (건물과 같은 시각에 솟음)
  {
    const b = S.boxes.find((o) => o.id === 'building'), c = document.createElement('canvas'); c.width = 2000; c.height = 200;
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    const draw = () => {
      const x = c.getContext('2d'), F = "'SUIT', system-ui, sans-serif";
      x.fillStyle = '#1B2856'; x.fillRect(0, 0, 2000, 200);
      x.fillStyle = '#1A81BD'; x.fillRect(0, 0, 18, 200);                                        // 왼쪽 하늘색 띠
      x.textBaseline = 'middle'; x.textAlign = 'left';
      x.fillStyle = '#FFFFFF'; x.font = `800 118px ${F}`; x.fillText('서울역', 90, 104);
      const w = x.measureText('서울역').width;
      x.fillStyle = '#A9C0E4'; x.font = `500 66px ${F}`; x.fillText('Seoul Station', 90 + w + 56, 112);
      x.textAlign = 'right'; x.fillStyle = '#FFFFFF'; x.font = `700 60px ${F}`; x.fillText('KTX', 1910, 108);
      tex.needsUpdate = true; dirty = true;
    };
    requestAnimationFrame(draw); if (document.fonts) document.fonts.load("800 100px 'SUIT'").then(draw).catch(() => {});
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.42), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15 }));
    const y = 6.78; sign.position.set(b.pos[0] + b.size[0] / 2 + 0.035, y, b.pos[2]); sign.rotation.y = Math.PI / 2; // 바깥(+x)을 바라봄
    detailRoot.add(sign);
    domRises.push({ obj: sign, y, rise: RS.fall, delay: riseDelay('building', b.pos[0], b.pos[2], -3) });
  }

  // ---------- track ----------
  const trackRoot = new THREE.Group();
  gD.add(trackRoot);
  // 활주로 표시: 착륙 방향(+z)을 기준으로 시단, 활주로 번호, 접지 구역, 조준점, 중심선
  function runwayItems(R) {
    const marks = [], lights = [], y = R.y, h = R.h;
    const add = (x, z, w, d, rot = 0) => marks.push({ x, y, z, w, d, h, rot });
    const th = R.threshold;
    for (let z = R.centerFrom; z > th + R.centerGap; z -= R.centerStep) add(0, z, R.centerW, R.centerD);
    for (const sign of [1, -1]) {
      for (let j = 0; j < R.keys; j++) add(sign * (0.62 + j * R.keyStep), th, R.keyW, R.keyD); // 시단 줄무늬
      for (const [dz, n] of R.touchdown) for (let j = 0; j < n; j++) add(sign * (1.0 + j * 0.62), th + dz, 0.34, 2.6); // 접지 구역
      add(sign * 1.75, th + R.aim, 1.0, 5); // 조준점
      for (let z = R.edgeFrom; z >= R.edgeTo; z -= R.edgeStep) lights.push({ x: sign * R.edgeX, y: 0.34, z, w: 0.2, d: 0.2, h: 0.24, rot: 0 }); // 활주로 등
    }
    for (let k = 1; k <= R.chevrons; k++) { // 시단 앞 화살표
      const z = th - R.keyD / 2 - k * R.chevronStep;
      for (const sign of [1, -1]) add(sign * 1.05, z, 0.34, 3, -sign * Math.PI / 4);
    }
    // 활주로 번호 (착륙하는 쪽에서 똑바로 읽히도록)
    const seg = { a: [0, 1, 1, 0], b: [1, 0.5, 0, 1], c: [1, 0, 0, 1], d: [0, 0, 1, 0], e: [0, 0, 0, 1], f: [0, 0.5, 0, 1], g: [0, 0.5, 1, 0] };
    const DIG = { 2: 'abged', 7: 'abc' };
    [...R.number].forEach((ch, n) => {
      const cx = (n === 0 ? 1 : -1) * R.numGap, z0 = th + R.numZ, W = R.numW, H = R.numH, t = 0.3;
      for (const k of DIG[ch]) {
        const [u, v, horiz] = seg[k];
        const uu = (u - 0.5) * W, vv = v * H;
        if (horiz) add(cx, z0 + vv, W + t, t);
        else add(cx - uu, z0 + vv + H / 4, t, H / 2 + t);
      }
    });
    return { marks, lights };
  }

  function buildTrack(T, parent) {
    const half = T.length / 2, SEG = 4, groups = [], round = MD.roundedBox(1, 1, 1, 0.18);
    const addGroup = (items, m, unit, lead, shadow = false, dur = M.trackRise) => {
      for (const it of items) { it.i = Math.max(0, (T.sleeper.from - it.z) / T.sleeper.spacing); it.rise = it.rise || it.y + it.h / 2; }
      const mesh = new THREE.InstancedMesh(unit, m, items.length); // 한 번에 그림
      mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = shadow;
      parent.add(mesh);
      groups.push({ mesh, items, lead, dur });
    };
    const strip = (x, y, w, h) => { const a = []; for (let z = half - SEG / 2; z > -half; z -= SEG) a.push({ x, y, z, w, h, d: SEG, rot: 0 }); return a; };
    // 도상(또는 활주로 바닥)이 앞서 솟고, 침목과 표시, 레일이 물결을 따라 올라옴
    addGroup(strip(T.bed.x, T.bed.y, T.bed.w, T.bed.h), MD.skinFor(T.bed.color || 'trackBed', [T.bed.w, T.bed.h, SEG]), unitBox, 0);
    if (T.runway) {
      const r = runwayItems(T.runway);
      addGroup(r.marks, MD.skinFor(T.runway.color, [2, 1, 2]), round, RS.trackLead);
      addGroup(r.lights, mat(T.runway.lightColor), round, RS.trackLead);
    } else {
      const items = [];
      for (let z = T.sleeper.from; z >= T.sleeper.to; z -= T.sleeper.spacing) items.push({ x: 0, y: T.sleeper.y, z, w: T.sleeper.w, h: T.sleeper.h, d: T.sleeper.d, rot: 0 });
      addGroup(items, MD.skinFor('sleeper', [2.4, 0.4, 0.4]), round, RS.trackLead);
    }
    const railMat = T.rail.color === 'mark' ? MD.skinFor('mark', [0.2, 0.1, SEG]) : modelMat('metal');
    addGroup(T.rail.xs.flatMap((x) => strip(x, T.rail.y, T.rail.w, T.rail.h)), railMat, unitBox, RS.trackLead * 2);
    const maxI = (T.sleeper.from - T.sleeper.to) / T.sleeper.spacing;
    return { T, half, groups, last: -1, end: M.trackStart + RS.trackLead * 2 + maxI * M.sleeperStagger + M.trackRise };
  }
  const sleeperDummy = new THREE.Object3D();
  const domTrack = buildTrack(S.track, trackRoot);

  // ---------- train ----------
  const TR = S.train;
  const train = new THREE.Group();
  gD.add(train);

  train.add(MD.merge(MD.ktx())); // models/models.js의 KTX (같은 재질끼리 합쳐서 가볍게)
  // 열차와 비행기: 도장은 펄 코팅, 바퀴와 금속은 코팅 광택, 불빛은 그대로. 마우스를 올리면 빛줄기가 훑고 지나감
  const hotTrain = { value: 0 }, hotPlane = { value: 0 };
  const dreamMover = (root, hot) => root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.material.name || '';
    if (/^(light|red|green|strobe)$/.test(n)) return;
    o.material = DR.patch(o.material, /^(rubber|dark|metal|chrome|titanium)$/.test(n) ? 'mech' : 'vehicle', hot);
  });
  dreamMover(train, hotTrain);
  train.visible = false;

  // ---------- 공항 (해외) ----------
  const AP = S.airport;
  const airportRoot = new THREE.Group();
  gO.add(airportRoot);
  const shellMats = [], shellMeshes = [], airHits = [];
  for (const b of AP.boxes) {
    if (/^cart-|^jet-bridge$|^bridge-leg$/.test(b.id)) continue; // 수하물 카트와 탑승교는 objects.js 모델로 따로 놓음
    const { mesh, m } = raise(b, AP.boxes, airportRoot, airRises, -4);
    if (b.shell) { shellMats.push(m); shellMeshes.push(mesh); }
    if (b.hit) airHits.push(mesh);
  }
  { // 곡선 지붕
    const R = AP.roof;
    const shape = new THREE.Shape();
    shape.moveTo(R.x[0], 0); shape.quadraticCurveTo((R.x[0] + R.x[1]) / 2, R.rise, R.x[1], 0); shape.lineTo(R.x[0], 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: R.z[1] - R.z[0] - 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2, curveSegments: 20 });
    geo.translate(0, 0, 0.15);
    const m = MD.skinFor('canopy', [7, 2, 19]);
    const roof = new THREE.Mesh(geo, m);
    roof.position.set(0, R.y, R.z[0]);
    roof.castShadow = true; roof.receiveShadow = true;
    airportRoot.add(roof);
    airRises.push({ obj: roof, y: R.y, rise: RS.fall, delay: rideDelay(AP.boxes.find((b) => b.id === 'terminal').pos[0], AP.boxes.find((b) => b.id === 'terminal').pos[2], R.x[1] - R.x[0], R.z[1] - R.z[0], -4) }); // 터미널과 같은 시각
    shellMats.push(m); shellMeshes.push(roof); airHits.push(roof);
  }
  const airTrack = buildTrack(AP.track, gO);

  // 비행기: 코끝이 z 0, 뒤가 -z
  const PL = AP.plane;
  const plane = new THREE.Group();
  gO.add(plane);
  plane.add(MD.merge(MD.plane())); // models/models.js의 비행기
  dreamMover(plane, hotPlane);
  plane.visible = false;
  airHits.push(plane);

  // 터미널 내부: 안쪽 면만 보이는 상자라 밖에서 보면 단면처럼 열려 보임
  const interior = new THREE.Group();
  gO.add(interior);
  {
    const R = AP.room, back = { side: THREE.BackSide };
    const wall = mat('building', back);
    const room = new THREE.Mesh(new THREE.BoxGeometry(...R.size), [new THREE.MeshBasicMaterial({ visible: false }), wall, mat('canopy', back), mat('platformTop', back), wall, wall]);
    room.position.set(...R.pos);
    room.receiveShadow = true;
    interior.add(room);
    const add = (size, at, key) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(key)); m.position.set(...at); m.castShadow = true; m.receiveShadow = true; interior.add(m); };
    for (const b of AP.interior) add(b.size, b.pos, b.color);
    const G = AP.mullion;
    for (let z = G.z[0]; z <= G.z[1]; z += G.step) add([0.12, G.y[1] - G.y[0], 0.05], [G.x - 0.02, (G.y[0] + G.y[1]) / 2, z], 'pillar'); // 가는 세로 살 (안쪽으로 깊게)
    for (const y of G.rails) add([0.07, 0.04, G.z[1] - G.z[0]], [G.x - 0.01, y, (G.z[0] + G.z[1]) / 2], 'pillar');
    add([0.3, 0.08, G.z[1] - G.z[0]], [G.x - 0.12, G.y[0] + 0.04, (G.z[0] + G.z[1]) / 2], 'bogie'); // 창 아래 어두운 턱
  }
  interior.visible = false;
  const airBoard = buildBoard(AP.board, AP.pov, interior);

  // ---------- 공항 디테일 ----------
  function airportDetails() {
    const CX = -4, find = (id) => AP.boxes.find((b) => b.id === id), T = find('terminal'), G = find('terminal-glass'), R = AP.roof;
    const shellSet = detailMats(); // 터미널 겉면 디테일은 시점 이동 때 겉면과 함께 사라짐
    const O = kit(CX, DM), Sh = kit(CX, shellSet), I = kit(CX, DM);
    const { box, on } = O, sb = Sh.box, ib = I.box;
    const roofDelay = rideDelay(T.pos[0], T.pos[2], R.x[1] - R.x[0], R.z[1] - R.z[0], CX);

    // ----- 곡선 지붕: 골조와 천창은 곡면을 그대로 따름 -----
    const ry = (x) => { const t = (x - R.x[0]) / (R.x[1] - R.x[0]); return 2 * t * (1 - t) * R.rise; };
    const band = (x0, x1, under, over, depth) => {
      const pts = [], N = 28;
      for (let i = 0; i <= N; i++) { const x = x0 + ((x1 - x0) * i) / N; pts.push(new THREE.Vector2(x, ry(x) + over)); }
      for (let i = N; i >= 0; i--) { const x = x0 + ((x1 - x0) * i) / N; pts.push(new THREE.Vector2(x, ry(x) + under)); }
      return new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
    };
    const curved = (geo, m, zs) => {
      const inst = new THREE.InstancedMesh(geo, m, zs.length);
      inst.castShadow = false; inst.receiveShadow = true; inst.frustumCulled = false; inst.name = 'detail-roof';
      airportRoot.add(inst); shellMeshes.push(inst);
      airRises.push({ mesh: inst, items: zs.map((z) => ({ x: 0, y: R.y, z, w: 1, h: 1, d: 1, rise: RS.fall, delay: roofDelay })) });
    };
    const zMid = (R.z[0] + R.z[1]) / 2, ribs = [];
    for (let z = R.z[0] + 0.8; z < R.z[1] - 0.6; z += 1.6) ribs.push(z);
    curved(band(-14.3, -11.6, 0.06, 0.19, 15.8), shellSet.glass, [zMid]);
    const seams = []; for (let z = R.z[0] + 0.25; z < R.z[1] - 0.2; z += 0.42) seams.push(z);
    curved(band(R.x[0] + 0.04, R.x[1] - 0.04, 0.1, 0.165, 0.03), shellSet.joint, seams);          // 금속 지붕 이음 골
    const skyRibs = []; for (let z = zMid - 7.6; z <= zMid + 7.61; z += 0.95) skyRibs.push(z);
    curved(band(-14.35, -11.55, 0.12, 0.24, 0.05), shellSet.white, skyRibs);                        // 천창 살
    for (const ex of [R.x[0] - 0.02, R.x[1] + 0.02]) sb('white', ex, R.y + 0.08, zMid, 0.1, 0.26, R.z[1] - R.z[0] + 0.1); // 처마 띠

    // ----- 터미널 겉면: 깊은 세로 핀의 커튼월, 가는 가로 살, 아래 어두운 띠, 위 차양 루버 -----
    Sh.on(T.pos[0], T.pos[2], T.size[0], T.size[2]);
    const fx = G.pos[0] + 0.05, g0 = G.pos[1] - G.size[1] / 2, g1 = G.pos[1] + G.size[1] / 2, gz0 = G.pos[2] - G.size[2] / 2, gz1 = G.pos[2] + G.size[2] / 2;
    for (let z = gz0; z <= gz1 + 0.01; z += G.size[2] / 12) sb('white', fx + 0.12, G.pos[1] + 0.05, z, 0.3, G.size[1] + 0.3, 0.05);  // 세로 핀 (그림자가 깊게 짐)
    for (const y of [g0 + 0.03, g0 + (g1 - g0) / 3, g0 + (2 * (g1 - g0)) / 3, g1 - 0.03]) sb('steel', fx + 0.01, y, G.pos[2], 0.05, 0.03, G.size[2], false); // 가는 가로 살
    sb('graphite', fx + 0.02, g0 - 0.12, G.pos[2], 0.06, 0.22, G.size[2] + 0.3, false);                          // 창 아래 어두운 띠
    for (let k = 0; k < 6; k++) sb('white', fx + 0.22 + k * 0.12, g1 + 0.3, G.pos[2], 0.07, 0.025, G.size[2] + 0.5, false); // 차양 루버
    for (let z = gz0; z <= gz1 + 0.01; z += G.size[2] / 6) sb('steel', fx + 0.5, g1 + 0.25, z, 0.7, 0.08, 0.04, false);  // 루버 받침
    for (const z of [-8, -4.5, -1]) { sb('steel', fx - 0.03, 0.95, z, 0.04, 1.5, 2); for (let y = 0.3; y < 1.65; y += 0.14) sb('joint', fx - 0.005, y, z, 0.02, 0.02, 1.96, false); } // 골이 진 화물 셔터
    // 끝면 유리
    { const z = T.pos[2] + T.size[2] / 2 + 0.03, x = T.pos[0], w = 4.8;
      sb('glass', x, 3.5, z, w, 3.6, 0.04, false);
      for (let k = 0; k <= 6; k++) sb('white', x - w / 2 + (k * w) / 6, 3.5, z + 0.03, 0.06, 3.6, 0.06, false);
      sb('white', x, 3.5, z + 0.03, w, 0.06, 0.06, false);
      sb('white', x, 1.75, z + 0.4, 3.2, 0.08, 0.9); }

    // ----- 탑승교: 회전실, 세 마디 통로, 운전실, 주름 덮개, 구동 다리 (objects.js) -----
    { const b = find('jet-bridge'), [bx, , bz] = b.pos, [bw, , bd] = b.size; on(bx, bz, bw, bd);
      O.model('jetBridge', bx, 0, bz); }

    // ----- 관제탑 -----
    { const t = find('tower-top'), [x, y, z] = t.pos; on(x, z, t.size[0], t.size[2]);
      O.model('towerKit', x, 0, z); // 몸통 줄눈, 세로 창, 관제실 유리 틀, 발코니, 레이더 돔, 안테나
      box('wall', x, 1.1, z, 3.6, 1.8, 3.6); box('white', x, 2.05, z, 3.9, 0.1, 3.9);
      box('glass', x + 1.82, 1.25, z, 0.04, 0.8, 2.8, false); box('glass', x, 1.25, z + 1.82, 2.8, 0.8, 0.04, false);
      for (let k = -1; k <= 1; k++) { box('white', x + 1.85, 1.25, z + k * 0.93, 0.05, 0.84, 0.05, false); box('white', x + k * 0.93, 1.25, z + 1.85, 0.05, 0.84, 0.05, false); } } // 아래 건물 창살

    // ----- 계류장 바닥 표시 -----
    const flat = 0.204, H = 0.006;
    const mark = (m, x, z, w, d) => { on(x, z, w, d); box(m, x, flat, z, w, H, d, false); };
    for (const sx of [-1, 1]) {
      mark('lime', sx * 4.5, 0, 0.1, 36);
      for (let z = -17.4; z < 17.5; z += 1.8) mark('lime', sx * 4.76, z, 0.1, 1);               // 정지선 점선
    }
    mark('mark', -8.75, 0, 0.1, 36);                                                             // 터미널 앞 도로
    for (let k = 0; k < 8; k++) mark('lime', -8.1 + k * 0.48, 5, 0.14, 1.6);                     // 탑승교 아래 금지 구역
    const bay = (x0, x1, z0, z1, step) => { // 주차 구획
      const cx = (x0 + x1) / 2, w = x1 - x0;
      mark('mark', x0, (z0 + z1) / 2, 0.08, z1 - z0);
      for (let z = z0; z <= z1 + 0.01; z += step) mark('mark', cx, z, w, 0.08);
    };
    bay(5.6, 8.6, -16, -3, 3.25); bay(-11.4, -6, 9.5, 17, 2.5); bay(-8.2, -5.2, -13, -6, 3.5);

    // ----- 조명탑, 바람자루 -----
    for (const z of [-12, 1]) { const x = 8.5; on(x, z, 1.1, 0.3);
      O.model('flood', x, 0.2, z); }
    { const x = 7.6, z = -17; on(x, z, 0.6, 2);
      box('steel', x, 2.2, z, 0.07, 4, 0.07);
      [[0.3, 'seat'], [0.25, 'white'], [0.2, 'seat'], [0.15, 'white']].forEach(([w, m], k) => box(m, x, 4.05 - k * 0.04, z + 0.35 + k * 0.5, w, w, 0.48)); }

    // ----- 지상 장비 -----
    const wheels = (x, z, hw, hd, r = 0.28) => { for (const a of [-1, 1]) for (const b of [-1, 1]) box('dark', x + a * hw, 0.2 + r / 2, z + b * hd, 0.14, r, r); };
    for (const id of ['cart-1', 'cart-2']) { const c = find(id), [x, , z] = c.pos, [w, , d] = c.size; on(x, z, w, d);
      O.model('dolly', x, 0.2, z);                                                                // 지붕 덮인 수하물 카트
      // 눕혀 실은 캐리어 (아래 네 개, 그 위에 하나 더). 조금씩 돌아가 있어 손으로 실은 듯
      const top = 0.2 + 0.525;
      [['suitcaseFlatNavy', -0.32, -0.62, 0, 0.06], ['suitcaseFlatSeat', 0.3, -0.55, 0, -0.1], ['suitcaseFlatWhite', -0.3, 0.42, 0, 0.12], ['suitcaseFlatNavy', 0.3, 0.45, 0, -0.04], ['suitcaseFlatSeat', 0.05, -0.1, 0.25, 1.48]]
        .forEach(([nm, dx, dz, dy, ry]) => O.model(nm, x + dx, top + dy, z + dz, ry)); }
    { const x = 5.4, z = 9.3; on(x, z, 1.3, 1.9); O.model('tug', x, 0.2, z); }                    // 견인차
    { const x = 7.1, z = -9.5; on(x, z, 1.8, 5.2); O.model('fuelTruck', x, 0.2, z); }          // 급유차
    { const x = -8.7, z = 13.3; on(x, z, 1.3, 4.3); O.model('apronBus', x, 0.2, z); }          // 탑승 버스
    for (const [x, z] of [[-5.6, 7.6], [-5.6, 2.4], [-3.0 - 1.5, 9]]) { on(x, z, 0.3, 0.3); O.model('cone', x, 0.2, z); }

    // ----- 실내 -----
    const F = 1.2;
    // 등 뒤 벽: 원목 세로 루버 벽과 어두운 걸레받이, 위 간접등
    for (let z = -10.75; z <= 6.75; z += 0.14) ib('wood', -15.93, F + 2.2, z, 0.06, 4.3, 0.07, false);
    ib('graphite', -15.9, F + 0.06, -2, 0.12, 0.12, 17.8, false); ib('light', -15.88, F + 4.42, -2, 0.03, 0.04, 17.6, false);
    // 바닥: 줄눈, 좌석 구역 카펫, 게이트로 이어지는 안내선
    for (let z = -9.5; z <= 5.5; z += 1.5) ib('joint', -13, F + 0.003, z, 6, 0.004, 0.03, false);
    for (let x = -15.5; x <= -10.5; x += 1.5) ib('joint', x, F + 0.003, -2, 0.03, 0.004, 18, false);
    ib('carpet', -13.1, F + 0.006, -6, 4.4, 0.01, 9.4, false);
    ib('lime', -10.75, F + 0.006, -2, 0.09, 0.008, 18, false);
    // 게이트 좌석: 등을 맞댄 두 줄
    const row = (cx, z0, z1) => {
      const STEP = 0.66; let n = 0;
      for (let z = z0; z <= z1 + 0.01; z += STEP, n++) for (const s of [-1, 1]) {
        I.model('gateSeat', cx + s * 0.34, F, z, s > 0 ? Math.PI : 0); // 성형 좌석, 앞이 바깥을 봄
        I.model('armrest', cx + s * 0.34, F, z + STEP / 2, s > 0 ? Math.PI : 0); // 좌석 사이 팔걸이
        if (n % 3 === 0 && s > 0) I.model('seatLeg', cx, F, z);                  // A자 다리
      }
      ib('graphite', cx, F + 0.36, (z0 + z1) / 2, 0.14, 0.07, z1 - z0 + 0.5); // 알루미늄 가로대
      ib('white', cx, F + 0.42, z1 + 0.56, 0.2, 0.84, 0.2); ib('dark', cx, F + 0.85, z1 + 0.56, 0.22, 0.03, 0.22, false);   // 충전대
    };
    row(-14, -9.8, -3); row(-12.2, -9.8, -3);
    // 캐리어: 좌석 옆에 세워 둔 하드 캐리어 (손잡이를 뽑아 둔 것)
    I.model('suitcaseSeat', -13.1, F, -1.4, 0.35); I.model('suitcaseNavy', -12.5, F, -1.75, -0.2); I.model('suitcaseWhite', -11.4, F, -2.1, 1.3);
    // 천장: 빛을 고르게 하는 살과 긴 조명
    for (let z = -10.6; z <= 6.7; z += 0.72) ib('white', -13, 5.84, z, 5.8, 0.26, 0.05, false);
    for (const x of [-14.6, -11.5]) ib('light', x, 5.68, -2, 0.12, 0.03, 17.2, false);
    ib('white', -10.22, 5.78, -2, 0.24, 0.44, 18, false);
    // 안쪽 벽: 상점 유리와 간판대, 무인 수속기
    { const z = -10.97; ib('joint', -13, 3.2, z, 6, 4, 0.02, false);
      ib('glass', -13.4, 2.3, z + 0.03, 4.4, 2.1, 0.03, false);
      for (let k = 0; k <= 4; k++) ib('white', -15.6 + k * 1.1, 2.3, z + 0.06, 0.07, 2.1, 0.06, false);
      ib('white', -13.4, 3.6, z + 0.1, 4.8, 0.5, 0.16); ib('light', -13.4, 3.33, z + 0.17, 4.5, 0.03, 0.05, false);
      for (const x of [-15.2, -14.5]) { const zk = -10.45; ib('white', x, F + 0.6, zk, 0.42, 1.2, 0.42); ib('glass', x, F + 1.08, zk + 0.22, 0.32, 0.42, 0.02, false); } }
    // 탑승교 문과 게이트 데스크
    { const x = -10.08, z = 5, H2 = 2.5;
      I.model('gateDoor', x, F, z); // 스테인리스 문틀, 미닫이 유리문, 불 켜진 탑승구 표지
      const d = AP.interior.find((b) => b.id === 'gate-desk'), [dx, dy, dz] = d.pos, [dw, dh, dd] = d.size, top = dy + dh / 2;
      ib('white', dx, top + 0.03, dz, dw + 0.26, 0.06, dd + 0.2); ib('navy', dx - dw / 2 - 0.01, dy, dz, 0.02, dh - 0.1, dd - 0.1, false);
      for (const sz of [-0.55, 0.55]) { ib('steel', dx, top + 0.2, dz + sz, 0.05, 0.3, 0.05, false); ib('dark', dx, top + 0.46, dz + sz, 0.04, 0.3, 0.46); }
      // 줄 세우는 기둥과 끈
      const qx = -11.25, N = 5, STEP = 0.8, z0 = -7.7;
      for (let k = 0; k < N; k++) { const zq = z0 + k * STEP; I.model('stanchion', qx, F, zq); if (k < N - 1) ib('seat', qx, F + 0.88, zq + STEP / 2, 0.012, 0.045, STEP - 0.08, false); } } // 줄 기둥과 끈

    O.flush(airportRoot, airRises);
    shellMeshes.push(...Sh.flush(airportRoot, airRises));
    shellMats.push(...Object.values(shellSet));
    I.flush(interior);
  }
  airportDetails();
  // 탑승구 문 위 표지 글자: 공항 안내판처럼 짙은 바탕에 노란 탑승구 번호, 한글과 영문, 오른쪽에 행선지와 출발 시각
  {
    const c = document.createElement('canvas'); c.width = 1360; c.height = 300;
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    const draw = () => {
      const x = c.getContext('2d'), F = "'SUIT', system-ui, sans-serif";
      x.fillStyle = '#1F232A'; x.fillRect(0, 0, 1360, 300);
      x.fillStyle = '#FFB23E'; x.fillRect(0, 0, 250, 300);                                   // 번호 칸
      x.fillStyle = '#1F232A'; x.font = `800 210px ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('7', 125, 160);
      x.textAlign = 'left'; x.fillStyle = '#FFFFFF'; x.font = `700 92px ${F}`; x.fillText('탑승구', 300, 118);
      x.fillStyle = '#9AA3AE'; x.font = `600 54px ${F}`; x.fillText('Gate 7', 304, 214);
      x.textAlign = 'right'; x.fillStyle = '#FFFFFF'; x.font = `700 80px ${F}`; x.fillText('파리 CDG', 1300, 118);
      x.fillStyle = '#FFB23E'; x.font = `600 54px ${F}`; x.fillText('14:20  탑승 중', 1300, 214);
      tex.needsUpdate = true; dirty = true;
    };
    requestAnimationFrame(draw); if (document.fonts) document.fonts.load("800 100px 'SUIT'").then(draw).catch(() => {});
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    sign.position.set(-10.08 - 0.188, 1.2 + 2.5 + 0.46, 5); sign.rotation.y = -Math.PI / 2; // 터미널 안(-x)을 바라봄
    interior.add(sign);
  }

  // 시점 이동에 필요한 값을 장면별로 미리 계산
  function viewOf(pov) {
    const look = new THREE.Vector3(...pov.look), off = new THREE.Vector3(...pov.eye).sub(look), dist = off.length();
    return { look, dist, h: 2 * dist * Math.tan(THREE.MathUtils.degToRad(pov.fov / 2)), q: new THREE.Quaternion().setFromUnitVectors(camDir, off.clone().normalize()), dur: pov.dur };
  }
  const worlds = {
    domestic: { rises: domRises, riseLast: -1, track: domTrack, mover: train, stopZ: S.train.stopZ, from: M.trainFrom, view: viewOf(S.pov), board: S.board, boardFace, hits: [stationRoot], block: train, labels: S.labels.domestic, opaque: false },
    overseas: { rises: airRises, riseLast: -1, track: airTrack, mover: plane, stopZ: PL.stopZ, from: PL.from, landing: PL.landing, view: viewOf(AP.pov), board: AP.board, boardFace: airBoard, hits: airHits, shell: true, labels: S.labels.overseas, opaque: false },
  };
  for (const w of Object.values(worlds)) w.riseEnd = Math.max(...w.rises.map((r) => (r.obj ? r.delay : Math.max(...r.items.map((it) => it.delay))))) + RS.dur;
  let cur = worlds.domestic, curFp = 1, navSticky = false, sw = null, settleV = 0;

  // ---------- 필름 필터: 참고 이미지(cosmos.so/e/1108859166)의 색감 ----------
  // 굵은 필름 입자, 살짝 번지는 초점, 밝은 곳 둘레의 붉은 번짐, 분홍빛 하이라이트와 남청 그림자, 진한 코발트 하늘
  const FM = S.film;
  const quadCam = new THREE.Camera();
  const passScene = (material) => { const sc = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material); q.frustumCulled = false; sc.add(q); return sc; };
  const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const hdr = { type: THREE.HalfFloatType };
  const rtScene = new THREE.WebGLRenderTarget(4, 4, hdr); // 계단 현상 처리(MSAA) 없음: 필름의 부드러운 초점이 계단을 가려줌
  const rtSky = new THREE.WebGLRenderTarget(4, 4, hdr); // 하늘과 구름은 절반 크기로, 가끔만 다시 그림
  const rtA = new THREE.WebGLRenderTarget(4, 4, hdr), rtB = new THREE.WebGLRenderTarget(4, 4, hdr);
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
      void main() { vec4 c = texture2D(tex, vUv) * .2270;
        c += (texture2D(tex, vUv + dir * 1.3846) + texture2D(tex, vUv - dir * 1.3846)) * .3162;
        c += (texture2D(tex, vUv + dir * 3.2308) + texture2D(tex, vUv - dir * 3.2308)) * .0703;
        gl_FragColor = c; }`,
  });
  const blurScene = passScene(blurMat);
  const filmMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      tScene: { value: rtScene.texture }, tBlur: { value: rtB.texture }, tSky: { value: rtSky.texture }, uAspect: { value: 1 },
      uExposure: { value: FM.exposure }, uSoft: { value: FM.soft }, uHal: { value: FM.halation }, uGrain: { value: FM.grain }, uGrainPx: { value: FM.grainSize },
      uSat: { value: FM.saturation }, uCurve: { value: FM.curve }, uVig: { value: FM.vignette }, uCa: { value: FM.aberration },
      uHi: { value: new THREE.Vector3(...FM.highlights) }, uSh: { value: new THREE.Vector3(...FM.shadows) },
    },
    vertexShader: VS,
    fragmentShader: `
      uniform sampler2D tScene, tBlur, tSky; uniform float uExposure, uSoft, uHal, uGrain, uGrainPx, uSat, uCurve, uVig, uCa, uAspect;
      uniform vec3 uHi, uSh; varying vec2 vUv;
      float grain(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); } // sin을 쓰는 해시는 큰 좌표에서 사선 무늬가 생겨서 교체
      vec3 aces(vec3 x) { // three.js ACES Filmic
        x *= uExposure / .6;
        const mat3 I = mat3(.59719, .07600, .02840, .35458, .90834, .13383, .04823, .01566, .83777);
        const mat3 O = mat3(1.60475, -.10208, -.00327, -.53108, 1.10813, -.07276, -.07367, -.00605, 1.07602);
        x = I * x; vec3 a = x * (x + .0245786) - .000090537, b = x * (.983729 * x + .4329510) + .238081;
        return clamp(O * (a / b), 0., 1.);
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 uv = vUv, dc = uv - .5;
        vec2 ca = dc * uCa * dot(dc, dc) * 4.; // 가장자리로 갈수록 색이 살짝 갈라짐
        vec4 s = texture2D(tScene, uv);
        s.r = texture2D(tScene, uv + ca).r; s.b = texture2D(tScene, uv - ca).b;
        vec4 bl = texture2D(tBlur, uv);
        vec3 sk = texture2D(tSky, uv).rgb;
        vec3 col = aces(s.rgb) + sk * (1. - s.a);
        vec3 soft = aces(bl.rgb) + sk * (1. - bl.a);
        vec3 sharp = col;
        float halo = max(dot(soft - col, vec3(.2126, .7152, .0722)), 0.); // 번진 빛이 원래보다 밝은 곳 = 밝은 물체의 가장자리 바깥
        col += vec3(1., .38, .28) * halo * uHal;                      // 밝은 곳 둘레의 붉은 번짐
        col = mix(col, soft, uSoft);                                   // 부드럽게 번지는 초점
        float L = dot(col, vec3(.2126, .7152, .0722));
        col *= mix(uSh, uHi, smoothstep(.04, .75, L));                // 그림자는 남청, 하이라이트는 분홍빛
        col = mix(vec3(L), col, uSat);
        vec3 c = pow(clamp(col, 0., 1.), vec3(1. / 2.2));
        c = mix(c, c * c * (3. - 2. * c), uCurve);                    // 살짝 S 곡선
        c *= mix(1., smoothstep(1.25, .3, length(dc * vec2(uAspect * .8, 1.))), uVig);
        vec2 gs = gl_FragCoord.xy; // 필름 입자는 화면에 고정 (움직이지 않음)
        float g = mix(grain(gs), grain(floor(gs / uGrainPx) * 1.7), .5) - .5; // 고운 입자와 굵은 입자를 섞음
        c += g * uGrain * (.55 + .45 * (1. - abs(L * 2. - 1.)));
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const filmScene = passScene(filmMat);
  const skyMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uAspect: { value: 1 }, uOver: { value: 0 }, uClouds: { value: FM.clouds },
      skyTop: { value: lin(C.skyTop) }, skyMid: { value: lin(C.skyMid) }, skyLow: { value: lin(C.skyLow) }, skyHaze: { value: lin(C.haze) }, skyDeep: { value: lin(FM.overseasTop) }, cloudTint: { value: lin(FM.cloudTint) },
      glowC: { value: lin('#FFEDD1') }, uGlow: { value: 0.18 }, uStars: { value: 0 },
    },
    vertexShader: VS,
    fragmentShader: `uniform float uTime, uAspect, uOver, uClouds, uGlow, uStars; uniform vec3 skyTop, skyMid, skyLow, skyHaze, skyDeep, cloudTint, glowC; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.07 + 13.1; a *= .5; } return v; }
      vec3 sky(vec2 uv) { // 아래 0, 위 1
        float y = 1. - uv.y;
        vec3 top = mix(skyTop, skyDeep, uOver);
        vec3 c = mix(top, skyMid, smoothstep(0., .46, y));
        c = mix(c, skyLow, smoothstep(.46, .82, y));
        c = mix(c, skyHaze, smoothstep(.82, 1., y));
        vec2 p = vec2(uv.x * uAspect, uv.y) * 2.2 + vec2(uTime * .006, 0.);
        float cl = smoothstep(.5, .78, fbm(p)) * smoothstep(.15, .55, uv.y) * uClouds; // 몽글한 구름
        if (uStars > 0.) { // 밤하늘의 별: 움직이거나 깜빡이지 않음
          vec2 g = vec2(uv.x * uAspect, uv.y) * 90., id = floor(g), f = fract(g) - .5;
          float h = hash(id), st = step(.985, h) * smoothstep(.12, 0., length(f - (vec2(hash(id + 3.1), hash(id + 7.7)) - .5) * .6));
          c += vec3(.85, .92, 1.) * st * (.35 + .65 * fract(h * 97.)) * uStars * smoothstep(.1, .7, uv.y) * (1. - cl);
        }
        c = mix(c, cloudTint, cl);
        c += glowC * uGlow * smoothstep(.6, 0., distance(uv, vec2(.9, 1.02))); // 오른쪽 위 해 기운
        return c;
      }
      void main() { gl_FragColor = vec4(sky(vUv), 1.); }`,
  });
  const skyScene = passScene(skyMat);
  let skyAt = -1e9;
  const dbs = new THREE.Vector2();
  function sizeTargets() {
    renderer.getDrawingBufferSize(dbs);
    rtScene.setSize(dbs.x, dbs.y);
    const bw = Math.max(1, Math.round(dbs.x / 4)), bh = Math.max(1, Math.round(dbs.y / 4)); // 번짐은 1/4 크기에서
    rtA.setSize(bw, bh); rtB.setSize(bw, bh);
    rtSky.setSize(Math.max(1, Math.round(dbs.x / 2)), Math.max(1, Math.round(dbs.y / 2)));
    skyMat.uniforms.uAspect.value = dbs.x / dbs.y; skyAt = -1e9;
    filmMat.uniforms.uAspect.value = dbs.x / dbs.y;
  }
  function renderScene(cam) {
    renderer.setRenderTarget(rtScene); renderer.clear(); renderer.render(scene, cam);
    const bw = rtA.width, bh = rtA.height;
    blurMat.uniforms.tex.value = rtScene.texture; blurMat.uniforms.dir.value.set(1.6 / bw, 0); renderer.setRenderTarget(rtA); renderer.render(blurScene, quadCam);
    blurMat.uniforms.tex.value = rtA.texture; blurMat.uniforms.dir.value.set(0, 1.6 / bh); renderer.setRenderTarget(rtB); renderer.render(blurScene, quadCam);
    renderer.setRenderTarget(null);
  }
  function composite(now, changed) {
    const u = filmMat.uniforms;
    const skyDue = now - skyAt > 100 || Math.abs((mode === 'overseas' ? 1 : 0) - skyMat.uniforms.uOver.value) > 0.002;
    if (!changed && !skyDue) return; // 바뀐 것이 없으면 화면을 그대로 둠
    const su = skyMat.uniforms, over = mode === 'overseas' ? 1 : 0;
    if (now - skyAt > 100 || Math.abs(over - su.uOver.value) > 0.002) { // 하늘은 초당 10번 정도만
      skyAt = now; su.uTime.value = reduce ? 0 : now / 1000; su.uOver.value += (over - su.uOver.value) * 0.12;
      renderer.setRenderTarget(rtSky); renderer.render(skyScene, quadCam);
    }
    renderer.setRenderTarget(null);
    renderer.render(filmScene, quadCam);
  }

  // ---------- layout ----------
  let viewH = S.camera.viewHeight, VW = 1, VH = 1;
  const startMode = ['domestic', 'overseas'].includes(params.get('mode')) ? params.get('mode') : 'domestic';
  let mode = startMode;
  let dirty = true, lastT = -1, lastTp = -1;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    VW = w; VH = h;
    viewH = w / h < 0.9 ? S.camera.mobileViewHeight : S.camera.viewHeight;
    renderer.setSize(w, h, false);
    sizeTargets();
    const halfH = viewH / 2, halfW = (viewH * (w / h)) / 2;
    camera.left = -halfW; camera.right = halfW;
    camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    if (viewP > 0) setView(viewP);
    if (seatP > 0 && !atlasOn) setSeat(seatP);
    if (atlasOn) { atlas.tick(performance.now()); placeHeld(cur.cabin, 1); }
    dirty = true;
  }

  // 포인터에 따라 카메라가 아주 살짝 돎 (정차 이후)
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // ---------- timeline (t초에 대한 상태를 매번 계산) ----------
  const END = M.trainStart + M.trainDur + 0.2;
  const TOTAL = END;

  function apply(t) {
    // 1) 승강장, 건물, 지붕이 땅에서 차례로 솟음
    applyRise(cur, t);
    if (cur.shell) applyShell();

    // 2) 선로(공항은 활주로): 도상, 침목(표시), 레일이 물결처럼 차례로 솟음
    const tk = cur.track;
    if (t <= tk.end || tk.last <= tk.end || tk.last > t) {
      for (const g of tk.groups) {
        g.items.forEach((it, idx) => {
          const p = prog(t, M.trackStart + g.lead + it.i * M.sleeperStagger, g.dur);
          sleeperDummy.position.set(it.x, it.y - (1 - easeRise(p)) * it.rise, it.z);
          sleeperDummy.rotation.y = it.rot;
          if (p > 0) sleeperDummy.scale.set(it.w, it.h, it.d); else sleeperDummy.scale.setScalar(0); // 솟기 전에는 아예 없음
          sleeperDummy.updateMatrix();
          g.mesh.setMatrixAt(idx, sleeperDummy.matrix);
        });
        g.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    tk.last = t;

    // 4) 오른쪽 위(-z)에서 감속하며 들어와 정차. 비행기는 내려앉은 뒤 활주함
    const tp = prog(t, M.trainStart, M.trainDur);
    const mv = cur.mover;
    mv.visible = tp > 0;
    mv.position.z = cur.from + (cur.stopZ - cur.from) * easeOutQuart(tp);
    if (cur.landing) {
      const L = cur.landing, y = L.height * Math.pow(clamp01((L.touchZ - mv.position.z) / L.range), 1.25);
      mv.position.y = y;
      mv.rotation.x = -L.pitch * clamp01(y / 2);
    }
    if (t < cur.riseEnd + 0.1 || tp !== lastTp || t < tk.end + 0.1) shadowDirty = true;
    lastTp = tp;

    // 카메라: 살짝 당겨졌다가 제자리로
    const cp = easeOutCubic(prog(t, 0, M.cameraIntro));
    camera.zoom = 0.9 + 0.1 * cp;
    camera.updateProjectionMatrix();

    if (t >= M.navIn) navSticky = true;
    document.body.classList.toggle('is-ready', navSticky);
  }

  let start = performance.now();
  // 확인용: ?t=5 처럼 특정 시점에 멈춰서 보기
  const qt = params.get('t');
  const fixedT = qt !== null ? parseFloat(qt) : null;
  let lastCx = 1e9, lastCy = 1e9, lastSV = -1;

  // ---------- 승강장 시점: 등각에 가까운 먼 망원에서 눈높이 광각으로 이어짐 ----------
  const FAR_DIST = 4000;
  const smoother = (q) => q * q * q * (q * (q * 6 - 15) + 10);
  const qStart = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const vDir = new THREE.Vector3(), vLook = new THREE.Vector3();

  // 터미널 겉면은 카메라가 내려오는 동안 녹아 사라지고 안이 드러남
  function applyShell() {
    const a = 1 - smoother(prog(viewP, 0.12, 0.5));
    const op = curFp * a, tr = op < 1;
    for (const m of shellMats) {
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
      m.opacity = op;
    }
    for (const n of shellMeshes) n.visible = a > 0;
    interior.visible = viewP > 0.1;
  }

  // 눈높이로 내려갈수록 그림자 범위를 시선 주변으로 좁혀서 가까이서도 그림자 가장자리가 깔끔하게
  function fitShadow(p, look) {
    const half = SH_HALF + (14 - SH_HALF) * p;
    const cam = sun.shadow.camera;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
    cam.updateProjectionMatrix();
    sun.target.position.set(0, 0, 0).lerp(look || sun.target.position, p);
    sun.position.copy(sunBase).add(sun.target.position);
    sun.target.updateMatrixWorld();
    shadowDirty = true;
  }

  function setView(p) {
    viewP = p;
    const screen = cur.boardFace.userData.screen;
    if (screen) screen.uniforms.uOn.value = Math.max(todScreens, smoother(clamp01((p - S.adMotion.onFrom) / (S.adMotion.onTo - S.adMotion.onFrom)))); // 다가가는 동안 서서히 켜짐 (밤에는 처음부터 켜짐)
    if (cur.shell) applyShell();
    fitShadow(Math.max(0, p), cur.view.look);
    if (p <= 0) { scene.fog.near = camDist + LK.haze.near; scene.fog.far = camDist + LK.haze.far; return; }
    const v = cur.view;
    const dist = Math.exp(Math.log(FAR_DIST) + (Math.log(v.dist) - Math.log(FAR_DIST)) * p);
    const h = Math.exp(Math.log(S.camera.viewHeight) + (Math.log(v.h) - Math.log(S.camera.viewHeight)) * p);
    qTmp.copy(qStart).slerp(v.q, p);
    vDir.copy(camDir).applyQuaternion(qTmp);
    vLook.copy(target).lerp(v.look, p);
    povCam.aspect = VW / VH;
    povCam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 2 / dist));
    povCam.near = Math.max(0.3, dist - 80); povCam.far = dist + 140;
    povCam.position.copy(vLook).addScaledVector(vDir, dist);
    povCam.up.set(0, 1, 0);
    povCam.lookAt(vLook);
    povCam.updateProjectionMatrix();
    povCam.updateMatrixWorld();
    // 안개는 카메라 거리에 맞춰 같은 깊이에서 시작 (눈높이에서는 멀리 있는 것만 옅어짐)
    scene.fog.near = dist + LK.haze.near * (1 - p) + 30 * p; scene.fog.far = dist + LK.haze.far * (1 - p) + 160 * p;
  }

  // 전광판: 승강장 시점에서 세 칸이 시간차를 두고 다음 광고로 스크롤됨. 움직이는 동안에만 장면을 다시 그림
  const AM = S.adMotion, AD_BASE = [0, -2, 4], AD_DIR = [1, -1, 1]; // 칸마다 다른 광고에서 시작하고 가운데 칸만 반대로
  let adStart = 0;
  function tickScreen(now) {
    const sc = cur.boardFace.userData.screen;
    if (!sc || reduce) return;
    if (viewP < 0.8) { adStart = 0; return; }
    if (!adStart) adStart = now + AM.first * 1000;
    const T = (now - adStart) / 1000, u = sc.uniforms.uS.value;
    const v = [0, 1, 2].map((i) => {
      const Ti = T - i * AM.stagger;
      if (Ti < 0) return 0;
      const n = Math.floor(Ti / AM.period);
      return n + smoother(clamp01((Ti - n * AM.period) / AM.move));
    });
    const x = AD_BASE[0] + AD_DIR[0] * v[0], y = AD_BASE[1] + AD_DIR[1] * v[1], z = AD_BASE[2] + AD_DIR[2] * v[2];
    if (Math.abs(x - u.x) + Math.abs(y - u.y) + Math.abs(z - u.z) > 1e-4) { u.set(x, y, z); dirty = true; }
  }

  function goView(to) {
    if (atlasOn || atlasBusy) { if (to === 0 && atlasOn && !atlasBusy && !(courseUI && courseUI.back()) && !atlas.back()) { if (atlas === atlasJ) toWorld(); else closeAtlas(); } return; } // 입체 지도: 코스 화면 → 장소 닫기 → 전국 → 좌석
    if (to === 0 && (seatTarget === 1 || seatP > 0)) { goSeat(0); return; } // 좌석에서는 먼저 시점으로
    if (to === 1 && seatP > 0) return;
    if (viewTarget === to) return;
    viewTarget = to;
    document.body.classList.toggle('is-pov', to === 1);
    if (reduce) { setView(to); dirty = true; return; }
    viewAnim = { from: viewP, to, start: performance.now(), dur: cur.view.dur * Math.max(0.35, Math.abs(to - viewP)) };
  }

  // 역을 누르면 승강장으로, 버튼이나 Esc로 돌아감
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let settledAt = 0;
  function hitOverviewMover(e) {
    if (viewTarget !== 0 || viewAnim || sw || settledAt < 1 || seatTarget !== 0 || seatAnim || seatP > 0) return false;
    ndc.set((e.clientX / host.clientWidth) * 2 - 1, -(e.clientY / host.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const first = ray.intersectObjects([cur.mover, ...cur.hits], true).find((h) => h.object.isMesh && visibleUp(h.object));
    if (!first) return false;
    for (let o = first.object; o; o = o.parent) if (o === cur.mover) return true;
    return false;
  }
  function hitStation(e) {
    if (viewTarget !== 0 || viewAnim || sw || settledAt < 1 || seatTarget !== 0 || seatAnim || seatP > 0) return false;
    ndc.set((e.clientX / host.clientWidth) * 2 - 1, -(e.clientY / host.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(cur.hits, true).filter((h) => h.object.isMesh);
    if (!hits.length) return false;
    if (!cur.block) return true;
    const trainHit = ray.intersectObject(cur.block, true)[0];
    return !trainHit || trainHit.distance > hits[0].distance;
  }
  host.addEventListener('click', (e) => {
    if (atlasOn || atlasBusy) { if (atlasOn && !atlasBusy && !(courseUI && courseUI.ownsMap())) atlas.click(e); return; } // 코스 화면에서는 지도를 눌러도 지역으로 가지 않음
    if (hitHeldPhone(e)) { openPhone(); return; } // 좌석에서 휴대폰: 동반자 앱이 들려 올라옴
    if (hitHeldMap(e)) { openAtlas(); return; } // 좌석에서 종이 지도: 입체 지도로
    if (hitOverviewMover(e)) goSeatDirect(); // 전체 화면에서 열차나 비행기: 승강장·터미널 시점을 거치지 않고 곧바로 좌석으로
    else if (hitStation(e)) goView(1);
    else if (hitMover(e)) goSeat(1);
  });
  let hoverEv = null, moverHot = false;
  host.addEventListener('pointermove', (e) => { hoverEv = e; });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') goView(0); });
  const enterBtn = document.getElementById('enter-pov'), leaveBtn = document.getElementById('leave-pov');
  if (enterBtn) enterBtn.addEventListener('click', () => { if (settledAt >= 1) goView(1); });
  if (leaveBtn) leaveBtn.addEventListener('click', () => goView(0));

  // ---------- 국내, 해외 전환: 지금 장면을 처음 순서의 반대로 거둬들이고, 새 장면을 처음 순서대로 지음 ----------
  const SW = S.modeSwitch;
  const modeBtns = [...document.querySelectorAll('.mode-opt')];

  function setWorld(m) {
    mode = m;
    cur = worlds[m];
    gD.visible = m === 'domestic'; gO.visible = m === 'overseas';
    shadowDirty = true; lastT = -1; lastTp = -1; cur.track.last = -1; cur.riseLast = -1;
    if (!cur.shell) interior.visible = false;
    if (leaveBtn) leaveBtn.textContent = cur.labels.leave;
    if (enterBtn) enterBtn.textContent = cur.labels.enter;
    host.setAttribute('aria-label', cur.labels.scene);
    document.body.classList.toggle('is-overseas', m === 'overseas');
    modeBtns.forEach((b) => { const on = b.dataset.mode === m; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
  }

  function startSwitch(next) {
    if (next === mode || sw) return;
    if (next === 'overseas') loadOverseas(); // 해외 지도 데이터를 미리 받아 둠
    closeAtlasNow();
    viewTarget = 0; viewAnim = null;
    seatAnim = null; seatTarget = 0; document.body.classList.remove('is-seat'); if (seatP > 0) setSeat(0); seatDirect = false;
    setView(0); adStart = 0;
    document.body.classList.remove('is-pov');
    const now = performance.now();
    const from = reduce ? 0 : Math.min(fixedT !== null ? fixedT : (now - start) / 1000, END);
    modeBtns.forEach((b) => { const on = b.dataset.mode === next; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); }); // 토글은 바로 반응
    document.body.classList.toggle('is-overseas', next === 'overseas'); // 하늘빛도 바로 바뀌기 시작
    if (reduce || from <= 0) { setWorld(next); start = now - (reduce ? TOTAL : 0) * 1000; dirty = true; return; }
    sw = { next, from, t0: now, dur: SW.rewind * Math.max(0.4, from / END) };
  }

  // ---------- 좌석 시점: 객실 좌석에 앉아 탁자 위 종이 지도와 휴대폰을 봄 ----------
  const SE = S.seat;
  let seatP = 0, seatTarget = 0, seatAnim = null;
  const seatFrom = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 46 };
  const visibleUp = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const matsOf = (o) => { const s = new Set(); o.traverse((n) => { if (n.isMesh) for (const m of [].concat(n.material)) s.add(m); }); return [...s]; };
  const phoneScreens = [], cabinLights = [];
  function refreshPhones() {
    if (!window.EODI_PROPS) return;
    const now = new Date(), m = localMinutes(); now.setHours(Math.floor(m / 60), Math.floor(m % 60), 0, 0);
    for (const ps of phoneScreens) {
      let seat = null; try { seat = companion ? companion.seat(ps.mode) : null; } catch (e) { seat = null; } // 동반자 앱이 아직 준비 전이면 예전 화면
      window.EODI_PROPS.phone(ps.canvas, ps.mode, now, ps.mode === 'domestic' && atlasOn ? atlasCourse : null, seat); ps.tex.needsUpdate = true;
    }
    dirty = true;
  }
  function buildCabin(mode) {
    const C = SE[mode], g = new THREE.Group(); g.visible = false; g.name = 'cabin-' + mode;
    (mode === 'domestic' ? gD : gO).add(g);
    const K = kit(0, DM), { box } = K, mdl = K.model;
    // 따뜻한 실내등: 통로 천장을 따라 점광원 셋 (좌석에 앉아 있을 때만 켜짐, cabinMood에서 세기 조절)
    const lamps = (mode === 'domestic' ? [[0, 3.05, -4.2], [0, 3.05, -2.2], [0, 3.05, -0.2]] : [[0, 3.35, 0.4], [0, 3.35, 2.6], [0, 3.35, 4.8]]).map((pos) => {
      const L = new THREE.PointLight(lin('#FFD7A3'), 0, 5.5, 1.6); L.position.set(...pos); g.add(L); cabinLights.push(L); return L;
    });
    const add = (geo, mat) => { const m = new THREE.Mesh(geo, DM[mat]); g.add(m); return m; };
    // 객실 안 작은 표시판 (캔버스 글자, 스스로 빛남)
    const signPlane = (w, h, px, draw, x, y, z, ry) => {
      const c = document.createElement('canvas'); c.width = px; c.height = Math.round((px * h) / w);
      const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
      const paint = () => { draw(c.getContext('2d'), c.width, c.height); tex.needsUpdate = true; dirty = true; };
      requestAnimationFrame(paint); if (document.fonts) document.fonts.load("600 40px 'SUIT'").then(paint).catch(() => {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
    };
    const FONT = "'SUIT', system-ui, sans-serif";
    if (mode === 'domestic') { // KTX 2호차 안 (바깥 차체 너비 2.1, 바닥 높이 1.2)
      const F = 1.32, CEIL = 3.25, Z0 = -5.0, Z1 = 1.0, zc = (Z0 + Z1) / 2, L = Z1 - Z0, WB = 2.05, WT = 2.8;
      // 바닥: 짙은 바닥재, 통로 카펫, 좌석 레일
      box('dark', 0, F - 0.03, zc, 1.96, 0.06, L); box('carpet', 0, F + 0.004, zc, 0.5, 0.008, L, false);
      // 천장: 가운데 평판과 긴 조명, 양옆으로 내려오는 비스듬한 판
      box('white', 0, CEIL + 0.03, zc, 1.1, 0.06, L);
      for (const sx of [-1, 1]) {
        add(MD.roundedBox(0.5, 0.035, L, 0.015, 2).rotateZ(sx * 0.42).translate(sx * 0.76, CEIL - 0.1, zc), 'white');
        box('light', sx * 0.5, CEIL - 0.004, zc, 0.07, 0.014, L - 0.3, false);
        // 옆벽: 아래 판, 위 판, 창 사이 기둥, 둥근 창틀과 말린 블라인드, 창턱, 걸레받이
        box('wall', sx * 0.99, (F + WB) / 2, zc, 0.04, WB - F, L); box('wall', sx * 0.99, (WT + CEIL) / 2, zc, 0.04, CEIL - WT, L);
        for (let z = Z0; z <= Z1 + 0.01; z += 1.05) box('wall', sx * 0.99, (WB + WT) / 2, z, 0.05, WT - WB, 0.27);
        let k = 0;
        for (let z = Z0 + 0.525; z < Z1; z += 1.05, k++) {
          mdl('ktxWin', sx * 0.955, (WB + WT) / 2, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
          if ((k + (sx > 0 ? 1 : 0)) % 3 === 0) mdl('ktxBlind', sx * 0.955, (WB + WT) / 2, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
        }
        box('white', sx * 0.92, WB + 0.02, zc, 0.13, 0.035, L);                                   // 창턱
        box('graphite', sx * 0.968, F + 0.12, zc, 0.03, 0.2, L, false);                          // 아래 히터 덮개
        // 짐 선반: 유리 판, 스테인리스 테와 받침살, 아래 조명 줄
        box('glass', sx * 0.73, 2.96, zc, 0.48, 0.014, L - 0.2, false);
        box('brushed', sx * 0.49, 2.95, zc, 0.03, 0.05, L - 0.2); box('brushed', sx * 0.955, 2.95, zc, 0.03, 0.05, L - 0.2);
        for (let z = Z0 + 0.3; z < Z1; z += 1.05) box('brushed', sx * 0.73, 2.935, z, 0.48, 0.025, 0.03, false);
        box('light', sx * 0.51, 2.915, zc, 0.02, 0.01, L - 0.4, false);
      }
      // 앞뒤 끝벽: 스테인리스 문틀의 미닫이 유리문, 앞벽 위 행선 표시
      for (const z of [Z0, Z1]) { const s2 = -Math.sign(z - zc); box('wall', 0, (F + CEIL) / 2, z, 1.96, CEIL - F, 0.05); box('brushed', 0, F + 1.0, z + s2 * 0.03, 0.9, 2.02, 0.02, false); box('glass', 0, F + 1.0, z + s2 * 0.042, 0.76, 1.84, 0.02, false); box('graphite', 0, F + 2.12, z + s2 * 0.035, 0.96, 0.16, 0.03, false); }
      signPlane(0.88, 0.12, 880, (x, w, h) => { // 주황 점 글자의 행선 표시
        x.fillStyle = '#0B0B0D'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#FF9A2E'; x.font = `600 ${h * 0.62}px ${FONT}`; x.textBaseline = 'middle';
        x.textAlign = 'left'; x.fillText('KTX 101', w * 0.04, h * 0.54); x.textAlign = 'right'; x.fillText('부산행  2호차', w * 0.96, h * 0.54);
        x.fillStyle = 'rgba(0,0,0,0.55)'; for (let yy = 0; yy < h; yy += 3) x.fillRect(0, yy, w, 1); for (let xx = 0; xx < w; xx += 3) x.fillRect(xx, 0, 1, h); // LED 점 격자
      }, 0, F + 2.12, Z1 - 0.055, Math.PI);
      const xs = [-0.7, -0.26, 0.26, 0.7];
      for (const [z, dir] of [[-4.4, 1], [-3.5, 1], [-2.6, 1], [-1.4, -1], [-0.4, 1], [0.5, 1]]) for (const x of xs) mdl('ktxSeat', x, F, z, dir > 0 ? 0 : Math.PI);
    } else { // 비행기 객실 (동체 반지름 1.35, 중심 높이 2.6)
      const F = 1.85, CEIL = 3.55, Z0 = -2, Z1 = 7, zc = (Z0 + Z1) / 2, L = Z1 - Z0;
      box('dark', 0, F - 0.03, zc, 2.3, 0.06, L); box('carpet', 0, F + 0.004, zc, 0.4, 0.008, L, false);
      box('white', 0, CEIL + 0.03, zc, 1.3, 0.06, L);
      for (const sx of [-1, 1]) box('light', sx * 0.32, CEIL - 0.004, zc, 0.05, 0.012, L - 0.4, false);
      const rows = []; for (let z = -1.6; z <= 6.41; z += 0.8) rows.push(z);
      for (const sx of [-1, 1]) {
        box('wall', sx * 1.2, (F + 2.7) / 2, zc, 0.05, 2.7 - F, L);
        box('wall', sx * 1.2, 3.03, zc, 0.05, 0.06, L);
        for (let d = 4.6; d < 11.6; d += 0.52) box('wall', sx * 1.2, 2.85, 9 - d - 0.26, 0.05, 0.3, 0.28); // 바깥 창 위치에 맞춘 창 사이 벽
        box('wall', sx * 1.2, 2.85, (4.4 + Z1) / 2 + 0.13, 0.05, 0.3, Z1 - 4.4); box('wall', sx * 1.2, 2.85, -1.0, 0.05, 0.3, 2.0);
        let k = 0;
        for (let d = 4.6; d < 11.6; d += 0.52, k++) { const z = 9 - d; if (z < Z0 + 0.2 || z > Z1 - 0.2) continue;
          mdl('planeWin', sx * 1.17, 2.85, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
          if ((k + (sx > 0 ? 0 : 1)) % 3 === 0) mdl('planeShade', sx * 1.17, 2.85, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2); }
        // 짐칸: 아래가 둥글게 말린 문, 문 사이 이음, 아래 승객 서비스 판(독서등)
        const bin = new THREE.Shape(), X = (v) => sx * v;
        bin.moveTo(X(1.2), 3.56); bin.lineTo(X(1.2), 3.13); bin.lineTo(X(0.94), 3.13); bin.quadraticCurveTo(X(0.66), 3.14, X(0.6), 3.3); bin.quadraticCurveTo(X(0.58), 3.47, X(0.7), 3.56); bin.lineTo(X(1.2), 3.56);
        add(new THREE.ExtrudeGeometry(bin, { depth: L, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, Z0), 'white');
        for (let z = Z0 + 1.2; z < Z1; z += 1.2) box('joint', X(0.6), 3.33, z, 0.03, 0.26, 0.012, false);
        box('joint', X(0.8), 3.115, zc, 0.36, 0.03, L, false);
        for (const z of rows) for (const dx of [0.68, 0.9]) box('light', X(dx), 3.098, z + 0.3, 0.035, 0.008, 0.035, false);
      }
      box('navy', 0, (F + CEIL) / 2, Z1, 2.3, CEIL - F, 0.05); box('wall', 0, (F + CEIL) / 2, Z0, 2.3, CEIL - F, 0.05);
      signPlane(0.36, 0.11, 720, (x, w, h) => { // 앞 칸막이 위 비상구 표시
        x.fillStyle = '#0F7A3E'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#F2FFF6'; x.font = `600 ${h * 0.5}px ${FONT}`; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText('비상구  EXIT', w / 2, h * 0.54);
      }, 0, 3.3, Z1 - 0.03, Math.PI);
      for (const z of rows) for (const x of [-0.85, -0.42, 0.42, 0.85]) mdl('planeSeat', x, F, z, 0);
    }
    // 내 앞 접이식 테이블: 둥근 판과 컵 자리
    { const [tx, ty, tz, tw, td] = C.table;
      add(MD.roundedBox(tw, 0.03, td, 0.012, 2).translate(tx, ty, tz), 'graphite');
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 24).translate(tx + tw * 0.32, ty + 0.016, tz - td * 0.22), 'dark'); }
    K.flush(g);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); // 천장이 그늘을 만들고 창으로 햇빛이 들어옴
    // 손에 든 소품: 화면 왼쪽 아래에서 종이 지도, 오른쪽 아래에서 휴대폰이 올라와 각각 화면의 절반쯤을 채움
    // 카메라를 따라다니는 묶음이라 객실 물체에 가려지지 않도록 맨 위에 그림
    const held = new THREE.Group(); held.name = 'held-' + mode; held.visible = false; scene.add(held);
    const onTop = (m, order) => { m.depthTest = false; m.depthWrite = false; return order; };
    const mapCanvas = document.createElement('canvas'); mapCanvas.width = 1400; mapCanvas.height = 1000;
    const mapTex = new THREE.CanvasTexture(mapCanvas); mapTex.encoding = THREE.sRGBEncoding; mapTex.anisotropy = 8;
    // 종이 지도: 병풍처럼 네 칸으로 접혔다 편 자국(산·골이 번갈아 또렷한 꺾임), 가로 한 번 접힌 자국, 아래 모서리가 살짝 말려 올라감
    const mapGeo = new THREE.PlaneGeometry(1, 1000 / 1400, 32, 16).toNonIndexed(); // 너비 1 기준, 실제 크기는 화면에 맞춰 키움
    const pa = mapGeo.attributes.position, MH = 1000 / 1400;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), u = (x + 0.5) * 4;
      let z = 0.016 * (1 - Math.abs((u % 2) - 1));                                   // 병풍 접힘
      z -= 0.007 * Math.abs(y) / (MH / 2);                                            // 가로 접힘
      const cx = Math.max(0, Math.abs(x) - 0.36) / 0.14, cy = Math.max(0, -y - MH * 0.24) / (MH * 0.26);
      z += 0.02 * cx * cx * cy;                                                       // 아래 모서리 말림
      pa.setZ(i, z);
    }
    mapGeo.computeVertexNormals();
    // 종이 결: 섬유 무늬의 울퉁불퉁함 (빛을 받으면 은은하게 드러남)
    const fiber = document.createElement('canvas'); fiber.width = fiber.height = 256;
    { const x = fiber.getContext('2d'), img = x.createImageData(256, 256); for (let k = 0; k < img.data.length; k += 4) { const v = 120 + Math.random() * 60; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255; } x.putImageData(img, 0, 0);
      x.globalAlpha = 0.25; x.strokeStyle = '#fff'; for (let k = 0; k < 160; k++) { x.lineWidth = 0.6; x.beginPath(); const a = Math.random() * 6.28, px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 12, py + Math.sin(a) * 12); x.stroke(); } }
    const fiberTex = new THREE.CanvasTexture(fiber); fiberTex.wrapS = fiberTex.wrapT = THREE.RepeatWrapping; fiberTex.repeat.set(6, 4);
    const mapMat = new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.88, bumpMap: fiberTex, bumpScale: 0.0006, color: new THREE.Color(0.88, 0.87, 0.85), emissive: new THREE.Color(1, 1, 1), emissiveMap: mapTex, emissiveIntensity: 0.2, side: THREE.DoubleSide }); // 밤에도 읽히도록 은은하게 스스로 밝음
    const mapMesh = new THREE.Mesh(mapGeo, mapMat); mapMesh.name = 'paper-map'; mapMesh.renderOrder = onTop(mapMat, 20);
    held.add(mapMesh);

    // 휴대폰: 알루미늄 테, 검은 테두리 앞유리, 둥근 모서리 화면, 위쪽 알약 모양 카메라 구멍, 옆 버튼, 유리에 비친 빛
    const ph = new THREE.Group(); ph.name = 'phone';
    const PW = 0.078, PH = 0.162, PD = 0.0085, PR = 0.0105;
    const rrShape = (w, h, rad) => { const sh = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2; sh.moveTo(x0 + rad, y0); sh.lineTo(x0 + w - rad, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rad); sh.lineTo(x0 + w, y0 + h - rad); sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rad, y0 + h); sh.lineTo(x0 + rad, y0 + h); sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rad); sh.lineTo(x0, y0 + rad); sh.quadraticCurveTo(x0, y0, x0 + rad, y0); return sh; };
    const flat = (w, h, rad) => { const g2 = new THREE.ShapeGeometry(rrShape(w, h, rad), 10), q = g2.attributes.position, uv = g2.attributes.uv; for (let k = 0; k < q.count; k++) uv.setXY(k, q.getX(k) / w + 0.5, q.getY(k) / h + 0.5); return g2; };
    const metal = new THREE.MeshStandardMaterial({ color: lin('#A7ADB5'), metalness: 1, roughness: 0.28 });
    const frame = new THREE.Mesh(MD.roundedBox(PW, PH, PD, PR), metal); frame.renderOrder = onTop(metal, 21); ph.add(frame);
    for (const [y, h2] of [[0.035, 0.022], [0.009, 0.014], [-0.009, 0.014]]) { const b2 = new THREE.Mesh(MD.roundedBox(0.0016, h2, 0.0032, 0.0008), metal); b2.position.set(-PW / 2 - 0.0005, y, 0); b2.renderOrder = 21; ph.add(b2); } // 왼쪽 음량·동작 버튼
    { const b2 = new THREE.Mesh(MD.roundedBox(0.0016, 0.028, 0.0032, 0.0008), metal); b2.position.set(PW / 2 + 0.0005, 0.02, 0); b2.renderOrder = 21; ph.add(b2); } // 오른쪽 전원 버튼
    const glassMat = new THREE.MeshStandardMaterial({ color: lin('#050507'), roughness: 0.08, metalness: 0.2 });
    const glass = new THREE.Mesh(flat(PW - 0.0016, PH - 0.0016, PR - 0.0008), glassMat); glass.position.z = PD / 2 + 0.0002; glass.renderOrder = onTop(glassMat, 21.5); ph.add(glass); // 앞유리 (검은 테두리)
    const scr = document.createElement('canvas'); scr.width = 720; scr.height = 1500;
    const scrTex = new THREE.CanvasTexture(scr); scrTex.encoding = THREE.sRGBEncoding; scrTex.anisotropy = 8;
    const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false });
    const screen = new THREE.Mesh(flat(0.0712, 0.1552, 0.0088), scrMat); screen.position.z = PD / 2 + 0.0004; screen.renderOrder = onTop(scrMat, 22); ph.add(screen);
    const islandMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const island = new THREE.Mesh(flat(0.019, 0.0056, 0.0028), islandMat); island.position.set(0, PH / 2 - 0.0085, PD / 2 + 0.0006); island.renderOrder = onTop(islandMat, 22.5); ph.add(island); // 카메라 구멍
    // 유리에 비친 빛: 비스듬한 흰 띠가 아주 옅게
    const gl = document.createElement('canvas'); gl.width = 64; gl.height = 128;
    { const x = gl.getContext('2d'), g2 = x.createLinearGradient(0, 0, 64, 128); g2.addColorStop(0, 'rgba(255,255,255,0.0)'); g2.addColorStop(0.32, 'rgba(255,255,255,0.10)'); g2.addColorStop(0.42, 'rgba(255,255,255,0.0)'); g2.addColorStop(0.7, 'rgba(255,255,255,0.04)'); g2.addColorStop(1, 'rgba(255,255,255,0.0)'); x.fillStyle = g2; x.fillRect(0, 0, 64, 128); }
    const glossMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gl), transparent: true, toneMapped: false });
    const gloss = new THREE.Mesh(flat(PW - 0.0016, PH - 0.0016, PR - 0.0008), glossMat); gloss.position.z = PD / 2 + 0.0008; gloss.renderOrder = onTop(glossMat, 23); ph.add(gloss);
    held.add(ph);
    held.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    phoneScreens.push({ canvas: scr, tex: scrTex, mode });
    window.EODI_POSTERS.ready().then(() => { window.EODI_PROPS.map(mode, mapCanvas); mapTex.needsUpdate = true; refreshPhones(); });
    // 앉은 눈높이의 카메라 자세
    const cam = new THREE.PerspectiveCamera(); cam.position.set(...C.eye); cam.lookAt(new THREE.Vector3(...C.look));
    return { group: g, held, map: mapMesh, phone: ph, pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: C.fov, look: new THREE.Vector3(...C.look), gate: new THREE.Vector3(...C.gate) };
  }
  for (const [m, w] of Object.entries(worlds)) { w.cabin = buildCabin(m); w.moverMats = matsOf(w.mover); }

  function hitMover(e) {
    if (viewP < 1 || viewAnim || seatTarget !== 0 || seatAnim || sw) return false;
    ndc.set((e.clientX / host.clientWidth) * 2 - 1, -(e.clientY / host.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, povCam);
    const first = ray.intersectObjects([cur.mover, ...cur.hits, interior], true).find((h) => h.object.isMesh && visibleUp(h.object));
    if (!first) return false;
    for (let o = first.object; o; o = o.parent) if (o === cur.mover) return true;
    return false;
  }
  // ---------- 좌석 직행: 전체 화면에서 열차나 비행기를 누르면 승강장 시점을 거치지 않고 곧바로 좌석까지 ----------
  // 1막: 등각 화면과 똑같이 보이는 아주 먼 망원 카메라에서 출발해 돌리 줌으로 내 좌석 창문 앞까지 수평으로 내려앉음 (창이 화면을 채우며 잠깐 머묾)
  // 2막: 창을 통과하는 동안 겉면이 녹고, 안으로 들어서며 고개를 진행 방향으로 돌려 앉음
  let seatDirect = false;
  const DK = [0, 1].map(() => ({ look: new THREE.Vector3(), dir: new THREE.Vector3(), d: 1, h: 1 }));
  const dvL = new THREE.Vector3(), dvD = new THREE.Vector3(), winPos = new THREE.Vector3(), winQuat = new THREE.Quaternion();
  const heldFrom = () => (seatDirect ? SE.direct.heldFrom : SE.held.from);
  function goSeatDirect(now) {
    const Cb = cur.cabin, X = SE.direct, [k0, k1] = DK;
    // 지금 보이는 등각 화면 (패럴랙스로 살짝 돈 방향까지 그대로)
    camera.getWorldDirection(k0.dir).negate(); k0.look.copy(target); k0.d = FAR_DIST; k0.h = viewH / camera.zoom;
    // 창가 쪽 벽 바깥, 좌석 눈높이에서 창을 정면으로 보는 자리
    const side = Math.sign(Cb.gate.x) || 1;
    k1.look.copy(Cb.gate);
    k1.dir.set(side, 0, 0); k1.d = X.window.dist; k1.h = 2 * k1.d * Math.tan(THREE.MathUtils.degToRad(X.window.fov / 2));
    winPos.copy(k1.look).addScaledVector(k1.dir, k1.d);
    const c = new THREE.PerspectiveCamera(); c.position.copy(winPos); c.lookAt(k1.look); winQuat.copy(c.quaternion);
    seatDirect = true; seatTarget = 1;
    document.body.classList.add('is-pov', 'is-seat');
    if (leaveBtn) leaveBtn.textContent = cur.labels.leave;
    host.style.cursor = '';
    if (reduce || now) { setSeat(1); seatAnim = null; return; }
    seatAnim = { from: seatP, to: 1, start: performance.now(), dur: SE.direct.dur };
  }
  function divePose(Cb, p) {
    const X = SE.direct, [k0, k1] = DK;
    let d;
    if (p < X.split) { // 1막: 거리와 화면 높이를 로그로 섞어 줌 속도가 고르게, 창 앞에서 감속
      const u = 1 - Math.pow(1 - p / X.split, 2.2);
      dvL.copy(k0.look).lerp(k1.look, u);
      dvD.copy(k0.dir).lerp(k1.dir, smoother(u)).normalize();
      d = Math.exp(Math.log(k0.d) + (Math.log(k1.d) - Math.log(k0.d)) * u);
      const h = Math.exp(Math.log(k0.h) + (Math.log(k1.h) - Math.log(k0.h)) * u);
      povCam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 2 / d));
      povCam.position.copy(dvL).addScaledVector(dvD, d);
      povCam.up.set(0, 1, 0); povCam.lookAt(dvL);
    } else { // 2막: 창을 지나 좌석으로, 이동이 먼저 시작하고 고개는 조금 늦게 돎
      const u = (p - X.split) / (1 - X.split), um = smoother(clamp01(u / 0.8)), ur = smoother(clamp01((u - 0.3) / 0.7));
      // 창 한가운데(gate)를 정확히 지나는 2차 곡선: 조절점 = 2·gate - (출발+도착)/2
      dvL.copy(Cb.gate).multiplyScalar(2).addScaledVector(winPos, -0.5).addScaledVector(Cb.pos, -0.5);
      const a0 = (1 - um) * (1 - um), a1 = 2 * um * (1 - um), a2 = um * um;
      povCam.position.set(0, 0, 0).addScaledVector(winPos, a0).addScaledVector(dvL, a1).addScaledVector(Cb.pos, a2);
      povCam.quaternion.slerpQuaternions(winQuat, Cb.quat, ur);
      povCam.fov = X.window.fov + (Cb.fov - X.window.fov) * ur;
      d = 1;
    }
    povCam.aspect = VW / VH;
    povCam.near = Math.max(0.04, d - 120); povCam.far = d + 220;
    povCam.updateProjectionMatrix(); povCam.updateMatrixWorld();
    scene.fog.near = d + LK.haze.near * (1 - p) + 30 * p; scene.fog.far = d + LK.haze.far * (1 - p) + 160 * p;
    fitShadow(p, Cb.look);
  }
  function goSeat(to, now) {
    if (seatTarget === to) return;
    if (to === 1) {
      if (viewP < 1 || viewAnim) return;
      if (seatP === 0) { seatFrom.pos.copy(povCam.position); seatFrom.quat.copy(povCam.quaternion); seatFrom.fov = povCam.fov; }
    }
    seatTarget = to;
    document.body.classList.toggle('is-seat', to === 1);
    if (leaveBtn) leaveBtn.textContent = to === 1 ? cur.labels.seatLeave : cur.labels.leave;
    if (reduce || now) { setSeat(to); seatAnim = null; if (to === 0 && seatDirect) { seatDirect = false; document.body.classList.remove('is-pov'); } return; }
    seatAnim = { from: seatP, to, start: performance.now(), dur: (seatDirect ? SE.direct.dur : SE.dur) * Math.max(0.35, Math.abs(to - seatP)) };
  }
  // 손에 든 지도와 휴대폰: 카메라 기준 좌표에서 화면 아래 모서리에 맞춰 놓고, 좌석에 다가가는 끝무렵 아래에서 올라옴
  const heldV = new THREE.Vector3();
  function placeHeld(Cb, p) {
    if (atlasOn) { Cb.phone.visible = false; phoneShade.visible = false; return; } // 입체 지도: 휴대폰은 치우고 지도만
    const t = Math.tan(THREE.MathUtils.degToRad(povCam.fov / 2)), A = povCam.aspect;
    const B = SE.held, H = A < 1 ? { ...B, map: { ...B.map, ...B.narrow.map }, phone: { ...B.phone, ...B.narrow.phone } } : B; // 세로 화면 값으로 덮어씀
    const k = smoother(clamp01((p - heldFrom()) / (1 - heldFrom())));
    Cb.held.position.copy(povCam.position); Cb.held.quaternion.copy(povCam.quaternion);
    { // 종이 지도: 왼쪽 아래에서 화면 너비의 H.map.w만큼. 누르면(atlasLift) 들려서 정면으로 화면을 가득 채움
      const d = H.map.d, Hv = 2 * d * t, Wv = Hv * A, w = H.map.w * Wv, h = w * (1000 / 1400);
      const L = smoother(atlasLift), wf = Math.max(Wv, Hv * 1.4) * 1.12;
      Cb.map.scale.setScalar(w + (wf - w) * L);
      Cb.map.renderOrder = L > 0 ? 30 : 20; // 지도가 들려 올라오는 동안은 휴대폰보다 위에
      Cb.map.position.set((-Wv / 2 + H.map.x * Wv + w / 2) * (1 - L), (-Hv / 2 + h / 2 - H.map.drop * Hv - (1 - k) * Hv * 0.9) * (1 - L), -d);
      Cb.map.rotation.set(H.map.tilt * (1 - L), 0.12 * (1 - L), H.map.roll * (1 - L));
    }
    { // 휴대폰: 오른쪽 아래에서 화면 높이의 H.phone.h만큼. 입체 지도에서는 코스 요약판으로 작아짐
      const P = atlasOn ? { ...H.phone, ...B.atlas, ...(A < 1 ? B.narrow.atlas : {}) } : H.phone;
      const d = P.d, Hv = 2 * d * t, Wv = Hv * A, h = P.h * Hv;
      Cb.phone.scale.setScalar(h / 0.162);
      Cb.phone.position.set(-Wv / 2 + P.x * Wv, -Hv / 2 + h / 2 - P.drop * Hv - (1 - k) * Hv * 0.9, -d);
      Cb.phone.rotation.set(P.tilt, -0.1, P.roll);
    }
  }
  // 좌석 안의 분위기: 앉을수록 실내등이 켜지고 색이 따뜻해지며, 필름 번짐과 흐림이 줄어 또렷해짐 (입체 지도에서는 끔)
  const grade = { hi: new THREE.Vector3(1, 1, 1), sh: new THREE.Vector3(1, 1, 1), sky: new THREE.Color(), ground: new THREE.Color(), hemi: 0.3, exp: 0.86 };
  const WARM = { hi: new THREE.Vector3(1.04, 0.98, 0.9), sh: new THREE.Vector3(1.0, 0.95, 0.9), sky: lin('#FFE3C4'), ground: lin('#8A6A52') };
  function cabinMood() {
    const k = atlasOn ? 0 : smoother(clamp01((seatP - 0.35) / 0.65)), fu = filmMat.uniforms;
    fu.uHal.value = FM.halation * (1 - 0.8 * k); fu.uSoft.value = FM.soft * (1 - 0.8 * k); fu.uCa.value = FM.aberration * (1 - 0.7 * k);
    fu.uHi.value.copy(grade.hi).lerp(WARM.hi, k); fu.uSh.value.copy(grade.sh).lerp(WARM.sh, k);
    const night = window.__tod ? window.__tod.lights : 0;
    // 밤에는 객실을 어둑하게: 실내등과 하늘빛 반사를 낮춰 창밖보다 살짝 밝은 정도의 아늑한 밝기로
    hemi.color.copy(grade.sky).lerp(WARM.sky, 0.75 * k); hemi.groundColor.copy(grade.ground).lerp(WARM.ground, 0.6 * k); hemi.intensity = grade.hemi * (1 + 0.6 * k * (1 - night)) * (1 - 0.45 * k * night);
    fu.uExposure.value = grade.exp * (1 - 0.24 * k * night); // 밤 장면을 밝히려 올린 노출이 객실 벽을 날리지 않게, 좌석 안에서만 낮춤
    for (const L of cabinLights) L.intensity = k * (1.1 - 0.75 * night);
  }
  function setSeat(p) {
    seatP = p;
    cabinMood();
    const w = cur, Cb = w.cabin;
    Cb.group.visible = p > 0;
    // 열차(비행기) 겉면은 카메라가 벽을 지나기 전에 녹아 사라짐
    const [f0, f1] = seatDirect ? SE.direct.fade : [0.3, 0.6], a = 1 - smoother(clamp01((p - f0) / (f1 - f0))), tr = a < 1;
    for (const m of w.moverMats) { if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; }
    w.mover.visible = a > 0;
    if (p > 0 && seatDirect) { divePose(Cb, p); placeHeld(Cb, p); }
    else if (p > 0) {
      povCam.position.lerpVectors(seatFrom.pos, Cb.pos, p);
      povCam.quaternion.slerpQuaternions(seatFrom.quat, Cb.quat, p);
      povCam.fov = seatFrom.fov + (Cb.fov - seatFrom.fov) * p;
      povCam.near = 0.04 + (1 - p) * 0.3; povCam.far = 220;
      povCam.updateProjectionMatrix(); povCam.updateMatrixWorld();
      placeHeld(Cb, p);
    } else setView(viewP);
    Cb.held.visible = p > heldFrom();
    shadowDirty = true; dirty = true;
  }


  // ---------- 입체 지도: 좌석에서 종이 지도를 누르면 들려 올라와 화면을 채우고, 하늘에 뜬 한반도 모형이 솟아오름 (국내만) ----------
  const AT = S.atlas;
  let debugOpen = false, atlasOn = false, atlasBusy = false, liftAnim = null, atlasLift = 0, atlasCourse = [], atlasSaved = null;
  let courseUI = null; // 코스 만들기·내 코스 화면 (course.js)
  const veil = document.getElementById('atlas-veil');
  const mkAtlas = (o) => window.EODI_ATLAS(Object.assign({
    THREE, scene, cam: povCam, host, spec: AT, reduce,
    roundedBox: (w, h, d, r) => MD.roundedBox(w, h, d, r),
    aspect: () => VW / VH,
    fitShadow: (look, p) => { fitShadow(p, look); },
    phoneWorld: (v) => cur.cabin.phone.getWorldPosition(v),
    onCourse: (list) => { atlasCourse = list; refreshPhones(); if (courseUI) courseUI.onPicks(); },
    setLeave: (t) => { if (leaveBtn) leaveBtn.textContent = t; },
  }, o));
  const atlasD = mkAtlas({}); // 국내: 한반도
  let atlas = atlasD; // 지금 보이는 입체 지도 (국내, 세계, 일본 중 하나)
  let atlasW = null, atlasJ = null, courseD = null, courseO = null, overseasP = null; // 해외: 세계 지도에서 일본으로 확대. 무거운 데이터라 해외를 처음 열 때 불러옴

  // 해외 지도 화면 UI: 국내 #atlas-ui를 그대로 복제하고 id 뒤에 접미사 (-w 세계, -j 일본)
  function cloneAtlasUI(suffix) {
    const src = document.getElementById('atlas-ui'), el = src.cloneNode(true);
    el.id += suffix; for (const n of el.querySelectorAll('[id]')) n.id += suffix;
    for (const n of el.querySelectorAll('.atlas-filter, .atlas-filter-pin, .cx-seg--explore')) n.remove(); // 국내 지도가 채운 것은 비움
    for (const n of el.querySelectorAll('.atlas-labels, .atlas-recs-list')) n.innerHTML = '';
    el.setAttribute('aria-label', suffix === '-w' ? '세계 여행 지도' : '일본 여행 지도');
    src.after(el); return el;
  }
  const loadScript = (src) => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  let overseasN = 0; // 받은 데이터 파일 수 (4개)
  function loadOverseas() { // 데이터만 미리 받아 둠 (모형은 처음 열 때 만듦). 실패하면 다음에 다시 받음
    if (!overseasP) {
      overseasN = 0;
      overseasP = Promise.all(['world-mapdata.js', 'world-heightdata.js', 'japan-mapdata.js', 'japan-heightdata.js'].map((f) => loadScript(f).then(() => { overseasN++; })));
      overseasP.catch(() => { overseasP = null; });
    }
    return overseasP;
  }
  const toast = document.createElement('div'); toast.className = 'atlas-toast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast);
  let toastT = 0;
  function showToast(t) { toast.textContent = t; toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 2200); }
  function buildOverseas() {
    if (atlasW) return;
    const G = window.EODI_GEO;
    const uiW = cloneAtlasUI('-w'), uiJ = cloneAtlasUI('-j');
    atlasW = mkAtlas({ spec: G.worldSpec(AT), mapData: G.worldM, heightData: G.worldH, uiSuffix: '-w',
      onRegion: (r, pid) => { if (r.id === 'japan') toJapan(pid); else showToast(`${r.name}은 곧 열려요. 지금은 일본만 코스를 만들 수 있어요`); return false; } });
    atlasJ = mkAtlas({ spec: G.japanSpec(AT), mapData: G.japanM, heightData: G.japanH, uiSuffix: '-j' });
    if (window.EODI_COURSE && window.EODI_COURSE_DATA_JP) {
      courseO = window.EODI_COURSE({ ...companionLink, reduce, data: window.EODI_COURSE_DATA_JP, pois: { all: [], singles: [], clusters: [] }, getAtlas: () => atlas,
        heads: [uiW.querySelector('.atlas-head'), uiJ.querySelector('.atlas-head')],
        ensureMap: () => { if (atlas === atlasW) swapAtlas(atlasJ); }, // 코스 화면은 일본 지도 위에서
        switchMode: (m) => startSwitch(m) });
    }
  }
  function swapAtlas(next) { // 세계와 일본 사이: 담은 곳은 그대로 이어받음
    if (next === atlas) return;
    const ids = atlas.course().map((p) => p.id);
    atlas.exit(); atlas = next; atlas.setCourse(ids);
    atlas.enter(performance.now());
    applyTod();
    if (courseUI && courseUI.onAtlas) courseUI.onAtlas();
    if (params.has('debug')) window.__atlas = atlas;
    shadowDirty = true; dirty = true;
  }
  function toJapan(pid) { // 세계 지도가 일본으로 다가간 뒤 종이색 덮개 아래에서 일본 지도로. 장소를 눌러 왔으면 그 장소를 펼침
    if (atlasBusy || atlas !== atlasW) return;
    atlasBusy = true;
    atlasW.pose({ lat: 37.5, lon: 137.5, dist: 9, pitch: 54 }, reduce ? 0 : 900);
    after(650, () => { veilTo(true, 260); after(260, () => { swapAtlas(atlasJ); if (pid) atlasJ.focusPlace(pid); veilTo(false, AT.veil.out); atlasBusy = false; }); });
  }
  function toWorld() {
    atlasBusy = true; veilTo(true, AT.veil.in);
    after(AT.veil.in, () => { swapAtlas(atlasW); veilTo(false, AT.veil.out); atlasBusy = false; });
  }
  // 종이 위에 놓인 휴대폰의 그림자 (부드러운 사각 그림자 한 장)
  const phoneShade = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
    const c = cv.getContext('2d'); c.filter = 'blur(12px)'; c.fillStyle = 'rgba(20, 45, 70, 0.6)';
    c.beginPath(); c.roundRect(30, 30, 68, 196, 14); c.fill();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    m.renderOrder = 19; m.visible = false; m.frustumCulled = false; scene.add(m);
    return m;
  })();
  const phPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(AT.origin[1] - AT.relief.plinth)), phHit = new THREE.Vector3(), phQ = new THREE.Quaternion(), phE = new THREE.Euler(0, 0, 0, 'YXZ'), phF = new THREE.Vector3(); // 바탕 종이는 받침 두께만큼 낮음
  function placePhoneOnPaper(Cb) { // 화면 오른쪽 아래 지점의 종이 위에 비스듬히 눕혀 놓음. 카메라가 움직여도 화면에서 같은 크기
    const narrow = VW / VH < 1, PH = AT.phone, [nx, ny] = narrow ? PH.narrowAt : PH.at;
    ray.setFromCamera(ndc.set(nx, ny), povCam);
    if (!ray.ray.intersectPlane(phPlane, phHit)) return;
    const d = povCam.position.distanceTo(phHit), sinE = Math.max(0.45, (povCam.position.y - phHit.y) / d);
    const L = (narrow ? PH.narrowSize : PH.size) * 2 * d * Math.tan(THREE.MathUtils.degToRad(povCam.fov / 2)) / sinE, s = L / 0.162;
    povCam.getWorldDirection(phF);
    phE.set(-Math.PI / 2, Math.atan2(-phF.x, -phF.z) + PH.turn, 0, 'YXZ'); phQ.setFromEuler(phE);
    Cb.held.position.set(0, 0, 0); Cb.held.quaternion.identity();
    Cb.phone.scale.setScalar(s); Cb.phone.quaternion.copy(phQ);
    Cb.phone.position.copy(phHit); Cb.phone.position.y += 0.0045 * s;
    phoneShade.quaternion.copy(phQ); phoneShade.scale.set(0.078 * s * 1.9, 0.162 * s * 1.3, 1);
    phoneShade.position.copy(phHit); phoneShade.position.x += 0.012 * s; phoneShade.position.z += 0.014 * s; phoneShade.position.y += 0.001;
    Cb.phone.updateMatrixWorld(true);
  }
  function hitHeldPhone(e) { // 좌석에서 손에 든 휴대폰
    if (atlasOn || atlasBusy || seatP < 1 || seatAnim || seatTarget !== 1 || !companion || companion.isOpen()) return false;
    ndc.set((e.clientX / host.clientWidth) * 2 - 1, -(e.clientY / host.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, povCam);
    return ray.intersectObject(cur.cabin.phone, true).length > 0;
  }
  // ---------- 동반자 앱: 휴대폰을 누르면 3D 휴대폰 자리에서 HTML 휴대폰이 들려 올라옴 (companion.js) ----------
  let companion = null;
  const phV = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function phoneRect() { // 3D 휴대폰의 화면 위 자리: 가운데, 높이, 기울기 (CSS px)
    const ph = cur.cabin.phone, r = host.getBoundingClientRect();
    const sp = (v) => { v.project(povCam); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
    const c = sp(ph.localToWorld(phV[0].set(0, 0, 0))), t = sp(ph.localToWorld(phV[1].set(0, 0.081, 0))), b = sp(ph.localToWorld(phV[2].set(0, -0.081, 0)));
    return { cx: c[0], cy: c[1], h: Math.hypot(t[0] - b[0], t[1] - b[1]), angle: (Math.atan2(t[0] - b[0], b[1] - t[1]) * 180) / Math.PI };
  }
  function openPhone(opts) { // 좌석에서는 모드의 기본 여행, 코스 화면에서는 그 코스 (지도 위 탁자의 휴대폰이 들려 올라옴)
    if (!companion || companion.isOpen()) return;
    host.style.cursor = '';
    companion.open(mode, opts || {});
    requestAnimationFrame(() => { cur.cabin.phone.visible = false; dirty = true; }); // 휴대폰이 손에서 떠난 것처럼
  }
  function hitHeldMap(e) {
    if (atlasOn || atlasBusy || seatP < 1 || seatAnim || seatTarget !== 1) return false;
    ndc.set((e.clientX / host.clientWidth) * 2 - 1, -(e.clientY / host.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, povCam);
    return ray.intersectObject(cur.cabin.map, false).length > 0;
  }
  // 덮개 위 안내: 글자와 진행 막대 (해외 지도를 처음 펼칠 때)
  const veilBox = document.createElement('div'); veilBox.className = 'atlas-veil-msg'; veilBox.setAttribute('role', 'status');
  veilBox.innerHTML = '<p></p><span class="atlas-veil-bar"><i></i></span><small>처음 한 번만 걸려요</small>'; veil.appendChild(veilBox);
  function veilMsg(t, p = 0, err = false) {
    veilBox.classList.toggle('is-on', !!t); veilBox.classList.toggle('is-err', err);
    if (!t) return;
    veilBox.querySelector('p').textContent = t; veilBox.querySelector('i').style.transform = `scaleX(${Math.max(0.04, Math.min(1, p)).toFixed(3)})`;
  }
  const veilTo = (on, ms) => { veil.style.transitionDuration = (reduce ? 0 : ms) + 'ms'; veil.classList.toggle('is-on', on); };
  const after = (ms, fn) => (reduce ? fn() : setTimeout(fn, ms));
  function atlasSwap(on) { // 종이색 덮개 아래에서 장면을 바꿔 끼움
    const Cb = cur.cabin;
    if (on) {
      if (mode === 'overseas') { buildOverseas(); atlas = atlasW; courseUI = courseO; } else { atlas = atlasD; courseUI = courseD; } // 해외는 세계 지도부터
      if (params.has('debug')) window.__atlas = atlas;
      atlasSaved = { fog: [scene.fog.near, scene.fog.far], vis: [gD, gO, interior, Cb.group].map((o) => [o, o.visible]) };
      for (const [o] of atlasSaved.vis) o.visible = false;
      scene.fog.near = 70; scene.fog.far = 260;
      Cb.map.visible = false; atlasOn = true; phoneShade.visible = false;
      applyTod();
      atlas.enter(performance.now());
      if (courseUI) { courseUI.enter(courseStart); courseStart = null; } // 확인용 ?course=mine 처럼 바로 그 화면
      placeHeld(Cb, 1);
    } else {
      if (courseUI) courseUI.exit();
      atlas.exit(); atlasOn = false; phoneShade.visible = false; Cb.phone.visible = true;
      atlas = atlasD; // 좌석에서는 국내 지도의 밤낮 값만 쓰임
      applyTod();
      for (const [o, v] of atlasSaved.vis) o.visible = v;
      [scene.fog.near, scene.fog.far] = atlasSaved.fog;
      Cb.map.visible = true;
      setSeat(1);
      fitShadow(1, seatDirect ? Cb.look : cur.view.look);
      if (leaveBtn) leaveBtn.textContent = seatDirect ? cur.labels.leave : cur.labels.seatLeave;
    }
    refreshPhones();
    shadowDirty = true; dirty = true;
  }
  function openAtlas() {
    atlasBusy = true; host.style.cursor = '';
    liftAnim = { from: 0, to: 1, t0: performance.now(), dur: reduce ? 0 : AT.liftDur, done: () => {
      veilTo(true, AT.veil.in);
      const go = () => { atlasSwap(true); veilMsg(null); veilTo(false, AT.veil.out); atlasBusy = false; };
      after(AT.veil.in, () => {
        if (mode !== 'overseas') { go(); return; }
        // 해외: 데이터가 다 오면 덮개 아래에서 모형을 만듦. 0.3초 넘게 걸리면 덮개 위에 안내와 진행 막대
        const first = !atlasW; let tick = 0;
        const show = setTimeout(() => { const loop = () => { if (!overseasP && !first) return; veilMsg('세계 지도를 펼치는 중', overseasN / 4 * 0.85); tick = requestAnimationFrame(loop); }; loop(); }, reduce ? 0 : 300);
        loadOverseas().then(() => {
          clearTimeout(show); cancelAnimationFrame(tick);
          if (first) veilMsg('세계 지도를 펼치는 중', 1); // 다 받았으면 막대를 채운 뒤, 한 번 그려진 다음에 모형을 만듦 (만드는 동안 화면이 잠깐 멈춤)
          requestAnimationFrame(() => requestAnimationFrame(go));
        }).catch(() => {
          clearTimeout(show); cancelAnimationFrame(tick);
          veilMsg('지도를 불러오지 못했어요. 인터넷을 확인하고 휴대폰 옆 지도를 다시 눌러 주세요', 0, true);
          after(2600, () => { veilMsg(null); veilTo(false, AT.veil.out); liftAnim = { from: 1, to: 0, t0: performance.now(), dur: reduce ? 0 : AT.liftDur, done: () => { atlasBusy = false; } }; });
        });
      });
    } };
  }
  function closeAtlas() {
    atlasBusy = true;
    veilTo(true, AT.veil.in);
    after(AT.veil.in, () => {
      atlasSwap(false); veilTo(false, AT.veil.out);
      liftAnim = { from: 1, to: 0, t0: performance.now() + AT.veil.out * 0.3, dur: reduce ? 0 : AT.liftDur, done: () => { atlasBusy = false; } };
    });
  }
  function closeAtlasNow() { // 국내/해외 전환, R 키: 즉시 좌석 이전 상태로
    liftAnim = null; atlasLift = 0; atlasBusy = false; veilTo(false, 0);
    if (atlasOn) atlasSwap(false);
  }

  // ---------- 시간대: 실제 시각에 맞춰 새벽, 낮, 노을, 블루 아워, 밤 ----------
  const TD = S.timeOfDay;
  const TP = {}; // 단계별 값 (색은 THREE.Color로)
  for (const [k, ph] of Object.entries(TD.phases)) {
    TP[k] = { ...ph, sky: ph.sky.map(lin), deep: lin(ph.deep), cloud: lin(ph.cloud), glow: [lin(ph.glow[0]), ph.glow[1]],
      sun: [ph.sun[0], lin(ph.sun[1]), ph.sun[2]], hemi: [lin(ph.hemi[0]), lin(ph.hemi[1]), ph.hemi[2]] };
  }
  const mixVal = (a, b, t) => (a && a.isColor ? a.clone().lerp(b, t) : Array.isArray(a) ? a.map((x, i) => mixVal(x, b[i], t)) : typeof a === 'number' ? a + (b - a) * t : a);
  const mixPhase = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, mixVal(a[k], b[k], t)]));
  const timeParam = params.get('time'); // 확인용: ?time=21:30
  function localMinutes() {
    const m = /^(\d{1,2}):(\d{2})$/.exec(timeParam || '');
    if (m) return +m[1] * 60 + +m[2];
    const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  }
  function sunTimes() { // 해 뜨고 지는 시각(분): 날짜에 따른 해의 기울기로 낮 길이를 계산
    const d = new Date(), doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    const decl = THREE.MathUtils.degToRad(23.44 * Math.sin((2 * Math.PI * (284 + doy)) / 365)), lat = THREE.MathUtils.degToRad(TD.lat);
    const half = THREE.MathUtils.radToDeg(Math.acos(clamp01((-Math.tan(lat) * Math.tan(decl) + 1) / 2) * 2 - 1)) / 15;
    return { rise: (TD.noon - half) * 60, set: (TD.noon + half) * 60 };
  }
  // 설명 창의 낮·노을·밤 토글로 고정한 시간대: 지금 빛에서 그 단계로 1.2초 동안 부드럽게 넘어감
  let todForce = null, todLastP = null;
  function todNow() {
    if (todForce) {
      const k = smoother(clamp01((performance.now() - todForce.t0) / 1200));
      return { P: k >= 1 ? TP[todForce.name] : mixPhase(todForce.from, TP[todForce.name], k), name: todForce.name, tween: k < 1 };
    }
    const t = localMinutes(), st = sunTimes();
    const keys = TD.keys.map(([ph, ref, off]) => [ph, st[ref] + off]);
    if (t <= keys[0][1] || t >= keys[keys.length - 1][1]) return { P: TP.night, name: 'night' };
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, ta] = keys[i], [b, tb] = keys[i + 1];
      if (t >= ta && t <= tb) { const k = smoother(clamp01((t - ta) / (tb - ta))); return { P: mixPhase(TP[a], TP[b], k), name: k < 0.5 ? a : b }; }
    }
    return { P: TP.day, name: 'day' };
  }
  // 시간대에 따라 밝기가 바뀌는 재질 모으기
  const todMats = { lamp: new Set(), glass: new Set(), accent: new Set(), glowModel: new Set(), edge: new Set() };
  const lampDay = lin(C.headlight), lampNight = lin(TD.lightColor), accentDay = lin(C.accent), accentNight = lin(TD.accentNight);
  scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !m.emissive) continue;
      if (m.userData.accent) todMats.accent.add(m);
      else if (m.name === 'tactile') todMats.edge.add(m); // 승강장 가장자리 점자블록: 밤에 다홍빛 띠
      else if (m.name === 'glass' || (m.color && m.color.equals(lin(C.glass)) && m.roughness < 0.1)) todMats.glass.add(m);
      else if (m.emissive.equals(lampDay) && m.emissiveIntensity < 1) todMats.lamp.add(m);
      else if (m.emissiveMap || m.emissiveIntensity > 1) { m.userData.baseEI = m.emissiveIntensity; todMats.glowModel.add(m); }
    }
  });
  let todScreens = 0, todAt = -1e9, todName = '';
  let todEnvKey = TP.day.sky.map((c) => c.getHexString()).join('') + TP.day.glow[1].toFixed(2); // 처음 구운 환경맵이 낮 값이라 낮이면 다시 굽지 않음
  function applyTod() {
    const real = todNow();
    const { P, name } = atlasOn ? { P: TP.day, name: 'day' } : real; todName = name; todLastP = real.P; // 입체 지도는 낮빛으로 비추고, 밤낮은 지도 색으로 바꿈
    const atlasNight = smoother(clamp01((real.P.lights - 0.3) / 0.5)); // 실제 시각이 저녁·밤일수록 1
    atlas.setNight(atlasNight);
    document.body.classList.toggle('atlas-night', atlasNight > 0.5);
    const L = P.lights;
    DR.G.uDNight.value = smoother(clamp01((L - 0.3) / 0.5)); // 밤: 진주빛을 줄이고 포인트 빛을 키움
    const su = skyMat.uniforms, fu = filmMat.uniforms;
    su.skyTop.value.copy(P.sky[0]); su.skyMid.value.copy(P.sky[1]); su.skyLow.value.copy(P.sky[2]); su.skyHaze.value.copy(P.sky[3]); su.skyDeep.value.copy(P.deep);
    su.cloudTint.value.copy(P.cloud); su.uClouds.value = P.clouds; su.glowC.value.copy(P.glow[0]); su.uGlow.value = P.glow[1]; su.uStars.value = reduce ? P.stars * 0.8 : P.stars;
    skyAt = -1e9;
    fu.uExposure.value = P.exposure; grade.exp = P.exposure; grade.hi.set(...P.highlights); grade.sh.set(...P.shadows); fu.uHi.value.copy(grade.hi); fu.uSh.value.copy(grade.sh);
    sunBase.set(...(atlasOn ? AT.sun : P.sun[0])); sun.color.copy(P.sun[1]); sun.intensity = P.sun[2] * (atlasOn ? 1 - 0.35 * atlasNight : 1); // 입체 지도: 부조를 살리는 낮은 빛 (밤에는 달빛처럼 약하게)
    hemi.color.copy(P.hemi[0]); hemi.groundColor.copy(P.hemi[1]); hemi.intensity = P.hemi[2] * (atlasOn ? AT.hemi : 1);
    grade.sky.copy(hemi.color); grade.ground.copy(hemi.groundColor); grade.hemi = hemi.intensity;
    scene.fog.color.copy(atlasOn ? atlas.fogColor : P.sky[3]); hazeColor.copy(P.sky[2]).multiplyScalar(RS.haze.gain);
    for (const m of todMats.lamp) { m.emissive.copy(lampDay).lerp(lampNight, L); m.emissiveIntensity = 0.6 + 3 * L; }
    for (const m of todMats.glass) { m.emissive.copy(lampNight); m.emissiveIntensity = 0.5 * L; }
    for (const m of todMats.accent) { m.emissive.copy(accentDay).lerp(accentNight, L); m.color.copy(m.emissive); m.emissiveIntensity = 0.9 + 2.6 * L; }
    for (const m of todMats.glowModel) m.emissiveIntensity = m.userData.baseEI * (1 + 1.8 * L);
    for (const m of todMats.edge) { m.emissive.copy(accentNight); m.emissiveIntensity = 0.7 * L; }
    todScreens = smoother(clamp01((L - 0.55) / 0.35));
    for (const w of Object.values(worlds)) { const sc = w.boardFace.userData.screen; if (sc) sc.uniforms.uOn.value = Math.max(todScreens, w === cur ? sc.uniforms.uOn.value : 0); }
    fitShadow(viewP, cur.view.look);
    // 반사 환경은 눈에 띄게 바뀌었을 때만 다시 구움 (구울 때 잠깐 부담)
    const key = P.sky.map((c) => c.getHexString()).join('') + P.glow[1].toFixed(2) + P.lights.toFixed(2);
    if (key !== todEnvKey && !real.tween) { todEnvKey = key; bakeEnv(P); } // 넘어가는 동안에는 굽지 않고 끝에서 한 번
    // 메뉴 덮개와 배경 CSS 색
    const rgb = (c) => { const s = c.clone().convertLinearToSRGB(); return `${Math.round(s.r * 255)} ${Math.round(s.g * 255)} ${Math.round(s.b * 255)}`; };
    const hex = (c) => '#' + c.clone().convertLinearToSRGB().getHexString();
    const rs = document.documentElement.style;
    rs.setProperty('--sky-top', hex(P.sky[0])); rs.setProperty('--sky-mid', hex(P.sky[1])); rs.setProperty('--sky-low', hex(P.sky[2])); rs.setProperty('--haze', hex(P.sky[3]));
    rs.setProperty('--scrim', rgb(P.sky[0])); rs.setProperty('--scrim-deep', rgb(P.deep));
    rs.setProperty('--sunglow', Math.min(1, P.glow[1] / 0.18).toFixed(2));
    rs.setProperty('--view-ink', L > 0.5 ? '#EAF7FF' : 'var(--ink)');
    rs.setProperty('--label-halo', L > 0.5 ? 'rgba(6, 22, 56, 0.92)' : 'rgba(246, 247, 243, 0.95)'); // 지도 이름표 테두리 빛
    document.body.dataset.tod = name;
    window.__tod = { phase: name, lights: L };
    cabinMood(); // 좌석 안이면 실내 분위기를 다시 얹음
    refreshPhones();
    shadowDirty = true; dirty = true;
  }
  applyTod();
  window.__setTod = (name) => { // 'day' | 'sunset' | 'night'
    if (!TP[name]) return;
    todForce = { name, from: todLastP || TP.day, t0: performance.now() };
    const step = () => { applyTod(); if (todNow().tween) requestAnimationFrame(step); else applyTod(); };
    step();
  };

  // ---------- frame ----------
  const perf = (window.__perf = { frames: 0, slow: 0, q: 0 });
  let emaDt = 16.7, prevNow = 0, busy = 0, calm = 0;
  function adapt(now) {
    if (prevNow) emaDt += (Math.min(now - prevNow, 100) - emaDt) * 0.1;
    prevNow = now;
    if (document.hidden || params.has('q')) return; // ?q=로 품질을 고정하면 자동 조절 안 함
    // 움직이는 동안 평균 프레임이 길면 해상도와 그림자 크기를 한 단계 낮춤
    if (emaDt > FRAME_MS * 1.4 && qi < Q.length - 1) { if (++busy > 40) { setQuality(qi + 1); busy = 0; } } else busy = 0; // 평균 38fps 아래가 이어질 때만
  }
  function setQuality(i) {
    qi = i; perf.q = i;
    renderer.setPixelRatio(Q[i].dpr);
    renderer.setSize(VW, VH, false);
    sizeTargets();
    if (sun.shadow.mapSize.x !== Q[i].shadow) {
      sun.shadow.mapSize.set(Q[i].shadow, Q[i].shadow);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    shadowDirty = true; dirty = true; emaDt = 16.7;
  }
  const FRAME_MS = 1000 / LK.fps;
  let lastFrame = 0, shTick = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - lastFrame < FRAME_MS - 2) return; // 초당 LK.fps번까지만 (필름 느낌과 맞고 그래픽 부담이 절반)
    if (companion && companion.isOpen() && !companion.busy()) return; // 동반자 앱이 떠 있으면 뒤 장면은 멈춤: 흐림을 매 프레임 다시 계산하지 않게
    lastFrame = now;
    adapt(now);
    if (!timeParam && now - todAt > 60000) { todAt = now; if (todAt > 1) applyTod(); } // 1분에 한 번 실제 시각을 반영
    if (hoverEv) {
      if (atlasOn) { if (!atlasBusy) host.style.cursor = courseUI && courseUI.ownsMap() ? '' : atlas.hover(hoverEv) ? 'pointer' : ''; }
      else {
        moverHot = !atlasBusy && (hitOverviewMover(hoverEv) || hitMover(hoverEv));
        host.style.cursor = !atlasBusy && (moverHot || hitHeldPhone(hoverEv) || hitHeldMap(hoverEv) || hitStation(hoverEv)) ? 'pointer' : '';
      }
      hoverEv = null;
    }
    // 열차·비행기에 마우스를 올리면 빛줄기가 차체를 훑고 윤곽이 따뜻하게 빛남. 떠나면 빠르게 사라짐
    for (const [o, u] of [[train, hotTrain], [plane, hotPlane]]) {
      const to = moverHot && !atlasOn && cur.mover === o ? 1 : 0;
      if (u.value > 0) { DR.G.uDTime.value = now / 1000; dirty = true; }
      if (u.value === to) continue;
      u.value = reduce || Math.abs(to - u.value) < 0.004 ? to : u.value + (to - u.value) * (to ? 0.07 : 0.14);
      dirty = true;
    }
    let t;
    if (sw) {
      const u = window.__swT !== undefined ? window.__swT : (now - sw.t0) / 1000 / sw.dur;
      if (u < 1) {
        t = sw.from * (1 - easeInOut(clamp01(u))); // 되감기
      } else {
        setWorld(sw.next);
        sw = null;
        start = now;
        t = 0;
      }
    } else {
      t = reduce ? TOTAL : fixedT !== null ? fixedT : (now - start) / 1000;
    }

    // 정차 후 포인터 패럴랙스
    settleV += ((reduce || sw ? 0 : clamp01((t - TOTAL) / 1.2)) - settleV) * 0.06;
    settledAt = !sw && t >= TOTAL ? 1 : 0;
    document.body.classList.toggle('is-settled', settledAt === 1);
    if (settledAt) {
      if (window.__povFixed !== undefined && viewP !== window.__povFixed) { setView(window.__povFixed); dirty = true; }
      if (viewAnim) {
        const q = clamp01((now - viewAnim.start) / viewAnim.dur);
        setView(viewAnim.from + (viewAnim.to - viewAnim.from) * smoother(q));
        dirty = true;
        if (q >= 1) viewAnim = null;
      }
      if (seatAnim) {
        const q = clamp01((now - seatAnim.start) / seatAnim.dur);
        setSeat(seatAnim.from + (seatAnim.to - seatAnim.from) * (seatDirect ? (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q)) * 0.4 + q * 0.6 : smoother(q)));
        if (q >= 1) { seatAnim = null; if (seatP === 0 && seatDirect) { seatDirect = false; document.body.classList.remove('is-pov'); } }
      }
      if (params.has('seat') && viewP === 1 && seatTarget === 0 && !viewAnim) goSeat(1, true); // 확인용: ?t=14&pov=1&seat=1
      if (params.has('atlas') && seatP === 1 && !atlasOn && !atlasBusy && !debugOpen) { debugOpen = true; atlasLift = 1; atlasBusy = true; (mode === 'overseas' ? loadOverseas() : Promise.resolve()).then(() => { atlasBusy = false; atlasSwap(true); if (params.get('atlas') === 'japan' && atlasJ) swapAtlas(atlasJ); }); } // 확인용: ?t=14&pov=1&seat=1&atlas=1
      if (params.has('dive') && !seatDirect && viewP === 0) { goSeatDirect(true); setSeat(parseFloat(params.get('dive'))); } // 확인용: ?t=14&dive=0.5 (직행 중간 장면)
      tickScreen(now);
      if (liftAnim) {
        const q = liftAnim.dur ? clamp01((now - liftAnim.t0) / liftAnim.dur) : 1;
        atlasLift = liftAnim.from + (liftAnim.to - liftAnim.from) * q;
        if (!atlasOn) placeHeld(cur.cabin, 1);
        dirty = true;
        if (q >= 1) { const fn = liftAnim.done; liftAnim = null; fn(); }
      }
      if (atlasOn && atlas.tick(now)) { placeHeld(cur.cabin, 1); dirty = true; shadowDirty = true; }
    }
    pointer.sx += (pointer.x * settleV - pointer.sx) * 0.05;
    pointer.sy += (pointer.y * settleV - pointer.sy) * 0.05;
    if (Math.abs(pointer.sx - lastCx) > 0.0005 || Math.abs(pointer.sy - lastCy) > 0.0005 || Math.abs(settleV - lastSV) > 0.001) {
      lastCx = pointer.sx; lastCy = pointer.sy; lastSV = settleV;
      const dir = camDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -pointer.sx * LK.parallax);
      dir.y += pointer.sy * LK.parallax * 0.8;
      camera.position.copy(target).addScaledVector(dir.normalize(), camDist);
      camera.lookAt(target);
      dirty = true;
    }

    const clamped = Math.min(t, END);
    if (clamped !== lastT) { apply(clamped); dirty = true; lastT = clamped; }
    const drew = dirty;
    if (dirty) {
      dirty = false;
      // 움직이는 동안 그림자는 두 프레임에 한 번만 다시 계산 (멈추면 바로 맞춤)
      const moving = !settledAt || !!viewAnim || !!sw;
      if (shadowDirty && (!moving || ++shTick % 2 === 0)) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; } else renderer.shadowMap.needsUpdate = false;
      renderScene(viewP > 0 || seatP > 0 ? povCam : camera);
      perf.frames++;
      if (shadowDirty) dirty = true; // 이번에 건너뛴 그림자는 다음 프레임에 반드시 맞춤
    } else prevNow = 0; // 그리지 않은 프레임은 측정에서 뺌
    composite(now, drew);
  }

  const qv = params.get('pov');
  if (params.has('q')) setQuality(Math.min(Q.length - 1, +params.get('q') || 0)); // 확인용: ?q=2
  if (qv !== null) { viewTarget = parseFloat(qv) > 0 ? 1 : 0; document.body.classList.toggle('is-pov', viewTarget === 1); window.__povFixed = parseFloat(qv); } // 확인용: ?t=14&pov=0.7
  modeBtns.forEach((b) => b.addEventListener('click', () => { if (navSticky) startSwitch(b.dataset.mode); }));
  const dial = document.querySelector('.dial'); // 다이얼 손잡이를 누르면 반대쪽으로 돌림
  if (dial) dial.addEventListener('click', () => { if (navSticky) startSwitch(mode === 'overseas' ? 'domestic' : 'overseas'); });
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
  resize();
  camera.position.copy(target).addScaledVector(camDir, camDist);
  camera.lookAt(target);
  setWorld(startMode);
  apply(0);
  { // 셰이더를 두 장면 모두 미리 준비해서 첫 장면과 전환에서 멈칫하지 않게
    const warm = [gD, gO, interior, train, plane, worlds.domestic.cabin.group, worlds.overseas.cabin.group];
    const keep = warm.map((o) => o.visible);
    warm.forEach((o) => { o.visible = true; });
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(rtScene); renderer.render(scene, camera); renderer.setRenderTarget(null); // 잘라내기가 들어간 셰이더와 텍스처까지 미리 준비
    shadowDirty = true;
    warm.forEach((o, i) => { o.visible = keep[i]; });
  }
  start = performance.now();
  requestAnimationFrame(frame);
  companion = window.EODI_COMPANION ? window.EODI_COMPANION({ reduce, phoneRect,
    onClose: () => { cur.cabin.phone.visible = true; refreshPhones(); dirty = true; if (courseUI && courseUI.refresh) courseUI.refresh(); }, // 앱에서 바뀐 할 일이 3D 휴대폰 화면에도
    onApply: (tripId, m, w) => { // 투표로 정한 곳을 코스에: 코스 화면이 있으면 그 목록에, 해외 코스 화면이 아직 없으면 원본 데이터에
      const inst = m === 'overseas' ? courseO : courseD;
      if (inst) inst.applyVote(tripId, w.apply, w.name);
      else if (m === 'overseas' && window.EODI_COURSE_APPLY) { const J = window.EODI_COURSE_DATA_JP; window.EODI_COURSE_APPLY(J.COURSES, tripId, w.apply, w.name, { key: J.FLAT.key, stops: J.FLAT.stops }); }
    } }) : null;
  refreshPhones(); // 동반자 앱이 생겼으니 좌석 휴대폰 화면을 앱 홈 모습으로
  const companionLink = { openCompanion: (o) => openPhone(o), companionInfo: (id) => (companion ? companion.info(id) : null) }; // 코스 화면에서 동반자 앱으로
  courseD = courseUI = window.EODI_COURSE ? window.EODI_COURSE(Object.assign({ atlas: atlasD, reduce, switchMode: (m) => startSwitch(m) }, companionLink)) : null;
  if (params.has('debug')) window.__atlas = atlas; // 확인용: 지도 좌표를 꺼내 Figma 시안에 맞출 때
  if (params.has('debug')) { window.__phoneRect = phoneRect; window.__companion = companion; } // 확인용: 좌석 휴대폰의 화면 위 자리, 동반자 앱
  let courseStart = params.get('course'); // 확인용: ?course=mine|empty|edit|alert|city|add|ai-start|ai-gen|ai|ai-city (좌석을 건너뛰고 지도로). 해외는 &mode=overseas
  if (courseStart !== null && courseUI) setTimeout(() => { goSeatDirect(true); (mode === 'overseas' ? loadOverseas() : Promise.resolve()).then(() => atlasSwap(true)); }, 300);
  if (mode === 'overseas') loadOverseas(); // 해외로 시작하면 지도 데이터를 미리 받아 둠

  // R 키로 다시 보기 (작업 확인용)
  // 로고: 어디에 있든(지도, 좌석, 승강장) 종이색 덮개 아래에서 처음의 전체 화면으로 돌아감. 이미 전체 화면이면 그대로
  function goHome() {
    const atHome = !atlasOn && !atlasBusy && seatP === 0 && seatTarget === 0 && !seatAnim && viewP === 0 && viewTarget === 0 && !viewAnim;
    if (atHome) return;
    atlasBusy = true; host.style.cursor = '';
    veilTo(true, AT.veil.in);
    after(AT.veil.in, () => {
      closeAtlasNow();
      seatAnim = null; seatTarget = 0; document.body.classList.remove('is-seat'); if (seatP > 0) setSeat(0); seatDirect = false;
      viewTarget = 0; viewAnim = null; document.body.classList.remove('is-pov'); setView(0);
      fitShadow(0, cur.view.look); shadowDirty = true; dirty = true;
      veilTo(false, AT.veil.out);
    });
  }
  document.querySelector('.logo').addEventListener('click', (e) => { e.preventDefault(); goHome(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') { closeAtlasNow(); seatAnim = null; seatTarget = 0; document.body.classList.remove('is-seat'); if (seatP > 0) setSeat(0); goView(0); viewAnim = null; setView(0); adStart = 0; sw = null; navSticky = false; start = performance.now(); lastT = -1; cur.track.last = -1; cur.riseLast = -1; dirty = true; } });
})();

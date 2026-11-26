// 입체 지도: 탐색(전국 → 지역 확대)과 코스 담기
// 이음매 없는 종이 위에 실제 고도로 만든 한반도 부조가 떠 있음 (참고: rayshader로 만든 부조 지도들)
// 낮은 땅은 코발트, 높을수록 보라와 분홍을 지나 흰 봉우리. 낮게 비치는 빛이 긴 그림자를 만듦
// 장소는 땅에서 솟은 가는 빛기둥이고, 고른 취향에 맞는 곳일수록 높이 솟음
// scene.js가 장면, 원근 카메라, 다시 그리기 신호 등을 ctx로 넘기면 모형과 화면 UI를 만들어 돌려줌
(function () {
  window.EODI_ATLAS = function (ctx) {
    const { THREE, scene, cam, host } = ctx;
    const A = ctx.spec, D = ctx.mapData || MAPDATA, HD = ctx.heightData || HEIGHTDATA; // mapdata.js, heightdata.js의 최상위 const (window 속성이 아님)
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const smoother = (q) => q * q * q * (q * (q * 6 - 15) + 10);
    const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
    const COL = Object.fromEntries(Object.entries(A.colors).map(([k, v]) => [k, lin(v)]));
    const PJ = A.proj || {}; // 기준 위도·경도와 동서 압축 (세계 지도 등 다른 데이터를 쓸 때 설정에서 바꿈. 기본은 한반도)
    const U = A.unit, KX = Math.cos(((PJ.kxLat ?? 37) * Math.PI) / 180), LAT0 = PJ.lat0 ?? 36, LON0 = PJ.lon0 ?? 127.8;
    const toX = (lon) => (lon - LON0) * U * KX, toZ = (lat) => -(lat - LAT0) * U;

    const root = new THREE.Group(); root.name = 'atlas'; root.position.set(...A.origin); root.visible = false; scene.add(root);
    const O = root.position;

    // ---------- 종이 섬유: 확대해도 뭉개지지 않도록 셰이더에서 월드 좌표로 만드는 잔결 ----------
    const GRAIN_FN = `varying vec3 vPaperP; uniform float uGrain;
      float pH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float pN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(pH(i), pH(i + vec2(1, 0)), f.x), mix(pH(i + vec2(0, 1)), pH(i + vec2(1, 1)), f.x), f.y); }
      float paperGrain() { vec2 pq = vPaperP.xz + vPaperP.y * vec2(0.7, 1.3);
        return 0.55 * (pN(pq * vec2(9., 2.2)) * 0.55 + pN(pq * vec2(2.4, 11.)) * 0.45) + 0.35 * (pN(pq * 38.) * 0.6 + pN(pq * 90.) * 0.4) + 0.5 * pN(pq * 0.35) - 0.7; }
    `;
    const GRAIN_V = `#include <project_vertex>
      vPaperP = (modelMatrix * vec4(transformed, 1.)).xyz;`;

    // 밤낮: 재질마다 낮 색과 밤 색을 기억해 두고 setNight(0~1)로 섞음
    const NG = A.night, NIGHT = { mats: [], env: [], n: 0 }; // env: 밤에 하늘 반사를 줄일 재질
    const DAYC = { paper: COL.paper.clone(), plinth: COL.plinth.clone(), mainland: COL.mainland.clone(), shadow: COL.shadow.clone(), ink: lin(A.contour.ink) };
    const NIGHTC = { paper: lin(NG.paper), plinth: lin(NG.plinth), mainland: lin(NG.mainland), shadow: lin(NG.shadow), ink: lin(NG.ink) };
    const fogColor = COL.paper.clone();

    // ---------- 바탕 종이: 화면 끝까지 한 장, 아무것도 인쇄되지 않은 연보랏빛 흰 종이 ----------
    {
      const m = new THREE.MeshStandardMaterial({ color: COL.paper, roughness: 1 });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uGrain = { value: A.grain };
        sh.vertexShader = 'varying vec3 vPaperP;\n' + sh.vertexShader.replace('#include <project_vertex>', GRAIN_V);
        sh.fragmentShader = GRAIN_FN + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= 1. - uGrain * paperGrain();');
      };
      NIGHT.mats.push([m, 'paper']);
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), m);
      sheet.rotation.x = -Math.PI / 2; sheet.position.y = -A.relief.plinth; sheet.receiveShadow = false; root.add(sheet); // 종이는 한 층 아래
    }
    // ---------- 한반도 받침: 해안선 모양 그대로 오린 두꺼운 종이 한 장. 아래 종이보다 한 층 높아 남동쪽으로 그림자가 짐 ----------
    {
      const shapes = D.korea.map((r) => {
        const sh = new THREE.Shape();
        for (let i = 0; i < r.length; i += 2) { const x = toX(r[i] / 100), y = -toZ(r[i + 1] / 100); i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
        return sh;
      });
      const g = new THREE.ExtrudeGeometry(shapes, { depth: A.relief.plinth, bevelEnabled: false, curveSegments: 1 });
      g.rotateX(-Math.PI / 2); g.translate(0, -A.relief.plinth, 0); // 윗면이 y = 0, 아래 종이까지 내려감
      const m = new THREE.MeshStandardMaterial({ color: COL.plinth, roughness: 0.95 });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uGrain = { value: A.grain };
        sh.vertexShader = 'varying vec3 vPaperP;\n' + sh.vertexShader.replace('#include <project_vertex>', GRAIN_V);
        sh.fragmentShader = GRAIN_FN + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= 1. - uGrain * paperGrain();');
      };
      NIGHT.mats.push([m, 'plinth']);
      const plinth = new THREE.Mesh(g, m);
      plinth.castShadow = false; plinth.receiveShadow = true; root.add(plinth); // 바닥 그림자는 아래의 부드러운 그림자 판이 맡음
      // 대륙(중국·러시아·몽골): 바닥과 한반도 사이 높이의 한 층. 지형 없이 러프한 윤곽만
      const mh = A.relief.plinth * A.relief.mainland;
      const mShapes = D.mainland.map((r) => {
        const sh = new THREE.Shape();
        for (let i = 0; i < r.length; i += 2) { const x = toX(r[i] / 100), y = -toZ(r[i + 1] / 100); i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
        return sh;
      });
      const mg = new THREE.ExtrudeGeometry(mShapes, { depth: mh, bevelEnabled: false, curveSegments: 1 });
      mg.rotateX(-Math.PI / 2); mg.translate(0, -A.relief.plinth, 0); // 바닥에서 mh만큼 올라옴
      const mm = m.clone(); mm.color = COL.mainland.clone(); mm.onBeforeCompile = m.onBeforeCompile; NIGHT.mats.push([mm, 'mainland']);
      const mainland = new THREE.Mesh(mg, mm);
      mainland.castShadow = mainland.receiveShadow = false; root.add(mainland);

      // ---------- 부드러운 그림자 (참고: 흰 부조 지도 아래로 넓게 번진 그림자) ----------
      // 그림자 맵의 또렷한 그림자 대신, 해안선 실루엣을 흐리게 번져 빛 반대쪽(남서)으로 밀어 낸 그림자 판을 바닥과 대륙 위에 깜
      const SS = A.softShadow, E = SS.extent, PX = SS.px, ps = PX / (2 * E);
      const sun = new THREE.Vector3(...A.sun).normalize();
      const dir = new THREE.Vector2(-sun.x, -sun.z).normalize(); // 그림자가 밀려나는 쪽 (화면 왼쪽 아래)
      const silhouette = (c, rings, dx, dz) => {
        c.beginPath();
        for (const r of rings) { for (let i = 0; i < r.length; i += 2) { const x = (toX(r[i] / 100) + dx + E) * ps, y = (toZ(r[i + 1] / 100) + dz + E) * ps; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }
        c.fill('evenodd');
      };
      // 한 층의 그림자: 바로 밑의 짙고 좁은 그림자 + 넓고 옅게 퍼지는 그림자
      const drawDrop = (c, rings, h) => {
        for (const [blur, push, a] of SS.layers) {
          c.filter = `blur(${(blur * ps).toFixed(1)}px)`; c.fillStyle = `rgba(255,255,255,${a})`;
          const k = h * push; silhouette(c, rings, dir.x * k, dir.y * k);
        }
        c.filter = 'none';
      };
      const shadowSheet = (draw, y) => {
        const cv = document.createElement('canvas'); cv.width = cv.height = PX;
        const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, PX, PX); c.globalCompositeOperation = 'lighter';
        draw(c);
        const tex = new THREE.CanvasTexture(cv);
        const mat = new THREE.MeshBasicMaterial({ color: COL.shadow.clone(), alphaMap: tex, transparent: true, opacity: SS.strength, depthWrite: false }); NIGHT.mats.push([mat, 'shadow']);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * E, 2 * E), mat);
        mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.renderOrder = 1; root.add(mesh);
      };
      const mainTop = -A.relief.plinth + mh;
      // 바닥: 한반도(높은 층)와 대륙(중간 층)의 그림자
      shadowSheet((c) => { drawDrop(c, D.korea, A.relief.plinth); drawDrop(c, D.mainland, mh); }, -A.relief.plinth + 0.01);
      // 대륙 윗면: 그 위에 떨어지는 한반도 그림자만 (대륙 모양으로 잘라 냄)
      shadowSheet((c) => {
        drawDrop(c, D.korea, A.relief.plinth - mh);
        c.globalCompositeOperation = 'destination-in'; c.fillStyle = '#fff'; silhouette(c, D.mainland, 0, 0);
      }, mainTop + 0.01);

    }

    // ---------- 부조: 고도 격자로 만든 한 덩어리 땅 ----------
    const dec = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const HC = HD.cols, HR = HD.rows, Hq = dec(HD.h), Rq = dec(HD.r);
    { // 격자 잡음을 걷어 산줄기가 부드럽게 이어지도록 땅 칸끼리 3x3 평균을 몇 번
      let src = Float32Array.from(Hq);
      for (let pass = 0; pass < A.relief.smooth; pass++) {
        const dst = new Float32Array(src.length);
        for (let j = 0; j < HR; j++) for (let i = 0; i < HC; i++) {
          const k = j * HC + i; if (!Hq[k]) continue;
          let s = 0, n = 0;
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= HC || jj >= HR) continue;
            const kk = jj * HC + ii; if (Hq[kk]) { s += src[kk]; n++; }
          }
          dst[k] = s / n;
        }
        src = dst;
      }
      for (let k = 0; k < Hq.length; k++) if (Hq[k]) Hq[k] = Math.max(1, Math.round(src[k]));
    }
    const cellLon = (i) => HD.lon[0] + ((i + 0.5) / HC) * (HD.lon[1] - HD.lon[0]);
    const cellLat = (j) => HD.lat[1] - ((j + 0.5) / HR) * (HD.lat[1] - HD.lat[0]);
    const elevT = (q) => (q ? (q - 1) / 254 : 0); // 0~1 (고도의 제곱근 비율)
    const hOf = (q) => (q ? A.relief.base + Math.pow(elevT(q), 1.6) * A.relief.height : 0); // 높은 산이 도드라지도록 한 번 더 휨
    const regions = D.regions.map((r, idx) => ({ ...r, idx, cx: 0, cz: 0, n: 0, top: 0, rad: 0, places: [], label: null }));
    const ramp = A.ramp.map(([t, c]) => [t, lin(c)]);
    const rampAt = (t, out) => {
      let k = 0; while (k < ramp.length - 2 && t > ramp[k + 1][0]) k++;
      const [t0, c0] = ramp[k], [t1, c1] = ramp[k + 1];
      return out.copy(c0).lerp(c1, clamp01((t - t0) / (t1 - t0)));
    };
    const elevM = (q) => elevT(q) * elevT(q) * HD.maxElev; // 격자 값 → 고도(m)
    // 바다까지의 거리(칸): 해안 지형(바다 취향)을 고르는 데 씀
    const coast = new Uint8Array(HC * HR).fill(255);
    {
      let front = [];
      for (let k = 0; k < Hq.length; k++) if (!Hq[k]) { coast[k] = 0; front.push(k); }
      for (let d = 1; d <= 30 && front.length; d++) {
        const next = [];
        for (const k of front) {
          const i = k % HC, j = (k - i) / HC;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= HC || jj >= HR) continue;
            const kk = jj * HC + ii; if (coast[kk] > d) { coast[kk] = d; next.push(kk); }
          }
        }
        front = next;
      }
    }
    let reliefMesh;
    {
      const idx = new Int32Array(HC * HR).fill(-1), pos = [], col = [], reg = [], ele = [], cst = [], c = new THREE.Color();
      for (let j = 0; j < HR; j++) for (let i = 0; i < HC; i++) {
        const k = j * HC + i, q = Hq[k];
        if (!q) continue;
        idx[k] = pos.length / 3;
        const x = toX(cellLon(i)), z = toZ(cellLat(j)), h = hOf(q), r = Rq[k] - 1;
        pos.push(x, h, z); rampAt(elevT(q), c).lerp(COL.paper, A.relief.fade); col.push(c.r, c.g, c.b); reg.push(r + 1); ele.push(elevM(q)); cst.push(coast[k]);
        if (r >= 0) { const R = regions[r]; R.cx += x; R.cz += z; R.n++; R.top = Math.max(R.top, h); }
      }
      for (const R of regions) { R.cx /= R.n || 1; R.cz /= R.n || 1; }
      const cellA = (toX(HD.lon[1]) - toX(HD.lon[0])) / HC * ((toZ(HD.lat[0]) - toZ(HD.lat[1])) / HR);
      for (const R of regions) R.rad = Math.sqrt((R.n * cellA) / Math.PI) * 1.25; // 면적으로 정한 크기 (멀리 떨어진 섬에 끌려가지 않게)
      const tri = [];
      for (let j = 0; j < HR - 1; j++) for (let i = 0; i < HC - 1; i++) {
        const a = idx[j * HC + i], b = idx[j * HC + i + 1], cc = idx[(j + 1) * HC + i], d = idx[(j + 1) * HC + i + 1];
        if (a >= 0 && cc >= 0 && b >= 0) tri.push(a, cc, b);
        if (b >= 0 && cc >= 0 && d >= 0) tri.push(b, cc, d);
        else if (a >= 0 && cc >= 0 && d >= 0 && b < 0) tri.push(a, cc, d);
        if (a >= 0 && b >= 0 && d >= 0 && cc < 0) tri.push(a, d, b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('aR', new THREE.Float32BufferAttribute(reg, 1));
      g.setAttribute('aE', new THREE.Float32BufferAttribute(ele, 1));
      g.setAttribute('aC', new THREE.Float32BufferAttribute(cst, 1));
      g.setIndex(tri); g.computeVertexNormals();
      reliefMesh = new THREE.Mesh(g);
    }
    // 셰이더 값: 지역별 들림과 흐림, 솟아오르는 물결, 강조(산이 늘어나듯 솟음과 등고선 글로우)
    const CT = A.contour, HL = A.highlight;
    const RU = {
      uLift: { value: new Array(10).fill(0) }, uDim: { value: new Array(10).fill(0) },
      uRiseT: { value: 1 }, uZr: { value: new THREE.Vector2(toZ(PJ.riseLat ? PJ.riseLat[0] : 33), toZ(PJ.riseLat ? PJ.riseLat[1] : 43)) }, uPaper: { value: COL.paper.clone() }, uGrain: { value: A.grain * 0.6 },
      uHiR: { value: new Array(10).fill(0) }, uHiF: { value: 0 }, uMode: { value: 0 },
      uPts: { value: Array.from({ length: 32 }, () => new THREE.Vector4()) },
      uPull: { value: 1 }, uAny: { value: 0 }, uInt: { value: CT.interval }, uLiftH: { value: HL.lift }, uStretch: { value: HL.stretch },
      uNight: { value: 0 }, uTint: { value: new THREE.Vector3(...NG.tint) }, uLamp: { value: lin(NG.lamp) }, uLampHot: { value: lin(NG.lampHot) }, uWin: { value: NG.windows },
      uInk: { value: lin(CT.ink) }, uInkA: { value: CT.alpha }, uGlowA: { value: lin(HL.glow[0]) }, uGlowB: { value: lin(HL.glow[1]) }, uCore: { value: lin(HL.core) },
    };
    // 강조 정도(w): 고른 지역, 또는 취향별 지형(바다 = 해안 저지대, 자연 = 산지, 미식·역사 = 그 장소들 둘레)
    // 강조된 땅은 고무처럼 위로 늘어나며 솟음: 높은 곳일수록 더 많이 올라가 등고선 사이가 벌어지고, 살짝 넘쳤다 자리 잡음 (uPull, 스프링)
    const RISE_HEAD = `attribute float aR, aE, aC;
      uniform float uLift[10], uHiR[10], uRiseT, uHiF, uMode, uPull, uLiftH, uStretch; uniform vec2 uZr; uniform vec4 uPts[32];
      varying float vE, vW;
`;
    const RISE_V = `#include <begin_vertex>
      int ri = int(aR + .5);
      float hiF = 0.;
      if (uMode > .5 && uMode < 1.5) hiF = (1. - smoothstep(3., 8., aC)) * (1. - smoothstep(120., 380., aE));
      else if (uMode > 1.5 && uMode < 2.5) hiF = smoothstep(300., 650., aE);
      else if (uMode > 2.5) { for (int k = 0; k < 32; k++) { vec4 P = uPts[k]; if (P.w < .5) continue; hiF = max(hiF, 1. - smoothstep(P.z * .5, P.z, distance(position.xz, P.xy))); } }
      float w = max(uHiR[ri], hiF * uHiF * step(.5, aR)); // 북한은 고를 수 없어 강조하지 않음
      transformed.y += w * uPull * (transformed.y * uStretch + uLiftH);
      vE = aE; vW = w * clamp(uPull, 0., 1.);
      float wv = clamp((position.z - uZr.x) / (uZr.y - uZr.x), 0., 1.); // 남쪽(0)에서 북쪽(1)으로
      float rs = clamp((uRiseT - wv * .45) / .55, 0., 1.); rs = rs * rs * (3. - 2. * rs);
      transformed.y = (transformed.y + uLift[ri]) * mix(.02, 1., rs);`;
    {
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, RU);
        sh.vertexShader = RISE_HEAD + 'uniform float uDim[10]; varying float vDim; varying vec3 vPaperP;\n' + sh.vertexShader
          .replace('#include <begin_vertex>', RISE_V + '\n vDim = uDim[ri];').replace('#include <project_vertex>', GRAIN_V);
        sh.fragmentShader = `varying float vDim, vE, vW; uniform vec3 uPaper, uInk, uGlowA, uGlowB, uCore, uTint; uniform float uInt, uInkA, uAny, uNight;\n` + GRAIN_FN + sh.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
            diffuseColor.rgb *= mix(vec3(1.), uTint, uNight);           // 밤: 남보라로 가라앉음
            diffuseColor.rgb = mix(diffuseColor.rgb, uPaper, vDim); // 고르지 않은 지역은 종이색으로 바램
            diffuseColor.rgb *= 1. - uGrain * paperGrain();`)
          .replace('#include <output_fragment>', `#include <output_fragment>
            // 등고선: 고도 uInt마다 아주 얇은 검은 선. 화면 픽셀 기준이라 확대해도 같은 굵기
            // 선 사이가 좁아지면(멀리서, 가파른 산 윗부분) 100m 선은 일찍 사라지고 500m 선만 남아 뭉치지 않음
            float lE = vE / uInt, fw = max(fwidth(lE), 1e-4);
            float dl = abs(fract(lE - .5) - .5) / fw;
            float lM = lE / 5., fM = max(fwidth(lM), 1e-4), dM = abs(fract(lM - .5) - .5) / fM;
            float minor = (1. - smoothstep(.1, .34, fw)) * (1. - smoothstep(.05, .8, dl));
            float major = (1. - smoothstep(.16, .5, fM)) * (1. - smoothstep(.2, 1.05, dM));
            float ln = max(minor * .7, major) * step(.5, lE);
            float dn = min(dl + (1. - step(.001, minor)) * 99., dM + (1. - step(.001, major)) * 99.); // 보이는 선까지의 거리(픽셀)
            float hl = vW;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, ln * uInkA * (1. - vDim * .65) * (1. - hl) * (1. - uAny * .45 * (1. - hl)));
            // 강조된 땅: 바닥을 조금 가라앉히고, 등고선은 따뜻한 흰 심선 + 넓고 부드러운 주황 번짐 (빛나는 경로선처럼)
            vec3 bl = mix(uGlowA, uGlowB, clamp(vE / 1600., 0., 1.));
            gl_FragColor.rgb *= 1. - .24 * hl;
            float halo = exp(-dn * .1) * hl;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, bl, clamp(halo * .62, 0., 1.)); // 파랑과 더하면 분홍으로 섞이므로 주황으로 덮어 번지게
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uCore, ln * hl * .95);
            gl_FragColor.rgb += bl * (halo * .25 + ln * hl * .35);`);
      };
      reliefMesh.material = m; NIGHT.env.push(m);
      const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); // 그림자도 같은 높이로
      dm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, RU); sh.vertexShader = RISE_HEAD + sh.vertexShader.replace('#include <begin_vertex>', RISE_V); };
      reliefMesh.customDepthMaterial = dm;
      reliefMesh.castShadow = reliefMesh.receiveShadow = true; reliefMesh.frustumCulled = false;
      root.add(reliefMesh);
    }
    const cellAt = (x, z) => { // 월드 좌표 → 격자 칸
      const lon = x / (U * KX) + LON0, lat = -z / U + LAT0;
      const i = Math.floor(((lon - HD.lon[0]) / (HD.lon[1] - HD.lon[0])) * HC), j = Math.floor(((HD.lat[1] - lat) / (HD.lat[1] - HD.lat[0])) * HR);
      return i < 0 || j < 0 || i >= HC || j >= HR ? -1 : j * HC + i;
    };
    const groundAt = (x, z) => { // 그 자리 땅 높이 (해안 장소는 둘레에서 가장 높은 땅)
      let best = 0;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const k = cellAt(x + di * 0.03, z + dj * 0.03); if (k >= 0) best = Math.max(best, hOf(Hq[k])); }
      return best;
    };


    // ---------- 도시: 산맥 대신 건물로 채운 땅 (참고: 블록 단위로 쌓은 3D 도시 지도) ----------
    // 실제 도시 위치와 인구로 밀도 지도를 만들고, 격자 자리마다 밀도만큼 건물을 세움. 대도시는 빽빽하고 높게, 시골은 드문드문 낮게
    // 색도 지형과 같은 순서: 낮은 건물은 코발트, 높은 탑일수록 보라·분홍을 지나 흰 꼭대기
    const CI = A.city;
    let city = null;
    {
      let seed = 20261119; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const towns = CI.cities.map(([name, lat, lon, pop]) => ({ x: toX(lon), z: toZ(lat), pop: pop / 1000, r: CI.reach * Math.sqrt(pop / 1000) + CI.reach * 0.5, ang: rnd() * Math.PI }));
      const density = (x, z) => {
        let s = 0, best = 0, ang = 0;
        for (const t of towns) { const d2 = ((x - t.x) ** 2 + (z - t.z) ** 2) / (t.r * t.r); if (d2 > 9) continue; const v = t.pop * Math.exp(-d2); s += v; if (v > best) { best = v; ang = t.ang; } }
        return [1 - Math.exp(-s * CI.gain), ang];
      };
      const at = [], col = [], reg = [], ele = [], cst = [], c = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), sc = new THREE.Vector3(), tr = new THREE.Vector3();
      const S = CI.spacing, x0 = toX(HD.lon[0]), x1 = toX(HD.lon[1]), z0 = toZ(HD.lat[1]), z1 = toZ(HD.lat[0]);
      for (let z = z0; z < z1; z += S) for (let x = x0; x < x1; x += S) {
        const k = cellAt(x, z); if (k < 0 || !Hq[k]) continue;
        const [dn, ang] = density(x, z), e = elevM(Hq[k]);
        const p = dn > 0.04 ? dn : CI.rural * (e > 450 ? CI.highland : 1); // 시골은 드물게, 높은 산에는 거의 없음
        if (rnd() > p) continue;
        const n = dn > CI.subFrom ? 4 : 1, sub = n > 1 ? S / 2 : S; // 도시는 한 자리를 네 블록으로 나눔
        for (let b = 0; b < n; b++) {
          if (n > 1 && rnd() > 0.35 + dn * 0.65) continue;
          const bx = x + (n > 1 ? ((b % 2) - 0.5) * sub : 0) + (rnd() - 0.5) * sub * 0.12, bz = z + (n > 1 ? (Math.floor(b / 2) - 0.5) * sub : 0) + (rnd() - 0.5) * sub * 0.12;
          const kk = cellAt(bx, bz); if (kk < 0 || !Hq[kk]) continue;
          const tall = dn > 0.04 ? CI.base + Math.pow(dn, 1.7) * CI.tall * (0.1 + 0.9 * Math.pow(rnd(), 4.2)) : CI.base * (0.45 + rnd() * 0.5); // 시골은 낮은 집
          const w = sub * (dn > 0.04 ? 0.7 + rnd() * 0.22 : 0.34 + rnd() * 0.18), d = w * (0.75 + rnd() * 0.5);
          const g = hOf(Hq[kk]);
          e3.set(0, ang + (rnd() < 0.15 ? Math.PI / 4 : 0), 0); q.setFromEuler(e3);
          m.compose(tr.set(bx, g, bz), q, sc.set(w, tall, d)); at.push(m.clone());
          rampAt(Math.min(1, Math.sqrt(tall / (CI.base + CI.tall)) * 1.15), c); col.push(c.r, c.g, c.b);
          reg.push(Rq[kk]); ele.push(elevM(Hq[kk])); cst.push(coast[kk]);
        }
      }
      const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
      const geo = new THREE.InstancedBufferGeometry().copy(box);
      geo.setAttribute('aR', new THREE.InstancedBufferAttribute(new Float32Array(reg), 1));
      geo.setAttribute('aE', new THREE.InstancedBufferAttribute(new Float32Array(ele), 1));
      geo.setAttribute('aC', new THREE.InstancedBufferAttribute(new Float32Array(cst), 1));
      city = new THREE.InstancedMesh(geo, null, at.length);
      at.forEach((mm, i) => city.setMatrixAt(i, mm));
      city.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(col), 3);
      city.castShadow = city.receiveShadow = true; city.frustumCulled = false;
      root.add(city);
    }


    {
      // 건물 한 채의 아래쪽(터) 높이는 instanceMatrix의 이동값, 높이는 세로 크기. 지형과 같은 강조 규칙을 따름
      const BLD_V = `#include <begin_vertex>
        int ri = int(aR + .5);
        vec2 ixz = instanceMatrix[3].xz;
        float hiF = 0.;
        if (uMode > .5 && uMode < 1.5) hiF = (1. - smoothstep(3., 8., aC)) * (1. - smoothstep(120., 380., aE));
        else if (uMode > 1.5 && uMode < 2.5) hiF = smoothstep(300., 650., aE);
        else if (uMode > 2.5) { for (int k = 0; k < 32; k++) { vec4 P = uPts[k]; if (P.w < .5) continue; hiF = max(hiF, 1. - smoothstep(P.z * .5, P.z, distance(ixz, P.xy))); } }
        float w = max(uHiR[ri], hiF * uHiF * step(.5, aR));
        float ty = instanceMatrix[3].y, sy = length(instanceMatrix[1].xyz);
        float hgt = sy * transformed.y;
        float ny = ty + w * uPull * (ty * uStretch + uLiftH) + hgt * (1. + w * uPull * uTall) + uLift[ri];
        float wv = clamp((ixz.y - uZr.x) / (uZr.y - uZr.x), 0., 1.);
        float rs = clamp((uRiseT - wv * .45) / .55, 0., 1.); rs = rs * rs * (3. - 2. * rs);
        ny *= mix(.02, 1., rs);
        transformed.y = (ny - ty) / max(sy, 1e-5);
        vW = w * clamp(uPull, 0., 1.); vLY = position.y; vTop = step(.5, normal.y);
        vFace = (abs(normal.x) > .5 ? position.z : position.x) + .5; vFloors = max(2., sy / .009); vSeed = float(gl_InstanceID) * .6180339;`;
      const BLD_HEAD = `attribute float aR, aE, aC;
        uniform float uLift[10], uHiR[10], uRiseT, uHiF, uMode, uPull, uLiftH, uStretch, uTall; uniform vec2 uZr; uniform vec4 uPts[32];
        varying float vW, vLY, vTop, vFace, vFloors, vSeed;
`;
      RU.uTall = { value: CI.hiTall };
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0 });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, RU);
        sh.vertexShader = BLD_HEAD + 'uniform float uDim[10]; varying float vDim;\n' + sh.vertexShader.replace('#include <begin_vertex>', BLD_V + '\n vDim = uDim[ri];');
        sh.fragmentShader = 'varying float vW, vLY, vTop, vDim, vFace, vFloors, vSeed; uniform vec3 uPaper, uGlowA, uGlowB, uCore, uTint, uLamp, uLampHot; uniform float uAny, uNight, uWin;\n' + sh.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
            diffuseColor.rgb *= mix(.62, 1.04, vLY);                       // 아래는 어둡고 위로 갈수록 밝게
            diffuseColor.rgb *= mix(vec3(1.), uTint * .7, uNight);         // 밤: 몸통은 어둡게
            diffuseColor.rgb = mix(diffuseColor.rgb, uPaper, vDim * .85 + uAny * .35 * (1. - vW)); // 고르지 않은 곳은 종이색으로`)
          .replace('#include <output_fragment>', `#include <output_fragment>
            vec3 bl = mix(uGlowA, uGlowB, vLY);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, bl, vW * (.08 + .62 * vLY * vLY)); // 강조: 아래는 원래 색, 위로 갈수록 주황 빛
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uCore, vW * vTop * .85);    // 지붕은 따뜻한 크림색 (빛나는 심선처럼)
            gl_FragColor.rgb += bl * vW * vLY * .18;
            // 밤: 옆면에 층마다 창, 일부만 불이 켜짐 (대부분 하늘색, 가끔 다홍). 지붕은 아주 옅게
            // 큰 창: 면마다 가로 2칸 x 세로 3칸, 그중 몇 칸만 불이 켜져 건물마다 두세 개의 큰 불빛. 가장자리는 부드럽게 번짐
            vec2 wuv = vec2(vFace * 2., vLY * 3.), cl = floor(wuv), fw2 = fract(wuv) - .5;
            float box = max(abs(fw2.x) / .36, abs(fw2.y) / .32);
            float win = 1. - smoothstep(.82, 1., box), halo = (1. - smoothstep(.9, 1.7, box)) * .35;
            float rnd = fract(sin(dot(cl + vSeed * 3.7, vec2(12.9898, 78.233))) * 43758.5453);
            vec3 wc = mix(uLamp, uLampHot, step(.82, fract(rnd * 7.31)));
            gl_FragColor.rgb += wc * (win * 1.6 + halo) * step(1. - uWin, rnd) * (1. - vTop) * uNight;
            gl_FragColor.rgb += uLamp * vTop * uNight * .05;`);
      };
      city.material = m; NIGHT.env.push(m);
      const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      dm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, RU); sh.vertexShader = BLD_HEAD + sh.vertexShader.replace('#include <begin_vertex>', BLD_V); };
      city.customDepthMaterial = dm;
    }

    // ---------- 장소: 땅 위의 점, 점에서 위로 뻗은 가는 선, 그 끝의 이름 ----------
    const places = A.places.map((p) => {
      const x = toX(p.lon), z = toZ(p.lat), ri = regions.findIndex((r) => r.id === p.region);
      const P = { ...p, x, z, ri, s: 0, show: false, label: null };
      if (ri >= 0) regions[ri].places.push(P);
      return P;
    });
    const byId = Object.fromEntries(places.map((p) => [p.id, p]));
    const hiAt = (p, g) => { // 강조로 솟은 만큼 (셰이더 계산을 장소 한 점에 대해 대략 따라 함)
      const w = Math.max(RU.uHiR.value[p.ri + 1] || 0, RU.uMode.value && match(p) ? RU.uHiF.value : 0);
      return w * RU.uPull.value * (g * HL.stretch + HL.lift);
    };
    const headY = (p) => { const g = groundAt(p.x, p.z); return (g + (RU.uLift.value[p.ri + 1] || 0) + hiAt(p, g)) * riseNow + 0.02; }; // 땅 위 점의 높이

    // ---------- 상태 ----------
    let level = 'national', sel = -1, hover = -1, filter = 0, placeSel = null, riseT0 = 0, lastNow = 0, riseNow = 1, changed = false;
    const course = [];
    const liftT = new Array(10).fill(0), dimT = new Array(10).fill(0), hiRT = new Array(10).fill(0);
    let hiFT = 0, pullT0 = 0, hiSig = '';
    const MODE = { '바다': 1, '자연': 2, '미식': 3, '역사': 3 };
    const match = (p) => filter === 0 || p.tags.includes(A.filters[filter]);
    function retarget() {
      for (let k = 0; k < 10; k++) {
        const r = k - 1; // 0번은 북한·없음
        liftT[k] = level === 'national' && r >= 0 && r === hover ? A.relief.hoverLift : 0;
        dimT[k] = r < 0 ? A.relief.northDim : level === 'region' && r !== sel ? A.relief.otherDim : 0;
        hiRT[k] = level === 'region' && r === sel ? 1 : 0;
      }
      // 취향 강조: 바다는 해안 저지대, 자연은 산지, 미식·역사는 그 장소들 둘레
      const tag = A.filters[filter], mode = filter ? MODE[tag] || 0 : 0;
      RU.uMode.value = mode; hiFT = mode ? 1 : 0;
      let n = 0;
      for (const v of RU.uPts.value) v.set(0, 0, 0, 0);
      if (mode === 3) for (const p of places) if (p.tags.includes(tag) && n < 32) RU.uPts.value[n++].set(p.x, p.z, HL.radius, 1);
      const sig = level + sel + ':' + filter; // 강조 대상이 바뀌면 처음부터 다시 솟음
      if (sig !== hiSig) { hiSig = sig; if (mode || level === 'region') pullT0 = performance.now(); }
      for (const p of places) p.show = level === 'region' && (p.ri === sel || course.includes(p.id)); // 점은 지역을 자세히 볼 때만
      changed = true;
    }

    // ---------- 카메라 ----------
    const mkPose = (x, z, dist, pitchDeg, yawDeg = 0, y = 0) => ({ look: new THREE.Vector3(x, y, z), dist, pitch: THREE.MathUtils.degToRad(pitchDeg), yaw: THREE.MathUtils.degToRad(yawDeg) });
    const NAT = () => mkPose(toX(A.national.lon), toZ(A.national.lat), A.national.dist, A.national.pitch, A.national.yaw);
    const camP = NAT();
    let camAnim = null;
    const lookW = new THREE.Vector3();
    function applyCam(P) {
      const cp = Math.cos(P.pitch), dist = P.dist * Math.max(1, 0.82 / ctx.aspect()); // 세로 화면에서는 뒤로 물러나 지도가 다 들어오게
      cam.position.set(O.x + P.look.x + Math.sin(P.yaw) * cp * dist, O.y + P.look.y + Math.sin(P.pitch) * dist, O.z + P.look.z + Math.cos(P.yaw) * cp * dist);
      lookW.copy(P.look).add(O);
      cam.up.set(0, 1, 0); cam.lookAt(lookW);
      cam.fov = A.fov; cam.aspect = ctx.aspect(); cam.near = 0.1; cam.far = 400; // 종이 위 휴대폰이 잘리지 않게
      cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    function moveCam(to, dur, now) {
      if (ctx.reduce || !dur) { Object.assign(camP, { look: to.look.clone(), dist: to.dist, pitch: to.pitch, yaw: to.yaw }); camAnim = null; applyCam(camP); changed = true; return; }
      camAnim = { from: { look: camP.look.clone(), dist: camP.dist, pitch: camP.pitch, yaw: camP.yaw }, to, t0: now, dur };
    }

    // ---------- 코스 선 ----------
    const lineGroup = new THREE.Group(); root.add(lineGroup);
    const lineMat = new THREE.MeshStandardMaterial({ color: COL.course, emissive: COL.course, emissiveIntensity: 0.4, roughness: 0.5 });
    let lineSig = '';
    function rebuildLines() {
      const pts = course.map((id) => byId[id]).filter((p) => p.s > 0.5);
      const sig = pts.map((p) => p.id + ':' + headY(p).toFixed(2)).join('|');
      if (sig === lineSig) return;
      lineSig = sig;
      for (const m of lineGroup.children.splice(0)) m.geometry.dispose();
      for (let k = 1; k < pts.length; k++) {
        const a = new THREE.Vector3(pts[k - 1].x, headY(pts[k - 1]), pts[k - 1].z), b = new THREE.Vector3(pts[k].x, headY(pts[k]), pts[k].z);
        const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + 0.25 + a.distanceTo(b) * 0.2;
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 48, 0.022, 8, false), lineMat);
        m.castShadow = true; lineGroup.add(m);
      }
      changed = true;
    }

    // ---------- 담을 때 휴대폰으로 날아가는 점 ----------
    const flyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), new THREE.MeshBasicMaterial({ color: COL.course, depthTest: false }));
    flyMesh.renderOrder = 30; flyMesh.visible = false; scene.add(flyMesh);
    let fly = null;
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vM = new THREE.Vector3();

    // ---------- 화면 UI ----------
    const $ = (id) => document.getElementById(id + (ctx.uiSuffix || '')); // 지도를 여러 벌 띄울 때(국내·세계·일본) 화면 UI도 한 벌씩: id 뒤에 접미사
    const ui = $('atlas-ui'), crumb = $('atlas-crumb'), sub = $('atlas-sub'), filtersEl = $('atlas-filters'), labelsEl = $('atlas-labels');
    const panel = $('atlas-place'), pRegion = $('atlas-place-region'), pName = $('atlas-place-name'), pLine = $('atlas-place-line'), pMeta = $('atlas-place-meta'), pAdd = $('atlas-place-add');
    A.filters.forEach((f, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'atlas-filter'; b.textContent = f;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === 0);
      b.addEventListener('click', () => setFilter(i));
      filtersEl.appendChild(b);
    });
    // 지시선 이름표: 점에서 가는 선이 옆으로 나가고 끝에 글자 (참고 지도의 MOUNT FUJI 표기처럼)
    const mkLead = (cls, name, note) => {
      const el = document.createElement('div'); el.className = 'atlas-lead ' + cls;
      el.innerHTML = '<span class="atlas-lead-dot"></span><span class="atlas-lead-line"></span><span class="atlas-lead-text"><span class="atlas-lead-name"></span><span class="atlas-lead-note"></span></span>';
      el.querySelector('.atlas-lead-name').textContent = name; el.querySelector('.atlas-lead-note').textContent = note || '';
      labelsEl.appendChild(el); return el;
    };
    for (const r of regions) { r.label = mkLead('atlas-lead--region', r.name, ''); r.left = r.side ? r.side === 'l' : r.cx < toX(A.labelSplit); r.label.classList.toggle('is-left', r.left); } // side: 데이터에서 이름표 방향을 정할 수 있음
    const LE = A.labelEdges || [125.6, 129.7, 36.2];
    const edgeW = toX(LE[0]), edgeE = toX(LE[1]), edgeZ = toZ(LE[2]); // 이름표 세로줄 기준 (기본: 남한의 서쪽, 동쪽 끝)
    const peaks = A.peaks.map(([name, lat, lon]) => { const x = toX(lon), z = toZ(lat); return { x, z, y: groundAt(x, z), el: mkLead('atlas-lead--peak', name, '') }; });
    A.peaks.forEach(([, , , m], k) => { peaks[k].el.querySelector('.atlas-lead-note').textContent = m; });
    for (const p of places) {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'atlas-pin';
      el.innerHTML = '<span class="atlas-pin-dot"></span><span class="atlas-pin-line"></span>';
      el.setAttribute('aria-label', p.name); el.tabIndex = -1;
      const pick = () => { if (level === 'national' && goRegion(p.ri, undefined, p.id) === false) return; selectPlace(p.id); };
      el.addEventListener('click', pick);
      labelsEl.appendChild(el); p.label = el;
      const tag = document.createElement('button'); tag.type = 'button'; tag.className = 'atlas-pin-tag'; tag.textContent = p.name;
      tag.addEventListener('click', pick); p.tag = tag;
    }
    // 장소 이름은 모든 점과 선보다 위 층에: 다른 장소의 점이 글자를 가리지 않게
    const tagLayer = document.createElement('div'); tagLayer.className = 'atlas-tags'; labelsEl.appendChild(tagLayer);
    for (const p of places) tagLayer.appendChild(p.tag);
    $('atlas-place-close').addEventListener('click', () => selectPlace(null));
    pAdd.addEventListener('click', () => { if (placeSel) toggleCourse(placeSel); });
    function updateCrumb() {
      if (level === 'national') {
        crumb.textContent = '';
        sub.textContent = A.subNational || '';
        ctx.setLeave(A.leaveNational || '좌석으로');
      } else {
        crumb.textContent = regions[sel].name; // 헤더 가운데에는 지금 보는 지역 이름만
        sub.textContent = '장소를 눌러 코스에 담아 보세요';
        ctx.setLeave(A.leaveRegion || '전국 보기');
      }
    }
    // 취향 버튼마다 추천: 전체는 이번 시즌 고른 곳, 나머지는 그 취향의 축제를 먼저, 이어서 관광지
    const recsTitle = $('atlas-recs-title'), recsList = $('atlas-recs-list');
    const recsEnd = () => recsList.classList.toggle('is-end', recsList.scrollTop + recsList.clientHeight >= recsList.scrollHeight - 4);
    recsList.addEventListener('scroll', recsEnd, { passive: true });
    function updateRecs(fresh) {
      const tag = A.filters[filter];
      const eventsFirst = (a, b) => (b.kind === 'event') - (a.kind === 'event');
      const inRegion = level === 'region' && sel >= 0;
      // 지역을 자세히 볼 때는 그 지역 장소만 (취향을 골랐으면 그 취향만), 전국에서는 이번 시즌 추천이나 취향별 추천
      const items = inRegion ? places.filter((p) => p.ri === sel && (filter === 0 || p.tags.includes(tag))).sort(eventsFirst)
        : filter === 0 ? A.picks.map((id) => byId[id]).filter(Boolean)
        : places.filter((p) => p.tags.includes(tag)).sort(eventsFirst).slice(0, A.recs);
      recsTitle.textContent = inRegion ? `${regions[sel].name}${filter ? ` · ${tag}` : ''}` : filter === 0 ? '이번 시즌 추천' : `${tag} 추천`;
      const sig = (inRegion ? sel : 'n') + ':' + filter;
      if (fresh || recsList.dataset.sig !== sig) {
        recsList.dataset.sig = sig;
        recsList.innerHTML = '';
        if (!items.length) { const li = document.createElement('li'); li.className = 'atlas-recs-empty'; li.textContent = `이 지역에는 아직 ${tag} 추천이 없어요. 다른 취향을 골라 보세요.`; recsList.appendChild(li); }
        items.forEach((p, k) => {
          const li = document.createElement('li'); li.className = 'atlas-rec-item'; li.style.setProperty('--i', k); li.dataset.id = p.id;
          const b = document.createElement('button'); b.type = 'button'; b.className = 'atlas-rec'; b.dataset.id = p.id; b.setAttribute('aria-expanded', 'false');
          b.innerHTML = '<span class="atlas-rec-mark"></span><span class="atlas-rec-name"></span><span class="atlas-rec-meta"></span>';
          b.querySelector('.atlas-rec-name').textContent = p.name;
          b.querySelector('.atlas-rec-meta').textContent = (p.kind === 'event' ? `축제 · ${p.when}` : '관광지') + (inRegion ? '' : ` · ${regions[p.ri].name}`); // 지역 안에서는 지역 이름 생략
          b.classList.toggle('is-event', p.kind === 'event');
          b.addEventListener('click', () => {
            if (placeSel === p.id) { selectPlace(null); return; } // 다시 누르면 접힘
            if ((level !== 'region' || sel !== p.ri) && goRegion(p.ri, undefined, p.id) === false) return;
            selectPlace(p.id);
          });
          // 선택하면 이 줄이 그 자리에서 펼쳐져 카드가 됨: 한 줄 소개, 가는 길, 코스에 담기
          const body = document.createElement('div'); body.className = 'atlas-rec-body';
          body.innerHTML = '<div class="atlas-rec-inner"><p class="atlas-rec-line"></p><p class="atlas-rec-trip"></p><button type="button" class="atlas-rec-add">코스에 담기</button></div>';
          body.querySelector('.atlas-rec-line').textContent = p.line;
          body.querySelector('.atlas-rec-trip').textContent = `${p.trip} · ${p.tags.join(', ')}`;
          body.querySelector('.atlas-rec-add').addEventListener('click', () => toggleCourse(p.id));
          li.append(b, body); recsList.appendChild(li);
        });
      }
      requestAnimationFrame(recsEnd);
      for (const li of recsList.querySelectorAll('.atlas-rec-item')) {
        const id = li.dataset.id, open = id === placeSel, inC = course.includes(id), b = li.querySelector('.atlas-rec'), add = li.querySelector('.atlas-rec-add');
        if (open && !li.classList.contains('is-pick')) li.scrollIntoView({ block: 'nearest', behavior: ctx.reduce ? 'auto' : 'smooth' });
        li.classList.toggle('is-pick', open); li.classList.toggle('is-in', inC); // 고른 줄은 강조만: 설명과 담기는 지도 위 장소 옆 카드가 맡음
        b.classList.toggle('is-sel', open); b.classList.toggle('is-in', inC); b.setAttribute('aria-expanded', open); b.setAttribute('aria-controls', panel.id);
        add.textContent = inC ? '코스에서 빼기' : '코스에 담기'; add.classList.toggle('is-in', inC); add.tabIndex = -1;
      }
    }
    function updatePanel() {
      updateRecs(false);
      if (!placeSel) { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); return; }
      const p = byId[placeSel], inC = course.includes(p.id);
      pRegion.textContent = regions[p.ri].name;
      pName.textContent = p.name; pLine.textContent = p.line;
      pMeta.textContent = `${p.kind === 'event' ? `축제 · ${p.when} · ` : ''}${p.trip} · ${p.tags.join(', ')}`;
      pAdd.textContent = inC ? '코스에서 빼기' : '코스에 담기';
      pAdd.classList.toggle('is-in', inC);
      const was = panel.classList.contains('is-open');
      panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
      if (!was) { panel.classList.remove('is-pop'); void panel.offsetWidth; panel.classList.add('is-pop'); }
      placePanel();
    }
    // 장소 설명 카드: 고른 장소 핀 바로 옆 (오른쪽, 자리가 없으면 왼쪽). 카메라가 움직이면 따라감. 왼쪽 머리글과 화면 끝은 피함
    function placePanel() {
      if (!placeSel || !panel.classList.contains('is-open')) return;
      if (window.innerWidth <= 860) { panel.style.transform = ''; return; } // 휴대폰: 아래에 붙는 카드 그대로
      const p = byId[placeSel], [sx, sy, ok] = project(p.x, headY(p), p.z);
      const k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
      const r = panel.getBoundingClientRect(), w = r.width, h = r.height, vw = window.innerWidth, vh = window.innerHeight, gap = 34;
      const head = ui.querySelector('.atlas-head'), lx = head ? head.getBoundingClientRect().right + 20 : 24;
      let x = sx + gap, left = false;
      if (x + w > vw - 24) { x = sx - gap - w; left = true; }
      if (left && x < lx) { x = sx + gap; left = false; }
      x = Math.max(lx, Math.min(vw - 24 - w, x));
      const y = Math.max(84 * k, Math.min(vh - 28 - h, sy - h * 0.32));
      panel.style.transform = `translate(${(x / k).toFixed(1)}px, ${(y / k).toFixed(1)}px)`;
      panel.classList.toggle('is-left', left); panel.style.visibility = ok ? '' : 'hidden';
    }
    const vP = new THREE.Vector3();
    function project(x, y, z) {
      vP.set(O.x + x, O.y + y, O.z + z).project(cam);
      return [((vP.x + 1) / 2) * host.clientWidth, ((1 - vP.y) / 2) * host.clientHeight, vP.z < 1];
    }
    const put = (el, x, y, z, on) => {
      el.classList.toggle('is-on', on);
      if (!on) return;
      const [sx, sy, ok] = project(x, y, z);
      if (!ok) { el.classList.remove('is-on'); return; }
      el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
    };
    function updateLabels(content) {
      placePanel();
      for (const r of regions) {
        if (content) {
          const n = r.places.filter(match).length;
          r.label.querySelector('.atlas-lead-note').textContent = n ? `${n}곳` : (A.soonNote || '');
          r.label.classList.toggle('is-soon', !n && !!A.soonNote); // 아직 코스를 짤 수 없는 지역 (세계 지도에서 일본 밖)
        }
        r.label.classList.toggle('is-hover', r.idx === hover);
        put(r.label, r.cx, (r.top * 0.35 + liftT[r.idx + 1]) * riseNow, r.cz, level === 'national' && r.n > 0 && riseNow > 0.9);
      }
      if (level === 'national') { // 지시선 길이: 같은 쪽 이름표가 땅 바깥 한 줄에 서도록
        const [lx] = project(edgeW, 0, edgeZ), [rx] = project(edgeE, 0, edgeZ);
        for (const r of regions) {
          const [sx] = project(r.cx, 0, r.cz), line = r.label.querySelector('.atlas-lead-line');
          const tw = r.label.querySelector('.atlas-lead-text').offsetWidth + 14, room = r.left ? sx - tw - 12 : host.clientWidth - sx - tw - 12; // 글자가 화면 밖으로 나가지 않게
          line.style.width = Math.max(14, Math.min(room, r.left ? sx - lx + 28 : rx - sx + 28)).toFixed(0) + 'px';
        }
      }
      for (const k of peaks) put(k.el, k.x, k.y * riseNow, k.z, level === 'national' && riseNow > 0.9);
      // 장소: 전국에서는 점만, 지역에서는 점에서 선이 올라가 이름. 이름끼리 겹치면 선을 늘려 위로 비켜 놓음
      const full = [];
      for (const p of places) {
        const inC = course.includes(p.id), on = p.show && riseNow > 0.6;
        const named = on && (level === 'region' ? (p.ri === sel && match(p)) || inC || p.id === placeSel : inC); // 취향을 골랐으면 맞는 곳만 이름, 나머지는 점
        p.label.classList.toggle('is-on', on); p.label.classList.toggle('is-dot', !named);
        p.label.classList.toggle('is-sel', p.id === placeSel); p.label.classList.toggle('is-in', inC);
        p.tag.classList.toggle('is-on', named); p.tag.classList.toggle('is-sel', p.id === placeSel); p.tag.classList.toggle('is-in', inC);
        p.tag.tabIndex = named ? 0 : -1;
        if (!on) continue;
        const [sx, sy, ok] = project(p.x, headY(p), p.z);
        if (!ok) { p.label.classList.remove('is-on'); continue; }
        p.label.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
        if (named) full.push({ p, sx, sy, w: p.tag.offsetWidth || 80 });
      }
      full.sort((a, b) => b.sy - a.sy);
      const placed = [];
      for (const L of full) {
        let len = A.pin.line;
        for (let tries = 0; tries < 10; tries++) {
          const top = L.sy - len - 22;
          const hit = placed.find((o) => Math.abs(o.top - top) < 20 && Math.abs(o.sx - L.sx) < (o.w + L.w) / 2 + 8);
          if (!hit) break; len += 20;
        }
        placed.push({ sx: L.sx, top: L.sy - len - 22, w: L.w });
        L.p.label.style.setProperty('--l', len + 'px');
        L.p.tag.style.transform = `translate(${L.sx.toFixed(1)}px, ${(L.sy - len - 4).toFixed(1)}px)`;
      }
    }

    // ---------- 동작 ----------
    function goRegion(r, now = performance.now(), pid = null) {
      if (ctx.onRegion && ctx.onRegion(regions[r], pid) === false) return false; // 바깥에서 가로챔 (세계 지도: 일본은 일본 지도로, 나머지는 '곧 열려요')
      level = 'region'; sel = r; hover = -1; placeSel = null;
      const R = regions[r];
      const rd = R.rad * A.region.pad + A.region.min;
      moveCam(mkPose(R.cx - rd * (A.region.shift || 0), R.cz, rd, A.region.pitch, 0, 0.2), A.camDur, now); // 지역이 화면 오른쪽에 오도록 살짝 서쪽을 바라봄
      retarget(); updateCrumb(); updateRecs(true); updatePanel(); updateLabels(true);
    }
    function goNational(now = performance.now()) {
      level = 'national'; sel = -1; placeSel = null;
      moveCam(NAT(), A.camDur, now);
      retarget(); updateCrumb(); updateRecs(true); updatePanel(); updateLabels(true);
    }
    // 고른 버튼 위로 빛나는 위치 표시가 미끄러져 옮겨 감
    const filterPin = document.createElement('span'); filterPin.className = 'atlas-filter-pin'; filterPin.setAttribute('aria-hidden', 'true');
    filtersEl.appendChild(filterPin);
    const filterBtns = () => [...filtersEl.querySelectorAll('.atlas-filter')];
    // 핀이 끌려가는 움직임: 아래 꼭지(손잡이)가 부드러운 용수철로 목표를 따라가고, 몸통은 꼭지의 가속도에 밀려 뒤로 기울었다가 흔들리며 바로 섬
    // 한 번에 60fps 프레임을 미리 계산해 Web Animations로 재생 (합성 단계에서 돌아 3D 렌더가 무거워도 끊기지 않음)
    const pin = { x: null, g: 0, v: 0, a: 0, w: 0, frames: null, t0: 0, anim: null };
    const pinTf = (s) => `translateX(${(s.x - 6).toFixed(2)}px) rotate(${s.a.toFixed(2)}deg) scale(${(1 - 0.1 * s.st).toFixed(3)}, ${(1 + 0.14 * s.st).toFixed(3)})`;
    const pinNow = () => { // 지금 화면에 보이는 상태 (움직이는 중이면 그 순간 값)
      if (!pin.frames) return { x: pin.x, g: pin.x, v: 0, a: 0, w: 0 };
      return pin.frames[Math.min(pin.frames.length - 1, Math.max(0, Math.floor((performance.now() - pin.t0) / (1000 / 60))))];
    };
    function placeFilterPin(instant) {
      const b = filterBtns()[filter]; if (!b || !b.offsetWidth) return;
      const x = b.offsetLeft + b.offsetWidth / 2;
      if (instant || pin.x == null || ctx.reduce) {
        if (pin.anim) pin.anim.cancel();
        pin.x = x; pin.frames = null; pin.anim = null; filterPin.style.transform = pinTf({ x, a: 0, st: 0 }); return;
      }
      const s = { ...pinNow() }, dt = 1 / 60, out = [];
      for (let k = 0; k < 150; k++) {
        s.g += (x - s.g) * 0.2;                                   // 손잡이 목표가 매끄럽게 출발 (갑자기 튀어 나가지 않게)
        const acc = 190 * (s.g - s.x) - 25 * s.v;                // 꼭지: 거의 임계 감쇠 용수철
        s.v += acc * dt; s.x += s.v * dt;
        const aa = -300 * s.a - 11 * s.w - 0.4 * acc;             // 몸통: 가속도 반대쪽으로 밀리는 진자 (덜 감쇠돼 몇 번 흔들림)
        s.w += aa * dt; s.a = Math.max(-30, Math.min(30, s.a + s.w * dt));
        out.push({ x: s.x, g: s.g, v: s.v, a: s.a, w: s.w, st: Math.min(1, Math.abs(s.v) / 1100) });
        if (k > 24 && Math.abs(x - s.x) < 0.15 && Math.abs(s.v) < 3 && Math.abs(s.a) < 0.3 && Math.abs(s.w) < 4) break;
      }
      out.push({ x, g: x, v: 0, a: 0, w: 0, st: 0 });
      if (pin.anim) pin.anim.cancel();
      pin.x = x; pin.frames = out; pin.t0 = performance.now();
      filterPin.style.transform = pinTf(out[out.length - 1]);
      pin.anim = filterPin.animate(out.map((f) => ({ transform: pinTf(f) })), { duration: out.length * (1000 / 60), easing: 'linear' });
      pin.anim.onfinish = () => { pin.frames = null; pin.anim = null; };
    }
    new ResizeObserver(() => { if (!pin.anim) placeFilterPin(true); }).observe(filtersEl); // 움직이는 중에는 끊지 않음
    function setFilter(i) {
      filter = i; filterBtns().forEach((c, k) => c.setAttribute('aria-checked', k === i));
      placeFilterPin(false);
      retarget(); updateLabels(true); updateRecs(true);
    }
    // 장소를 고르면 늘 왼쪽 목록의 그 줄이 카드로 펼쳐지게: 지금 목록에 없으면 그 장소가 속한 취향으로 바꿈
    function selectPlace(id) {
      if (id && !recsList.querySelector(`.atlas-rec-item[data-id="${id}"]`)) {
        const k = A.filters.indexOf(byId[id].tags[0]);
        if (k > 0) setFilter(k);
      }
      placeSel = id; updatePanel(); updateLabels(false); changed = true;
    }
    function toggleCourse(id) {
      const k = course.indexOf(id);
      if (k >= 0) { course.splice(k, 1); ctx.onCourse(course.map((c) => byId[c])); }
      else {
        course.push(id);
        const p = byId[id];
        vA.set(O.x + p.x, O.y + headY(p), O.z + p.z);
        if (ctx.reduce) ctx.onCourse(course.map((c) => byId[c]));
        else fly = { from: vA.clone(), t0: performance.now(), dur: 700 };
      }
      retarget(); updatePanel(); updateLabels(false);
    }

    // ---------- 프레임 ----------
    function tick(now) {
      const dt = lastNow ? Math.min(100, now - lastNow) : 16; lastNow = now;
      let moved = false;
      if (camAnim) {
        const q = clamp01((now - camAnim.t0) / camAnim.dur), e = smoother(q), F = camAnim.from, To = camAnim.to;
        camP.look.lerpVectors(F.look, To.look, e);
        camP.dist = Math.exp(Math.log(F.dist) + (Math.log(To.dist) - Math.log(F.dist)) * e);
        camP.pitch = F.pitch + (To.pitch - F.pitch) * e; camP.yaw = F.yaw + (To.yaw - F.yaw) * e;
        if (q >= 1) camAnim = null;
        moved = true;
      }
      applyCam(camP);
      // 솟아오름 (처음 한 번)
      const rt = riseT0 ? clamp01((now - riseT0) / A.intro.rise) : 1;
      const rising = rt < 1 || RU.uRiseT.value !== rt;
      RU.uRiseT.value = rt; riseNow = smoother(clamp01((rt - 0.2) / 0.8));
      // 지역 들림과 흐림은 목표값으로 부드럽게
      const k = ctx.reduce ? 1 : 1 - Math.exp(-dt / 120);
      let shaded = false;
      for (let i = 0; i < 10; i++) {
        const dl = liftT[i] - RU.uLift.value[i], dd = dimT[i] - RU.uDim.value[i];
        if (Math.abs(dl) > 1e-4) { RU.uLift.value[i] += dl * k; shaded = true; } else RU.uLift.value[i] = liftT[i];
        if (Math.abs(dd) > 1e-4) { RU.uDim.value[i] += dd * k; shaded = true; } else RU.uDim.value[i] = dimT[i];
        const dh = hiRT[i] - RU.uHiR.value[i];
        if (Math.abs(dh) > 1e-4) { RU.uHiR.value[i] += dh * k; shaded = true; } else RU.uHiR.value[i] = hiRT[i];
      }
      { const df = hiFT - RU.uHiF.value; if (Math.abs(df) > 1e-4) { RU.uHiF.value += df * k; shaded = true; } else RU.uHiF.value = hiFT; }
      // 강조된 산은 스프링처럼 살짝 넘쳤다가 자리 잡으며 늘어남 (참고 영상의 산이 솟는 움직임)
      const tq = ctx.reduce ? 1 : pullT0 ? clamp01((now - pullT0) / HL.dur) : 1, T = tq * HL.dur / 1000;
      const pull = tq >= 1 ? 1 : 1 - Math.exp(-HL.spring[0] * T) * Math.cos(HL.spring[1] * T);
      if (pull !== RU.uPull.value) shaded = true;
      RU.uPull.value = pull;
      RU.uAny.value = Math.max(RU.uHiF.value, ...RU.uHiR.value);
      let pinMoved = false;
      for (const p of places) {
        const t = p.show ? 1 : 0, d = t - p.s;
        if (Math.abs(d) > 1e-3) { p.s += d * (ctx.reduce ? 1 : 1 - Math.exp(-dt / 140)); pinMoved = true; } else p.s = t;
      }
      if (rising) pinMoved = true;
      rebuildLines();
      if (fly) {
        const q = clamp01((now - fly.t0) / fly.dur), e = q * q * (3 - 2 * q);
        ctx.phoneWorld(vB);
        vM.copy(fly.from).lerp(vB, 0.5); vM.y += 1.8;
        const a = 1 - e;
        flyMesh.position.set(0, 0, 0).addScaledVector(fly.from, a * a).addScaledVector(vM, 2 * a * e).addScaledVector(vB, e * e);
        flyMesh.scale.setScalar(1 - e * 0.5); flyMesh.visible = q < 1;
        if (q >= 1) { fly = null; ctx.onCourse(course.map((c) => byId[c])); }
        pinMoved = true;
      }
      const any = moved || rising || shaded || changed || pinMoved;
      if (any) { updateLabels(false); ctx.fitShadow(lookW, level === 'national' ? A.shadow.national : A.shadow.region); }
      changed = false;
      return any;
    }

    // ---------- 포인터 ----------
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), pl = new THREE.Plane(), hitV = new THREE.Vector3();
    function pick(e) {
      ndc.set((e.clientX / host.clientWidth) * 2 - 1, -(e.clientY / host.clientHeight) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      // 땅은 정밀한 충돌 대신 높이 평면 두 번으로 찾음 (가벼움)
      let y = A.relief.base;
      for (let it = 0; it < 2; it++) {
        pl.set(new THREE.Vector3(0, 1, 0), -(O.y + y));
        if (!ray.ray.intersectPlane(pl, hitV)) return {};
        const kk = cellAt(hitV.x - O.x, hitV.z - O.z);
        if (kk < 0 || !Hq[kk]) { if (it) return { paper: true }; continue; }
        y = hOf(Hq[kk]) * 0.7;
        if (it) return { region: Rq[kk] - 1 };
      }
      return {};
    }
    function hoverAt(e) {
      if (camAnim) return false;
      const h = pick(e), r = h.region !== undefined ? h.region : -1;
      const nh = level === 'national' ? r : -1;
      if (nh !== hover) { hover = nh; retarget(); updateLabels(false); }
      return !!h.place || r >= 0 || (level === 'region' && !!h.paper); // 지역에서는 종이도 누를 수 있음 (전국으로)
    }
    function clickAt(e) {
      const h = pick(e);
      if (h.place) { if (level === 'national' && goRegion(byId[h.place].ri, undefined, h.place) === false) return; selectPlace(h.place); return; }
      if (h.paper && level === 'region') { goNational(); return; } // 자세히 보다가 바깥 종이를 누르면 전국으로
      if (h.region === undefined || h.region < 0) { if (placeSel) selectPlace(null); return; }
      if (level === 'national' || h.region !== sel) goRegion(h.region);
      else if (placeSel) selectPlace(null);
    }

    return {
      course: () => course.map((c) => byId[c]),
      fogColor, // 먼 곳은 종이색으로 옅어짐 (밤이면 남색)
      setNight(n) { // 0 = 낮, 1 = 밤
        NIGHT.n = n; RU.uNight.value = n;
        const mix = (k) => DAYC[k].clone().lerp(NIGHTC[k], n);
        for (const [m, k] of NIGHT.mats) { m.color.copy(mix(k)); if (m.isMeshStandardMaterial) m.envMapIntensity = 1 - 0.9 * n; }
        for (const m of NIGHT.env) m.envMapIntensity = 1 - 0.9 * n; // 밤에는 낮 하늘이 표면에 비치지 않게
        RU.uPaper.value.copy(mix('paper')); fogColor.copy(mix('paper'));
        RU.uInk.value.copy(mix('ink')); RU.uInkA.value = CT.alpha + (NG.inkA - CT.alpha) * n;
        // 강조 빛과 코스 색: 낮에는 하늘색, 밤에는 오렌지
        RU.uGlowA.value.copy(lin(HL.glowDay[0])).lerp(lin(HL.glow[0]), n); RU.uGlowB.value.copy(lin(HL.glowDay[1])).lerp(lin(HL.glow[1]), n);
        RU.uCore.value.copy(lin(HL.coreDay)).lerp(lin(HL.core), n);
        const cc = lin(A.colors.courseDay).lerp(lin(A.colors.course), n);
        lineMat.color.copy(cc); lineMat.emissive.copy(cc); flyMesh.material.color.copy(cc);
        changed = true;
      },
      enter(now) {
        level = 'national'; sel = -1; hover = -1; placeSel = null;
        root.visible = true; ui.hidden = false;
        retarget();
        for (let i = 0; i < 10; i++) { RU.uLift.value[i] = liftT[i]; RU.uDim.value[i] = dimT[i]; }
        for (const p of places) p.s = p.show ? 1 : 0;
        const n = NAT();
        Object.assign(camP, mkPose(n.look.x, n.look.z - 2.5, A.intro.dist, A.intro.pitch));
        riseT0 = ctx.reduce ? 0 : now + 150; lastNow = now; RU.uRiseT.value = ctx.reduce ? 1 : 0;
        moveCam(n, A.intro.dur, now + 80);
        updateCrumb(); updateRecs(true); updatePanel(); updateLabels(true);
        changed = true; tick(now);
        requestAnimationFrame(() => document.body.classList.add('is-atlas'));
      },
      exit() {
        root.visible = false; flyMesh.visible = false; fly = null; camAnim = null;
        document.body.classList.remove('is-atlas'); ui.hidden = true;
        for (const el of labelsEl.children) el.classList.remove('is-on');
      },
      back() { if (placeSel) { selectPlace(null); return true; } if (level === 'region') { goNational(); return true; } return false; },
      // ---------- 코스 화면(course.js)이 쓰는 것 ----------
      // 위도·경도 → 화면 좌표 [x, y, 보임]. 땅 높이까지 반영해 핀이 땅 위에 섬
      projectLL(lat, lon, lift = 0) { const x = toX(lon), z = toZ(lat); return project(x, (groundAt(x, z) + lift) * riseNow + 0.02, z); },
      // 카메라를 원하는 자리로 (p 없으면 처음 전국 화면). p: { lat, lon, dist, pitch, yaw }
      pose(p, dur) { moveCam(p ? mkPose(toX(p.lon), toZ(p.lat), p.dist, p.pitch, p.yaw || 0) : NAT(), dur == null ? A.camDur : dur, performance.now()); },
      // 코스 화면에서는 지역 강조, 장소 점, 3D 코스 선을 치우고 지도만 남김
      setCourseMode(on) {
        if (on) { level = 'national'; sel = -1; hover = -1; placeSel = null; retarget(); updateCrumb(); updatePanel(); }
        lineGroup.visible = !on; changed = true;
      },
      toggle: (id) => toggleCourse(id),
      focusPlace(id) { if (!byId[id]) return; goRegion(byId[id].ri); selectPlace(id); }, // 다른 지도에서 고른 장소로 바로 (세계 → 일본)
      // 다른 지도에서 담은 곳을 그대로 이어받음 (세계 지도와 일본 지도는 장소 id가 같음). 날아가는 점 없이 바로
      setCourse(ids) { course.length = 0; for (const id of ids) if (byId[id] && !course.includes(id)) course.push(id); retarget(); updatePanel(); updateLabels(false); changed = true; },
      places: () => places,
      tick, hover: hoverAt, click: clickAt,
      busy: () => !!camAnim,
    };
  };
})();

/*
 * eodi 3D 모델 세트 (실사풍)
 * 참고: 맑은 하늘 아래 흰 동체, 남색 배, 오렌지 꼬리날개 (cosmos.so/e/1783372644)
 * 모든 표면 무늬(창문, 문, 패널 선, 로고, 때)는 코드로 그린 텍스처라 외부 이미지가 필요 없어요.
 * 단위와 기준점은 히어로 장면(scene-spec.js)과 같아서 그대로 바꿔 끼울 수 있어요.
 *   비행기: 코끝 z = 0, 뒤가 -z, 바닥 y = 0 (바퀴가 땅에 닿음)
 *   KTX: 앞 코끝 z = 0, 뒤가 -z
 *   역, 공항: scene-spec.js의 boxes 좌표 그대로
 */
(function () {
  const V3 = THREE.Vector3, V2 = THREE.Vector2;
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const TAU = Math.PI * 2;
  const smooth = (t) => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const LITE = !!window.EODI_LITE; // 히어로 장면: 텍스처를 절반 크기로, 코팅 계산 없이 (부드러운 움직임 우선)
  const TS = LITE ? 0.5 : 1;
  const Q = (full, lite) => (LITE ? lite : full); // 히어로에서는 멀리서 보는 화면이라 조각 수를 줄임
  const Mat = (o) => { if (LITE) { const { clearcoat, clearcoatRoughness, ...rest } = o; return new THREE.MeshStandardMaterial(rest); } return new THREE.MeshPhysicalMaterial(o); };

  const PAL = {
    paint: '#F3F4F2', navy: '#1B2856', orange: '#D93A12', wing: '#C9CFD5', roof: '#E2E5E7',
    glass: '#121C27', metal: '#9BA3AA', dark: '#2A2F35', rubber: '#1E2124',
    concrete: '#E4E6E2', concreteSide: '#D3D8DA', tactile: '#E2D43A', light: '#FFF5DA', skyGlass: '#3A7FB2',
  };

  // ---------- 캔버스 텍스처 도우미 ----------
  const ANISO = 8;
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function tex(c, color) {
    const t = new THREE.CanvasTexture(c);
    if (color) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = ANISO;
    return t;
  }
  // 높이 그림 -> 법선 그림 (패널 틈, 창틀, 문 틈이 빛을 받아 살아남)
  function normalFrom(hc, strength) {
    const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
    const [c, x] = canvas(w, h), img = x.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      const yu = Math.max(0, y - 1), yd = Math.min(h - 1, y + 1);
      for (let i = 0; i < w; i++) {
        const xl = Math.max(0, i - 1), xr = Math.min(w - 1, i + 1);
        const nx = ((src[(y * w + xl) * 4] - src[(y * w + xr) * 4]) / 255) * strength;
        const ny = ((src[(yd * w + i) * 4] - src[(yu * w + i) * 4]) / 255) * strength;
        const l = Math.hypot(nx, ny, 1), o = (y * w + i) * 4;
        d[o] = (nx / l * 0.5 + 0.5) * 255; d[o + 1] = (ny / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  // 고운 결: 작은 무늬를 여러 크기로 겹쳐 칠함 (도장의 미세한 결, 콘크리트 얼룩)
  const grainTile = (() => {
    const [c, x] = canvas(256, 256), img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    return c;
  })();
  function grain(x, w, h, alpha, scales = [1, 3, 9]) {
    x.save();
    for (const s of scales) {
      x.globalAlpha = alpha / scales.length;
      x.globalCompositeOperation = 'overlay';
      x.setTransform(s, 0, 0, s, 0, 0);
      x.fillStyle = x.createPattern(grainTile, 'repeat'); x.fillRect(0, 0, w / s, h / s);
    }
    x.restore();
  }
  function rrect(x, X, Y, W, H, r) { x.beginPath(); x.roundRect(X, Y, W, H, Math.max(0, Math.min(r, Math.abs(W) / 2, Math.abs(H) / 2))); }
  const rough = (v) => { const g = Math.round(v * 255); return `rgb(${g},${g},${g})`; };
  const height = rough;

  // 표면 한 장 = 색, 높이(-> 법선), 거칠기, (발광) 캔버스를 함께 그림
  function surface(w, h, base, roughV, draw, normalStrength = 3, withEmissive = false) {
    const [cc, cx] = canvas(w, h), [hc, hx] = canvas(w, h), [rc, rx] = canvas(w, h);
    const ec = withEmissive ? canvas(w, h) : null;
    cx.fillStyle = base; cx.fillRect(0, 0, w, h);
    hx.fillStyle = height(0.5); hx.fillRect(0, 0, w, h);
    rx.fillStyle = rough(roughV); rx.fillRect(0, 0, w, h);
    if (ec) { ec[1].fillStyle = '#000'; ec[1].fillRect(0, 0, w, h); }
    draw({ c: cx, h: hx, r: rx, e: ec && ec[1], w }); // h는 높이 캔버스 (크기 숫자와 이름이 겹치지 않게)
    grain(cx, w, h, 0.05);
    grain(rx, w, h, 0.25);
    return { map: tex(cc, true), normalMap: LITE ? null : tex(normalFrom(hc, normalStrength), false), // 히어로에서는 요철 그림을 만들지 않음 (계산과 그리기 모두 무거움)
      roughnessMap: tex(rc, false), emissiveMap: ec ? tex(ec[0], true) : null };
  }

  // ---------- 재질 ----------
  const M = {};
  const std = (name, hex, o = {}) => (M[name] = new THREE.MeshStandardMaterial({ name, color: lin(hex), roughness: 0.6, metalness: 0, ...o }));
  const phys = (name, hex, o = {}) => (M[name] = Mat({ name, color: lin(hex), roughness: LITE ? 0.3 : 0.4, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, ...o }));
  phys('navy', PAL.navy, { roughness: 0.38 });
  phys('orange', PAL.orange, { roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.12 });
  phys('paint', PAL.paint, { roughness: 0.3 });
  std('chrome', '#D7DCE0', { roughness: 0.14, metalness: 1 });
  std('metal', PAL.metal, { roughness: 0.32, metalness: 0.9 });
  std('titanium', '#6E757C', { roughness: 0.28, metalness: 1 });
  std('dark', PAL.dark, { roughness: 0.55, metalness: 0.35 });
  std('rubber', PAL.rubber, { roughness: 0.82 });
  std('red', '#FF3B30', { emissive: lin('#FF2A1E'), emissiveIntensity: 2, roughness: 0.2 });
  std('green', '#34F27A', { emissive: lin('#22E06A'), emissiveIntensity: 2, roughness: 0.2 });
  std('strobe', '#FFFFFF', { emissive: lin('#FFFFFF'), emissiveIntensity: 2.4, roughness: 0.2 });
  std('light', PAL.light, { emissive: lin(PAL.light), emissiveIntensity: 1.6, roughness: 0.1 });

  const mesh = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (name) m.name = name; return m; };

  // ---------- 모서리가 둥근 상자 ----------
  function roundedBox(w, h, d, r = 0.12, s = Q(4, 2)) {
    r = Math.max(0.001, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
    const n = 2 * s + 1, g = new THREE.BoxGeometry(2, 2, 2, n, n, n), half = [w / 2, h / 2, d / 2];
    const pos = g.attributes.position, nor = g.attributes.normal, p = new V3(), q = new V3();
    const remap = (u, hh) => {
      const k = Math.round(((u + 1) / 2) * n);
      if (k <= s) return -hh + r * (1 - Math.cos((k / s) * Math.PI / 2));
      if (k >= n - s) return hh - r * (1 - Math.cos(((n - k) / s) * Math.PI / 2));
      return k === s + 1 ? hh - r : -hh + r;
    };
    for (let i = 0; i < pos.count; i++) {
      p.set(remap(pos.getX(i), half[0]), remap(pos.getY(i), half[1]), remap(pos.getZ(i), half[2]));
      q.set(clamp(p.x, -half[0] + r, half[0] - r), clamp(p.y, -half[1] + r, half[1] - r), clamp(p.z, -half[2] + r, half[2] - r));
      const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z, len = Math.hypot(dx, dy, dz);
      if (len > 1e-6) { p.set(q.x + (dx / len) * r, q.y + (dy / len) * r, q.z + (dz / len) * r); nor.setXYZ(i, dx / len, dy / len, dz / len); }
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    return g;
  }
  const rbox = (size, at, mat, r, name) => { const m = mesh(roundedBox(size[0], size[1], size[2], r), mat, name); m.position.set(...at); return m; };

  // ---------- 고리를 이어 만드는 매끈한 몸체 (텍스처 좌표 포함) ----------
  // rings: 고리 배열(점 개수 같음). us: 고리마다 길이 방향 좌표(0~1). 둘레 방향 좌표는 각도/2π
  function loft(rings, us, mat, name) {
    const nr = rings.length, nv = rings[0].length, cols = nv + 1; // 이음매에서 텍스처가 끊기지 않게 첫 점을 한 번 더
    const pos = new Float32Array(nr * cols * 3), uv = new Float32Array(nr * cols * 2);
    for (let i = 0; i < nr; i++) for (let k = 0; k < cols; k++) {
      const v = rings[i][k % nv], o = i * cols + k;
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      uv[o * 2] = us[i]; uv[o * 2 + 1] = k / nv;
    }
    const idx = [];
    for (let i = 0; i < nr - 1; i++) for (let k = 0; k < nv; k++) {
      const a = i * cols + k, b = a + 1, c = a + cols + 1, d = a + cols;
      idx.push(a, d, b, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // 면이 안쪽을 보면 뒤집음 (진행 방향에 따라 감기는 방향이 달라져서 속이 뚫려 보이던 문제)
    const mid = Math.floor(nr / 2), c0 = rings[mid].reduce((a, v) => a.add(v), new V3()).multiplyScalar(1 / nv);
    let N = geo.attributes.normal, o = mid * cols + Math.floor(nv / 4);
    const out = new V3(pos[o * 3] - c0.x, pos[o * 3 + 1] - c0.y, pos[o * 3 + 2] - c0.z);
    if (out.dot(new V3(N.getX(o), N.getY(o), N.getZ(o))) < 0) {
      for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
      geo.setIndex(idx); geo.computeVertexNormals(); N = geo.attributes.normal;
    }
    // 이음매 양쪽 법선을 맞춰서 선이 보이지 않게
    for (let i = 0; i < nr; i++) {
      const a = i * cols, b = i * cols + nv;
      const nx = N.getX(a) + N.getX(b), ny = N.getY(a) + N.getY(b), nz = N.getZ(a) + N.getZ(b), l = Math.hypot(nx, ny, nz) || 1;
      N.setXYZ(a, nx / l, ny / l, nz / l); N.setXYZ(b, nx / l, ny / l, nz / l);
    }
    return mesh(geo, mat, name);
  }
  const collapse = (ring) => { const c = ring.reduce((a, v) => a.add(v), new V3()).multiplyScalar(1 / ring.length); return ring.map(() => c.clone()); };
  function superRing(cx, cy, z, rx, ry, n, seg, bottomFlat = -Infinity) {
    const pts = [];
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * TAU, c = Math.cos(a), s = Math.sin(a);
      let y = cy + ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (y < bottomFlat) y = bottomFlat + (y - bottomFlat) * 0.15;
      pts.push(new V3(cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y, z));
    }
    return pts;
  }
  // 슈퍼타원에서 높이 y가 되는 각도 (오른쪽 옆면 기준, -π/2 ~ π/2)
  const angAt = (y, cy, ry, n) => { const t = clamp((y - cy) / ry, -1, 1); return Math.asin(Math.sign(t) * Math.pow(Math.abs(t), n / 2)); };

  // 납작한 판(날개 등): 윤곽을 둥근 모서리로 두껍게, 바깥쪽으로 갈수록 얇게
  function flatPanel(pts, thick, taper, mat, bevel = 0.08) {
    const sh = new THREE.Shape(pts.map(([a, b]) => new V2(a, b)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: Q(5, 2), curveSegments: Q(8, 4) });
    g.translate(0, 0, -thick / 2);
    if (taper) {
      const p = g.attributes.position, [lo, hi, to] = taper;
      for (let i = 0; i < p.count; i++) { const u = clamp((Math.abs(p.getX(i)) - lo) / (hi - lo), 0, 1); p.setZ(i, p.getZ(i) * (1 + (to - 1) * u)); }
    }
    g.computeVertexNormals();
    return mesh(g, mat);
  }
  // 날개 단면을 유선형으로: 앞전은 둥글고 두껍게, 뒷전은 얇게, 윗면은 볼록
  function airfoil(geo, chordAt) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
      const [le, te] = chordAt(Math.abs(x)), c = clamp((le - z) / (le - te), 0, 1);
      const thin = 1 - 0.75 * Math.pow(c, 1.4), camber = Math.sin(Math.PI * Math.pow(c, 0.6)) * 0.016 * (le - te);
      p.setY(i, y * thin + (y > 0 ? camber : camber * 0.3));
    }
    geo.computeVertexNormals();
  }

  // ======================================================================
  // 비행기
  // ======================================================================
  const PLN = { L: 23.7, R: 1.35, CY: 2.6, Ln: 3.8, Lt: 9.2 };
  const planeRad = (d) => {
    const { L, R, Ln, Lt } = PLN;
    if (d < Ln) return R * Math.sqrt(Math.max(0, 1 - Math.pow(1 - d / Ln, 2.2)));
    if (d > L - Lt) { const u = (d - (L - Lt)) / Lt; return R * (1 - 0.86 * Math.pow(u, 1.6)); }
    return R;
  };
  const planeCy = (d) => PLN.CY - 0.32 * Math.pow(Math.max(0, 1 - d / PLN.Ln), 2) + 0.95 * sstep(PLN.L - PLN.Lt, PLN.L, d);

  function fuselageSurface() {
    const { L, R } = PLN, W = 4096 * TS, H = 1536 * TS;
    const X = (d) => (d / L) * W, Y = (a) => (1 - (((a % TAU) + TAU) % TAU) / TAU) * H, pxA = H / TAU;
    return surface(W, H, PAL.paint, 0.3, ({ c, h, r }) => {
      // 남색 배: 코 아래에서 시작해 꼬리까지
      const belly = (d) => 0.16 + 0.34 * (1 - sstep(0.5, 5, d)) - 0.06 * sstep(14, 22, d);
      for (const [ctx, fill] of [[c, PAL.navy], [r, rough(0.38)]]) {
        ctx.beginPath();
        for (let d = 0; d <= L; d += 0.1) ctx.lineTo(X(d), Y(TAU - Math.asin(belly(d))));
        for (let d = L; d >= 0; d -= 0.1) ctx.lineTo(X(d), Y(Math.PI + Math.asin(belly(d))));
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      }
      // 패널 이음선
      c.save(); c.globalAlpha = 0.18; c.strokeStyle = '#8D959C'; h.strokeStyle = height(0.38); c.lineWidth = h.lineWidth = 2;
      for (let d = 2.4; d < L - 0.6; d += 1.55) for (const ctx of [c, h]) { ctx.beginPath(); ctx.moveTo(X(d), 0); ctx.lineTo(X(d), H); ctx.stroke(); }
      for (const a of [0.62, Math.PI - 0.62, -0.42, Math.PI + 0.42]) for (const ctx of [c, h]) { ctx.beginPath(); ctx.moveTo(X(3), Y(a)); ctx.lineTo(X(L - 1.5), Y(a)); ctx.stroke(); }
      c.restore();
      for (const s of [1, -1]) {
        const ang = (a) => (s > 0 ? a : Math.PI - a); // 오른쪽(+x)과 왼쪽(-x)
        // 객실 창
        for (let d = 4.6; d < 19.6; d += 0.52) {
          if (Math.abs(d - 11.3) < 0.55) continue; // 비상구 자리
          const y = Y(ang(0.17)), w = 0.25 * (W / L), hh = (0.36 / planeRad(d)) * pxA;
          rrect(h, X(d) - w / 2 - 4, y - hh / 2 - 4, w + 8, hh + 8, w * 0.55); h.fillStyle = height(0.64); h.fill(); // 창틀
          rrect(h, X(d) - w / 2, y - hh / 2, w, hh, w * 0.45); h.fillStyle = height(0.3); h.fill();          // 안으로 들어간 유리
          rrect(c, X(d) - w / 2, y - hh / 2, w, hh, w * 0.45); c.fillStyle = '#16212C'; c.fill();
          rrect(c, X(d) - w / 2 + 4, y - hh / 2 + 4, w - 8, hh * 0.32, w * 0.3); c.fillStyle = 'rgba(160,190,215,0.35)'; c.fill(); // 하늘 반사
          rrect(r, X(d) - w / 2, y - hh / 2, w, hh, w * 0.45); r.fillStyle = rough(0.05); r.fill();
        }
        // 문: 앞, 날개 위 비상구, 뒤
        for (const [d, dw, dh, a0] of [[3.25, 0.82, 1.85, 0.02], [11.3, 0.5, 1.0, 0.12], [20.8, 0.78, 1.7, 0.08]]) {
          const rr = planeRad(d), y = Y(ang(a0)), w = dw * (W / L), hh = (dh / rr) * pxA;
          for (const [ctx, col, lw] of [[c, 'rgba(120,128,136,0.55)', 3], [h, height(0.25), 4]]) { rrect(ctx, X(d) - w / 2, y - hh / 2, w, hh, w * 0.22); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); }
          const ww = 0.2 * (W / L), wh = (0.26 / rr) * pxA, wy = Y(ang(a0 + 0.45 / rr));
          rrect(c, X(d) - ww / 2, wy - wh / 2, ww, wh, ww * 0.4); c.fillStyle = '#16212C'; c.fill();
          rrect(r, X(d) - ww / 2, wy - wh / 2, ww, wh, ww * 0.4); r.fillStyle = rough(0.05); r.fill();
        }
        // 로고와 등록 번호 (왼쪽 면은 거꾸로 펼쳐지므로 뒤집어 그림)
        const logo = (txt, d, a0, px, col) => {
          c.save(); c.translate(X(d), Y(ang(a0))); if (s < 0) c.rotate(Math.PI);
          c.font = `700 ${px}px SUIT, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(txt, 0, 0); c.restore();
        };
        logo('eodi', 7.2, 0.74, (0.6 / R) * pxA, PAL.navy); // 창 줄 위
        logo('HL8701', 19.6, 0.4, (0.16 / R) * pxA, '#4A5560');
      }
      // 조종석 창: 왼쪽 옆면에서 코 위를 지나 오른쪽 옆면까지 기둥 없이 하나로 이어진 유리
      const blob = (ctx, pts) => {
        const P = pts.map(([d, a]) => [X(d), Y(a)]), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n = P.length;
        ctx.beginPath(); ctx.moveTo(...mid(P[n - 1], P[0]));
        for (let i = 0; i < n; i++) ctx.quadraticCurveTo(...P[i], ...mid(P[i], P[(i + 1) % n]));
        ctx.closePath();
      };
      const MID = Math.PI / 2, flip = ([d, a]) => [d, Math.PI - a];
      const front = [[2.1, 0.56], [1.35, 0.68], [1.0, 1.0], [0.86, 1.3]], rear = [[2.12, 0.96], [1.85, 1.2], [1.7, 1.4]];
      const canopy = [...front, [0.82, MID], ...front.map(flip).reverse(), ...rear.map(flip), [1.66, MID], ...rear.slice().reverse()];
      for (const [ctx, fill] of [[c, '#121B25'], [r, rough(0.04)], [h, height(0.3)]]) { blob(ctx, canopy); ctx.fillStyle = fill; ctx.fill(); }
      blob(h, canopy); h.strokeStyle = height(0.66); h.lineWidth = 6; h.stroke();
      const shine = [[1.95, 0.9], [1.55, 1.15], [1.4, MID], [1.55, Math.PI - 1.15], [1.95, Math.PI - 0.9], [1.7, Math.PI - 1.2], [1.6, MID], [1.7, 1.2]];
      blob(c, shine); c.fillStyle = 'rgba(150,180,205,0.24)'; c.fill(); // 하늘 반사
      // 꼬리 쪽 옅은 그을음
      const g = c.createLinearGradient(X(L - 2.2), 0, X(L), 0); g.addColorStop(0, 'rgba(40,44,50,0)'); g.addColorStop(1, 'rgba(40,44,50,0.35)');
      c.fillStyle = g; c.fillRect(X(L - 2.2), 0, X(2.2), H);
    }, 4);
  }

  function wingSurface() {
    // 위에서 본 x, z 평면 (x -10.5 ~ 10.5, z -24.5 ~ -6.5), 1단위 = 97px
    const S = 97 * TS, W = 21 * S, H = 18 * S, P = (x, z) => [(x + 10.5) * S, (-6.5 - z) * S];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const s = surface(W, H, PAL.wing, 0.36, ({ c, h, r }) => {
      const line = (pts, col, hv, lw = 3) => { for (const [ctx, st, w] of [[c, col, lw], [h, height(hv), lw + 1]]) { ctx.beginPath(); pts.forEach((p) => ctx.lineTo(...P(...p))); ctx.strokeStyle = st; ctx.lineWidth = w; ctx.stroke(); } };
      for (const m of [1, -1]) {
        const LE0 = [0.6 * m, -8.0], LE1 = [9.7 * m, -13.9], TE0 = [0.6 * m, -12.9], TE1 = [9.3 * m, -15.3];
        // 앞전 슬랫 (금속빛 띠)
        for (const [ctx, fill] of [[c, 'rgba(226,231,236,0.95)'], [r, rough(0.2)]]) { ctx.beginPath(); [LE0, LE1, lerp(LE1, TE1, 0.12), lerp(LE0, TE0, 0.1)].forEach((p) => ctx.lineTo(...P(...p))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
        line([lerp(LE0, TE0, 0.1), lerp(LE1, TE1, 0.12)], 'rgba(110,118,126,0.7)', 0.3);
        // 플랩과 보조날개
        const F0 = lerp(TE0, LE0, 0.26), F1 = lerp(TE1, LE1, 0.24);
        line([F0, F1], 'rgba(110,118,126,0.7)', 0.3);
        for (const t of [0.35, 0.62, 0.78]) line([lerp(TE0, TE1, t), lerp(F0, F1, t)], 'rgba(110,118,126,0.6)', 0.32);
        // 스포일러 판
        for (let k = 0; k < 4; k++) { const t0 = 0.12 + k * 0.12, a = lerp(F0, F1, t0), b = lerp(F0, F1, t0 + 0.1); line([a, b, lerp(b, lerp(LE0, LE1, t0 + 0.1), 0.3), lerp(a, lerp(LE0, LE1, t0), 0.3), a], 'rgba(120,128,136,0.45)', 0.36, 2); }
        // 패널 선
        for (let k = 1; k < 8; k++) { const t = k / 8; line([lerp(LE0, LE1, t), lerp(TE0, TE1, t)], 'rgba(140,148,156,0.25)', 0.44, 2); }
        // 밟지 마세요 구역 경계
        line([[1.3 * m, -10.2], [3.4 * m, -11.4], [3.4 * m, -12.9], [1.3 * m, -12.2], [1.3 * m, -10.2]], 'rgba(60,66,72,0.5)', 0.5, 2);
        // 수평 꼬리날개 승강타
        line([[0.4 * m, -22.2], [4.3 * m, -23.0]], 'rgba(110,118,126,0.7)', 0.3);
      }
    }, 3);
    for (const t of [s.map, s.normalMap, s.roughnessMap]) if (t) { t.repeat.set(1 / 21, 1 / 18); t.offset.set(10.5 / 21, 24.5 / 18); }
    return s;
  }

  function physFrom(s, name, extra = {}) {
    return Mat({
      name, color: 0xffffff, map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap,
      emissiveMap: s.emissiveMap || null, emissive: s.emissiveMap ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0), emissiveIntensity: s.emissiveMap ? 1.4 : 1,
      roughness: 1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, normalScale: new V2(0.6, 0.6), ...extra,
    });
  }

  function plane() {
    seed = 11;
    const g = new THREE.Group(); g.name = 'plane';
    const { L } = PLN;
    // 동체
    const body = physFrom(fuselageSurface(), 'fuselage-paint');
    const rings = [], us = [], SEG = Q(96, 40), ST = Q(160, 70);
    for (let i = 0; i <= ST; i++) {
      const d = (L * (1 - Math.cos((i / ST) * Math.PI))) / 2, r = Math.max(0.015, planeRad(d));
      rings.push(superRing(0, planeCy(d), -d, r, r * 1.05, 2.15, SEG)); us.push(d / L);
    }
    g.add(loft(rings, us, body, 'fuselage'));

    // 날개, 꼬리날개 (같은 텍스처를 위에서 본 좌표로 씀)
    const wingMat = physFrom(wingSurface(), 'wing-paint', { metalness: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.2 });
    for (const s of [1, -1]) {
      const wing = flatPanel([[0.6, -8.0], [9.7, -13.9], [9.9, -15.2], [9.3, -15.3], [0.6, -12.9]].map(([x, z]) => [x * s, z]), 0.36, [0.6, 9.9, 0.32], wingMat, 0.07);
      wing.geometry.rotateX(Math.PI / 2);
      airfoil(wing.geometry, (ax) => { const t = (ax - 0.6) / 9.3; return [-8.0 - 5.9 * t, -12.9 - 2.4 * t]; });
      const p = wing.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.abs(p.getX(i)) * 0.085); // 상반각
      wing.geometry.computeVertexNormals();
      wing.position.y = 1.85; wing.name = 'wing';
      g.add(wing);
      for (const x of [2.6, 4.9, 7.0]) { // 플랩 레일 덮개
        const f = mesh(new THREE.SphereGeometry(1, Q(24, 10), Q(12, 6)), M.navy, 'flap-fairing'), zt = -12.9 - 2.4 * ((x - 0.6) / 9.3);
        f.scale.set(0.14, 0.14, 1.0); f.position.set(x * s, 1.72 + x * 0.085, zt + 0.1); g.add(f);
      }
      const wl = flatPanel([[-13.95, 0], [-15.25, 0], [-15.75, 1.55], [-15.25, 1.55]], 0.1, null, M.orange, 0.05); // 윙렛
      wl.geometry.rotateY(-Math.PI / 2);
      wl.position.set(9.75 * s, 1.85 + 9.75 * 0.085, 0); wl.rotation.z = -0.22 * s; wl.name = 'winglet';
      g.add(wl);
      const nav = mesh(new THREE.SphereGeometry(0.07, 12, 8), s > 0 ? M.green : M.red, 'nav-light'); // 항행등
      nav.position.set(9.85 * s, 1.85 + 9.85 * 0.085, -14.2); g.add(nav);
      const st = flatPanel([[0.3, -19.6], [4.5, -22.4], [4.6, -23.4], [4.0, -23.45], [0.3, -22.6]].map(([x, z]) => [x * s, z]), 0.22, [0.3, 4.6, 0.45], wingMat, 0.05);
      st.geometry.rotateX(Math.PI / 2);
      airfoil(st.geometry, (ax) => { const t = (ax - 0.3) / 4.3; return [-19.6 - 2.8 * t, -22.6 - 0.85 * t]; });
      const sp = st.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setY(i, sp.getY(i) + Math.abs(sp.getX(i)) * 0.06);
      st.geometry.computeVertexNormals();
      st.position.y = 3.25; st.name = 'stabilizer';
      g.add(st);
      g.add(engine(4.1 * s, 1.0, -8.2));
    }
    // 수직 꼬리날개와 뿌리 덮개
    const fin = flatPanel([[-18.6, 0], [-23.25, 0], [-24.15, 4.1], [-22.55, 4.1]], 0.26, null, M.orange, 0.08);
    fin.geometry.rotateY(-Math.PI / 2);
    fin.position.set(0, 3.45, 0); fin.name = 'fin';
    g.add(fin);
    const fillet = mesh(new THREE.SphereGeometry(1, Q(32, 12), Q(16, 8)), M.orange, 'fin-fillet');
    fillet.scale.set(0.16, 0.35, 2.2); fillet.position.set(0, 3.5, -19.6); g.add(fillet);
    const strobe = mesh(new THREE.SphereGeometry(0.06, 12, 8), M.strobe, 'tail-strobe'); strobe.position.set(0, 3.7, -23.75); g.add(strobe);
    const beacon = mesh(new THREE.SphereGeometry(0.1, 16, 8), M.red, 'beacon'); beacon.scale.y = 0.5; beacon.position.set(0, planeCy(10) + PLN.R * 1.05 + 0.02, -10); g.add(beacon);
    const fair = mesh(new THREE.SphereGeometry(1, Q(48, 20), Q(24, 10)), M.navy, 'wing-fairing');
    fair.scale.set(1.18, 0.58, 3.7); fair.position.set(0, 1.58, -10.6); g.add(fair);
    for (const [z, up] of [[-6, 1], [-14, -1]]) { const a = rbox([0.04, 0.32, 0.22], [0, planeCy(-z) + up * (PLN.R * 1.05 + 0.12), z], M.dark, 0.02, 'antenna'); a.rotation.x = -0.35; g.add(a); }
    g.add(gear());
    return g;
  }

  function engine(x, y, z) {
    const e = new THREE.Group(); e.name = 'engine'; e.position.set(x, y, z);
    const lathe = (pts, seg) => { const g = new THREE.LatheGeometry(pts.map(([r, yy]) => new V2(r, yy)), seg); g.rotateX(-Math.PI / 2); return g; };
    e.add(mesh(lathe([[0.56, -0.05], [0.66, 0.06], [0.7, 0.4], [0.69, 1.3], [0.6, 2.1], [0.47, 2.55], [0.44, 2.62]], Q(72, 24)), M.navy, 'nacelle'));
    e.add(mesh(lathe([[0.5, 2.0], [0.5, 0.02], [0.56, -0.05]], Q(48, 16)), M.dark, 'intake'));
    const lip = mesh(new THREE.TorusGeometry(0.6, 0.06, Q(16, 6), Q(72, 24)), M.chrome, 'intake-lip'); lip.position.z = 0.02; e.add(lip);
    const sp = mesh(lathe([[0.001, -0.42], [0.08, -0.38], [0.16, -0.26], [0.2, -0.1], [0.2, 0]], Q(32, 12)), M.titanium, 'spinner'); sp.position.z = -0.3; e.add(sp);
    const blade = new THREE.BoxGeometry(0.07, 0.3, 0.012); blade.translate(0, 0.35, 0);
    const NB = Q(22, 12); for (let k = 0; k < NB; k++) { const b = mesh(blade, M.titanium, 'fan-blade'); b.rotation.z = (k / NB) * TAU; b.rotateY(0.55); b.position.z = -0.32; e.add(b); }
    const ex = mesh(lathe([[0.36, 0], [0.33, 0.3], [0.2, 0.75], [0.02, 1.0]], Q(32, 12)), M.titanium, 'exhaust'); ex.position.z = -2.55; e.add(ex);
    const ring = mesh(new THREE.TorusGeometry(0.45, 0.02, Q(8, 4), Q(48, 16)), M.metal); ring.position.z = -2.62; e.add(ring);
    const py = rbox([0.17, 0.6, 2.6], [0, 0.6, -1.3], M.navy, 0.08, 'pylon'); py.rotation.x = -0.06; e.add(py);
    return e;
  }

  function gear() {
    const gr = new THREE.Group(); gr.name = 'gear';
    const tire = (x, y, z, r, w) => {
      const t = mesh(new THREE.TorusGeometry(r - 0.07, 0.08, Q(16, 6), Q(40, 14)), M.rubber, 'tire'); t.rotation.y = Math.PI / 2; t.position.set(x, y, z); t.scale.z = w / 0.16; gr.add(t);
      const hub = mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w * 0.9, Q(28, 10)), M.metal, 'hub'); hub.rotation.z = Math.PI / 2; hub.position.set(x, y, z); gr.add(hub);
      const cap = mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, w * 0.95, Q(20, 8)), M.chrome); cap.rotation.z = Math.PI / 2; cap.position.set(x, y, z); gr.add(cap);
    };
    const cyl = (r, h, at, mat) => { const m = mesh(new THREE.CylinderGeometry(r, r, h, 16), mat); m.position.set(...at); gr.add(m); };
    for (const s of [1, -1]) {
      const x = 1.6 * s;
      cyl(0.09, 1.1, [x, 0.95, -12.1], M.chrome); cyl(0.12, 0.45, [x, 1.3, -12.1], M.dark);
      gr.add(rbox([0.12, 0.12, 0.95], [x, 0.36, -12.1], M.dark, 0.04));
      for (const dz of [-0.36, 0.36]) for (const dx of [-0.17, 0.17]) tire(x + dx, 0.36, -12.1 + dz, 0.36, 0.2);
      gr.add(rbox([0.04, 0.95, 0.8], [x + 0.35 * s, 1.15, -12.1], M.navy, 0.02, 'gear-door'));
    }
    cyl(0.07, 1.05, [0, 0.95, -2.7], M.chrome);
    gr.add(rbox([0.05, 0.9, 0.7], [0.32, 1.3, -2.7], M.paint, 0.02, 'gear-door'));
    for (const dx of [-0.12, 0.12]) tire(dx, 0.27, -2.7, 0.27, 0.15);
    const lamp = mesh(new THREE.SphereGeometry(0.06, 12, 8), M.light, 'taxi-light'); lamp.position.set(0, 1.25, -2.55); gr.add(lamp);
    return gr;
  }

  // ======================================================================
  // KTX
  // ======================================================================
  const TR = { W: 1.05, H: 2.3, FY: 1.2, noseL: 4.4, noseTip: 0.3, noseLift: 0.38, n: 3.4, cars: [{ from: -4.4, to: -9.6 }, { from: -9.9, to: -16.1 }, { from: -16.4, to: -22.6 }, { from: -22.9, to: -29.1 }] };
  // 코 단면: 몸체 쪽(t = 0)에서는 기울기가 0이라 몸체와 끊김 없이 이어지고, 끝(t = 1)에서는 저절로 둥글게 닫힘
  const noseShape = (t) => {
    const k = Math.min(1, t), s = k * k * (3 - 2 * k);
    return { w: TR.W * Math.pow(1 - Math.pow(k, 2.6), 0.56), h: TR.H * Math.pow(1 - k * k, 0.8), n: TR.n - (TR.n - 2) * s, y: TR.FY + TR.noseLift * k * k * k };
  };
  const trainSec = (z, w, h, n = TR.n, base = TR.FY) => superRing(0, base + h / 2, z, w, h / 2, n, Q(128, 44), base + 0.02 * Math.min(1, h / TR.H));

  function carSurface(len, opts) {
    const W = 2048 * TS, H = 1024 * TS, X = (u) => (u / len) * W, Y = (a) => (1 - (((a % TAU) + TAU) % TAU) / TAU) * H;
    const cy = TR.FY + TR.H / 2, ry = TR.H / 2, A = (y) => angAt(y, cy, ry, TR.n);
    return surface(W, H, PAL.paint, 0.3, ({ c, h, r }) => {
      // 높이 y0 ~ y1, 길이 x0 ~ x1 칸을 양쪽 옆면에 칠함
      const band = (y0, y1, x0, x1, fill, rv, hv) => {
        for (const side of [1, -1]) {
          const a0 = A(y0), a1 = A(y1);
          const [p, q] = side > 0 ? [Y(a1), Y(a0)] : [Y(Math.PI - a0), Y(Math.PI - a1)];
          const top = Math.min(p, q), hh = Math.abs(q - p);
          c.fillStyle = fill; c.fillRect(X(x0), top, X(x1 - x0), hh);
          if (rv !== undefined) { r.fillStyle = rough(rv); r.fillRect(X(x0), top, X(x1 - x0), hh); }
          if (hv !== undefined) { h.fillStyle = height(hv); h.fillRect(X(x0), top, X(x1 - x0), hh); }
        }
      };
      // 지붕은 살짝 회색, 아래는 남색
      c.fillStyle = PAL.roof; c.fillRect(0, Y(Math.PI / 2 + 0.75), W, Y(Math.PI / 2 - 0.75) - Y(Math.PI / 2 + 0.75));
      const sk = A(TR.FY + 0.42);
      for (const [ctx, fill] of [[c, PAL.navy], [r, rough(0.4)]]) { ctx.fillStyle = fill; ctx.fillRect(0, Y(TAU + sk), W, Y(Math.PI - sk) - Y(TAU + sk)); }
      band(TR.FY + 0.52, TR.FY + 0.64, 0, len, PAL.orange);
      // 창: 짙은 띠와 창 사이 기둥, 위쪽 하늘 반사
      band(TR.FY + 1.24, TR.FY + 1.76, 0.35, len - 0.35, '#1A2633', 0.06, 0.4);
      for (let u = 1.0; u < len - 0.9; u += 1.05) band(TR.FY + 1.24, TR.FY + 1.76, u - 0.04, u + 0.04, '#2C3A47', 0.3, 0.6);
      band(TR.FY + 1.62, TR.FY + 1.74, 0.35, len - 0.35, 'rgba(150,180,205,0.2)');
      // 문
      for (const u of opts.doors) {
        band(TR.FY + 0.08, TR.FY + 2.08, u - 0.42, u + 0.42, PAL.paint, 0.3, 0.5);
        band(TR.FY + 0.52, TR.FY + 0.64, u - 0.42, u + 0.42, PAL.orange);
        for (const side of [1, -1]) {
          const a0 = A(TR.FY + 0.08), a1 = A(TR.FY + 2.08), y0 = side > 0 ? Y(a1) : Y(Math.PI - a0), y1 = side > 0 ? Y(a0) : Y(Math.PI - a1);
          for (const [ctx, col, lw] of [[c, 'rgba(110,118,126,0.7)', 3], [h, height(0.2), 5]]) { rrect(ctx, X(u - 0.42), y0, X(0.84), y1 - y0, 12); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); }
        }
        band(TR.FY + 1.3, TR.FY + 1.74, u - 0.18, u + 0.18, '#1A2633', 0.06, 0.35);
      }
      // 패널 이음선과 글자
      c.save(); c.globalAlpha = 0.16; c.strokeStyle = '#7F888F'; c.lineWidth = 2;
      for (let u = 0.15; u < len; u += len / 4) { c.beginPath(); c.moveTo(X(u), 0); c.lineTo(X(u), H); c.stroke(); }
      c.restore();
      for (const side of [1, -1]) {
        c.save(); c.translate(X(len / 2), side > 0 ? Y(A(TR.FY + 0.95)) : Y(Math.PI - A(TR.FY + 0.95))); if (side < 0) c.rotate(Math.PI);
        c.scale(1, ((H / TAU) / (W / len)) * 1.6); c.font = `700 ${48 * TS}px SUIT, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = PAL.navy; c.fillText(opts.label, 0, 0); c.restore();
      }
    }, 4);
  }

  function noseSurface() {
    const W = 2048 * TS, H = 1024 * TS, X = (t) => t * W, Y = (a) => (1 - (((a % TAU) + TAU) % TAU) / TAU) * H;
    // 높이를 고리 안의 비율(v: 바닥 0, 꼭대기 1)로 다룸. 색 띠가 표면을 따라 코끝으로 모여서 몸체의 선과 그대로 이어짐
    const R = (t, v) => angAt(2 * v - 1, 0, 1, noseShape(t).n), V = 1 / TR.H;
    const fade = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
    return surface(W, H, PAL.paint, 0.3, ({ c, h, r, e }) => {
      // 지붕의 옅은 회색은 몸체에서 이어져 앞으로 갈수록 흰색에 녹음
      const roof = c.createLinearGradient(X(0), 0, X(0.42), 0); roof.addColorStop(0, PAL.roof); roof.addColorStop(1, PAL.paint);
      c.fillStyle = roof; c.fillRect(0, Y(Math.PI / 2 + 0.75), X(0.42), Y(Math.PI / 2 - 0.75) - Y(Math.PI / 2 + 0.75));
      // 남색 치마는 턱 아래로 가늘어지며 사라짐 (코끝은 깨끗한 흰색)
      const skirt = (t) => 0.42 * V * (1 - fade(0.5, 0.94, t));
      for (const [ctx, fill] of [[c, PAL.navy], [r, rough(0.4)]]) {
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.01) ctx.lineTo(X(t), Y(Math.PI - R(Math.min(t, 1), skirt(t))));
        for (let t = 1; t >= -0.0001; t -= 0.01) ctx.lineTo(X(t), Y(TAU + R(Math.max(t, 0), skirt(t))));
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      }
      // 주황 선은 몸체 높이에서 시작해 앞으로 흐르며 뾰족하게 끝남
      const END = 0.74, stripe = (t) => { const k = Math.min(t, END) / END; return [0.52 * V + 0.02 * k * k, 0.12 * V * (1 - k * k)]; };
      for (const side of [1, -1]) {
        c.beginPath();
        for (let t = 0; t <= END + 0.0001; t += 0.01) { const [v] = stripe(t), a = R(t, v); c.lineTo(X(t), Y(side > 0 ? a : Math.PI - a)); }
        for (let t = END; t >= -0.0001; t -= 0.01) { const [v, w] = stripe(Math.max(t, 0)), a = R(Math.max(t, 0), v + w); c.lineTo(X(Math.max(t, 0)), Y(side > 0 ? a : Math.PI - a)); }
        c.closePath(); c.fillStyle = PAL.orange; c.fill();
      }
      // 앞유리: 모서리 없이 둥글게 흐르는 윤곽
      const blob = (ctx, pts) => {
        const P = pts.map(([t, da]) => [X(t), Y(Math.PI / 2 + da)]), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = P.length;
        ctx.beginPath(); ctx.moveTo(...mid(P[n - 1], P[0]));
        for (let i = 0; i < n; i++) ctx.quadraticCurveTo(...P[i], ...mid(P[i], P[(i + 1) % n]));
        ctx.closePath();
      };
      const glass = [[0.25, 0.7], [0.44, 0.62], [0.64, 0.4], [0.64, -0.4], [0.44, -0.62], [0.25, -0.7]];
      for (const [ctx, fill] of [[c, '#111A24'], [r, rough(0.03)], [h, height(0.34)]]) {
        blob(ctx, glass); ctx.fillStyle = fill; ctx.fill();
        if (ctx === h) { ctx.strokeStyle = height(0.7); ctx.lineWidth = 8; ctx.stroke(); }
      }
      c.fillStyle = 'rgba(150,180,205,0.22)'; blob(c, [[0.27, 0.56], [0.4, 0.5], [0.42, -0.5], [0.27, -0.56]]); c.fill();
      // 전조등: 표면을 따라 흐르고 양 끝이 뾰족해지는 가는 눈매
      for (const side of [1, -1]) {
        const lens = (ctx, half, fill) => {
          const T0 = 0.62, T1 = 0.8, N = 24, at = (q, sign) => { const t = T0 + (T1 - T0) * q, a = R(t, 0.4 + sign * half * Math.pow(Math.sin(Math.PI * q), 0.7)); return [X(t), Y(side > 0 ? a : Math.PI - a)]; };
          ctx.beginPath();
          for (let k = 0; k <= N; k++) ctx.lineTo(...at(k / N, 1));
          for (let k = N; k >= 0; k--) ctx.lineTo(...at(k / N, -1));
          ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
        };
        lens(c, 0.032, '#1A2633');
        lens(c, 0.016, '#FFF3D6'); lens(e, 0.016, '#FFF3D6');
      }
    }, 4, true);
  }

  function noseMesh(dir, mat) {
    const rings = [], us = [], ST = Q(72, 30), L = TR.noseL, Z = (t) => -L + (L + TR.noseTip) * t;
    for (let i = 0; i <= ST; i++) {
      const t = 1 - Math.pow(1 - i / ST, 1.8), s = noseShape(t); // 곡률이 큰 코끝에 고리를 더 촘촘히
      rings.push(trainSec(Z(t), Math.max(0.004, s.w), Math.max(0.004, s.h), s.n, s.y)); us.push(t);
    }
    rings.push(collapse(rings[rings.length - 1])); us.push(1);
    // 몸체 쪽은 막지 않음(막으면 이음매에 음영 선이 생김). 틈이 보이지 않게 몸체 안으로 살짝 겹침
    rings.unshift(trainSec(-L - 0.03, TR.W, TR.H)); us.unshift(0);
    const list = dir > 0 ? rings : rings.map((r) => r.map((v) => new V3(v.x, v.y, -v.z)));
    return loft(list, us, mat, dir > 0 ? 'nose-front' : 'nose-rear');
  }

  function ktx() {
    seed = 21;
    const g = new THREE.Group(); g.name = 'ktx';
    const noseMat = physFrom(noseSurface(), 'nose-paint');
    g.add(noseMesh(1, noseMat));
    TR.cars.forEach((car, ci) => {
      const isLast = ci === TR.cars.length - 1;
      const to = isLast ? car.to + TR.noseL : car.to, len = car.from - to; // 마지막 칸 끝은 뒤 코가 이어받음
      const doors = ci === 0 ? [len - 0.8] : isLast ? [0.8] : [0.8, len - 0.8];
      const mat = physFrom(carSurface(len, { doors, label: ci === 0 || isLast ? 'eodi' : 'KTX' }), 'car-paint-' + (ci + 1));
      const rings = [], us = [], ST = Q(24, 6);
      for (let i = 0; i <= ST; i++) {
        const u = i / ST, z = car.from + (to - car.from) * u, edge = Math.min(ci > 0 ? u * len : Infinity, !isLast ? (1 - u) * len : Infinity); // 코와 만나는 쪽은 줄이지 않음
        const soft = edge < 0.2 ? 0.965 + 0.035 * Math.sin((edge / 0.2) * Math.PI / 2) : 1; // 끝 모서리를 둥글게
        rings.push(trainSec(z, TR.W * soft, TR.H * (0.985 + 0.015 * soft))); us.push(u);
      }
      if (ci > 0) { rings.unshift(collapse(rings[0])); us.unshift(0); }
      if (!isLast) { rings.push(collapse(rings[rings.length - 1])); us.push(1); }
      g.add(loft(rings, us, mat, 'car-' + (ci + 1)));
      for (const bz of [car.from - 1.5, to + 1.5]) g.add(bogie(bz));
      g.add(rbox([1.7, 0.32, Math.max(0.5, len - 4.6)], [0, TR.FY - 0.12, (car.from + to) / 2], M.dark, 0.08, 'underframe'));
      g.add(rbox([1.2, 0.16, 1.6], [0, TR.FY + TR.H + 0.04, (car.from + to) / 2 + 1.2], M.paint, 0.08, 'roof-unit'));
      if (ci === 1) g.add(pantograph((car.from + to) / 2 - 1.2));
      if (ci > 0) g.add(rbox([1.75, 2.05, 0.44], [0, TR.FY + 1.05, car.from + 0.15], M.rubber, 0.16, 'gangway'));
      if (isLast) { const tail = noseMesh(-1, noseMat); tail.position.z = car.to; g.add(tail); }
    });
    return g;
  }

  function bogie(z) {
    const b = new THREE.Group(); b.name = 'bogie';
    b.add(rbox([1.62, 0.22, 2.3], [0, TR.FY - 0.16, z], M.dark, 0.08));
    const cyl = (r, h, seg, at, mat, rotZ = true) => { const m = mesh(new THREE.CylinderGeometry(r, r, h, Q(seg, Math.max(8, Math.round(seg / 3)))), mat); if (rotZ) m.rotation.z = Math.PI / 2; m.position.set(...at); b.add(m); return m; };
    for (const dz of [-0.62, 0.62]) {
      const wy = 1.0; // 레일 윗면 0.70 + 바퀴 반지름 0.30
      cyl(0.06, 1.7, 12, [0, wy, z + dz], M.metal);
      for (const sx of [-0.72, 0.72]) {
        cyl(0.3, 0.1, 40, [sx, wy, z + dz], M.dark);
        cyl(0.33, 0.03, 40, [sx - Math.sign(sx) * 0.06, wy, z + dz], M.dark);
        cyl(0.21, 0.06, 32, [sx * 0.6, wy, z + dz], M.titanium);
        const spring = mesh(new THREE.TorusGeometry(0.11, 0.025, Q(8, 4), Q(24, 8)), M.titanium); spring.rotation.x = Math.PI / 2; spring.position.set(sx, 1.08, z + dz * 0.6); spring.scale.z = 2.5; b.add(spring);
      }
    }
    return b;
  }

  function pantograph(z) {
    const p = new THREE.Group(); p.name = 'pantograph';
    const top = TR.FY + TR.H + 0.02;
    for (const sx of [-0.45, 0.45]) for (const dz of [-0.5, 0.5]) { const ins = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 12), M.dark); ins.position.set(sx, top + 0.09, z + dz); p.add(ins); }
    p.add(rbox([1.0, 0.06, 1.2], [0, top + 0.2, z], M.metal, 0.02));
    const arm = (from, to) => { const d = new V3().subVectors(to, from), m = mesh(new THREE.CylinderGeometry(0.025, 0.025, d.length(), 8), M.chrome); m.position.copy(from).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); p.add(m); };
    const a = new V3(0, top + 0.22, z - 0.4), b = new V3(0, top + 0.75, z + 0.35), c = new V3(0, top + 1.05, z - 0.1);
    for (const sx of [-0.12, 0.12]) { arm(a.clone().setX(sx), b.clone().setX(sx)); arm(b.clone().setX(sx), c.clone().setX(sx * 0.5)); }
    p.add(rbox([1.3, 0.05, 0.12], [0, top + 1.07, z - 0.1], M.dark, 0.02, 'collector'));
    return p;
  }

  // ======================================================================
  // 역, 공항 구조물: 콘크리트 결, 줄눈, 점자블록, 유리 창틀
  // ======================================================================
  function tiled(draw, size, base, roughV, ns = 2) { const s = surface(size, size, base, roughV, draw, ns); for (const t of [s.map, s.normalMap, s.roughnessMap]) if (t) t.wrapS = t.wrapT = THREE.RepeatWrapping; return s; }
  let SURF = null;
  function surfaces() {
    if (SURF) return SURF;
    seed = 31;
    const stains = (c, w, col, n) => { for (let k = 0; k < n; k++) { const x = rnd() * w, y = rnd() * w, r = 20 + rnd() * 90, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); } };
    const frame = (c, h, w, col, hv, lw) => { c.strokeStyle = col; h.strokeStyle = height(hv); c.lineWidth = lw; h.lineWidth = lw + 1; c.strokeRect(0, 0, w, w); h.strokeRect(0, 0, w, w); };
    SURF = {
      concrete: tiled(({ c, h, w }) => { stains(c, w, 'rgba(120,120,110,0.07)', 26); frame(c, h, w, 'rgba(120,124,126,0.35)', 0.3, 2); }, 512, PAL.concrete, 0.88),
      side: tiled(({ c, w }) => { stains(c, w, 'rgba(90,96,100,0.08)', 20); }, 512, PAL.concreteSide, 0.9),
      tactile: tiled(({ c, h, w }) => { for (let y = 16; y < w; y += 32) for (let x = 16; x < w; x += 32) for (const [ctx, f] of [[c, 'rgba(255,255,255,0.18)'], [h, height(0.85)]]) { ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fillStyle = f; ctx.fill(); } }, 256, PAL.tactile, 0.6, 5),
      roof: tiled(({ c, h, w }) => { for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(160,168,174,0.25)'; c.fillRect(x, 0, 2, w); h.fillStyle = height(0.75); h.fillRect(x, 0, 3, w); } }, 512, '#EEF0F0', 0.4, 3),
      glass: tiled(({ c, h, r, w }) => { for (const [ctx, f] of [[c, '#E6EBEE'], [r, rough(0.4)], [h, height(0.7)]]) { ctx.fillStyle = f; ctx.fillRect(0, 0, w, 14); ctx.fillRect(0, 0, 14, w); } }, 512, PAL.skyGlass, 0.04),
      gravel: tiled(({ c, h, w }) => { for (let k = 0; k < 2600; k++) { const x = rnd() * w, y = rnd() * w, rr = 3 + rnd() * 7, v = 150 + rnd() * 90; c.fillStyle = `rgb(${v | 0},${(v - 4) | 0},${(v - 12) | 0})`; c.beginPath(); c.ellipse(x, y, rr, rr * 0.8, rnd() * 3, 0, TAU); c.fill(); h.fillStyle = height(0.5 + rnd() * 0.4); h.beginPath(); h.ellipse(x, y, rr, rr * 0.8, 0, 0, TAU); h.fill(); } }, 512, '#A9A39A', 0.95, 4),
      asphalt: tiled(({ c, h, w }) => { stains(c, w, 'rgba(40,44,48,0.1)', 30); for (let k = 0; k < 3000; k++) { const x = rnd() * w, y = rnd() * w; c.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '20,22,24'},0.08)`; c.fillRect(x, y, 2, 2); } frame(c, h, w, 'rgba(50,54,58,0.35)', 0.35, 2); }, 512, '#7E888F', 0.92, 2),
      mark: tiled(({ c, w }) => { stains(c, w, 'rgba(120,124,126,0.12)', 18); }, 256, '#F2F3F1', 0.7, 1),
      apron: tiled(({ c, h, w }) => { stains(c, w, 'rgba(110,110,100,0.08)', 30); frame(c, h, w, 'rgba(110,114,116,0.45)', 0.25, 3); }, 512, '#DDDFDB', 0.9),
    };
    return SURF;
  }
  // 상자 하나에 표면을 입힘. 무늬는 실제 크기에 맞춰 반복 (1장 = tile 단위)
  function skin(kind, size, tile, extra = {}) {
    const s = surfaces()[kind], [w, h, d] = size;
    const rep = new V2(Math.max(0.2, Math.max(w, d) / tile), Math.max(0.2, Math.max(h, d, w) / tile));
    const cl = (t) => { const c = t.clone(); c.repeat.copy(rep); c.needsUpdate = true; return c; };
    return Mat({ name: kind, color: 0xffffff, map: cl(s.map), normalMap: s.normalMap ? cl(s.normalMap) : null, roughnessMap: cl(s.roughnessMap), roughness: 1, metalness: 0, normalScale: new V2(0.5, 0.5), ...extra });
  }
  const kindOf = { platformTop: 'concrete', building: 'side', canopy: 'roof', glass: 'glass', safetyLine: 'tactile', pillar: 'side' };
  function boxFromSpec(b) {
    const [w, h, d] = b.size, thin = Math.min(w, h, d);
    if (/pillar/.test(b.id)) { const c = mesh(new THREE.CylinderGeometry(w / 2, (w / 2) * 1.08, h, 32), skin('side', b.size, 2), b.id); c.position.set(...b.pos); return c; }
    const kind = kindOf[b.color] || 'concrete', r = thin < 0.06 ? thin / 2 : Math.min(0.14, thin * 0.2);
    const extra = kind === 'glass' ? { metalness: 0.3, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.02 } : {};
    return rbox(b.size, b.pos, skin(kind, b.size, kind === 'tactile' ? 0.6 : kind === 'glass' ? 2.4 : 4, extra), r, b.id);
  }
  function station(spec) {
    seed = 41;
    const g = new THREE.Group(); g.name = 'station';
    spec.boxes.forEach((b) => g.add(boxFromSpec(b)));
    const B = spec.board, bg = new THREE.Group(); bg.name = 'board';
    bg.position.set(...B.pos); bg.rotation.y = Math.atan2(spec.pov.eye[0] - B.pos[0], spec.pov.eye[2] - B.pos[2]);
    bg.add(rbox([B.w, B.h, 0.14], [0, 0, 0], M.navy, 0.06, 'board-panel'));
    const leg = B.pos[1] - B.h / 2 - 1;
    for (const s of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(0.06, 0.06, leg, 16), M.metal); c.position.set(B.w * 0.36 * s, -B.h / 2 - leg / 2, 0); bg.add(c); }
    g.add(bg);
    // 선로: 자갈 둑, 콘크리트 침목과 체결구, 레일 단면, 닳아 반짝이는 윗면
    const T = spec.track, tr = new THREE.Group(); tr.name = 'track';
    const bedShape = new THREE.Shape([new V2(-T.bed.w / 2 - 0.3, 0), new V2(T.bed.w / 2 + 0.3, 0), new V2(T.bed.w / 2 - 0.1, T.bed.h + 0.1), new V2(-T.bed.w / 2 + 0.1, T.bed.h + 0.1)]);
    const bed = mesh(new THREE.ExtrudeGeometry(bedShape, { depth: 60, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.08, bevelSegments: 3 }), skin('gravel', [3, 1, 3], 1.5), 'ballast');
    bed.position.set(T.bed.x, 0, -30); tr.add(bed);
    const slp = skin('side', [2.4, 0.2, 0.4], 2);
    for (let z = -29.4; z <= 29.4; z += T.sleeper.spacing) {
      tr.add(rbox([T.sleeper.w, T.sleeper.h, T.sleeper.d], [0, T.sleeper.y, z], slp, 0.04));
      for (const x of T.rail.xs) for (const s of [-1, 1]) tr.add(rbox([0.1, 0.06, 0.16], [x + s * 0.13, T.sleeper.y + 0.1, z], M.dark, 0.02));
    }
    const railShape = new THREE.Shape([[-0.075, 0], [0.075, 0], [0.075, 0.025], [0.02, 0.04], [0.02, 0.12], [0.04, 0.13], [0.04, 0.16], [-0.04, 0.16], [-0.04, 0.13], [-0.02, 0.12], [-0.02, 0.04], [-0.075, 0.025]].map(([x, y]) => new V2(x, y)));
    for (const x of T.rail.xs) {
      const rail = mesh(new THREE.ExtrudeGeometry(railShape, { depth: 60, bevelEnabled: false }), M.metal, 'rail'); rail.position.set(x, T.rail.y - 0.08, -30); tr.add(rail);
      tr.add(rbox([0.08, 0.012, 60], [x, T.rail.y + 0.085, 0], M.chrome, 0.004, 'rail-head'));
    }
    g.add(tr);
    return g;
  }
  function airport(spec) {
    seed = 51;
    const A = spec.airport, g = new THREE.Group(); g.name = 'airport';
    const glassX = { metalness: 0.3, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.02 };
    for (const b of A.boxes) {
      if (b.id === 'apron') { g.add(rbox(b.size, b.pos, skin('apron', b.size, 6), 0.08, b.id)); continue; }
      if (b.id === 'tower') { const c = mesh(new THREE.CylinderGeometry(0.62, 0.74, b.size[1], 48), skin('side', b.size, 3), b.id); c.position.set(...b.pos); g.add(c); continue; }
      if (b.id === 'tower-cab') { const c = mesh(new THREE.CylinderGeometry(1.8, 1.45, b.size[1], 12), skin('glass', [6, 1.6, 6], 1.6, glassX), b.id); c.position.set(...b.pos); g.add(c); continue; }
      if (b.id === 'tower-top') {
        const c = mesh(new THREE.CylinderGeometry(2.05, 2.0, 0.26, 48), skin('roof', [4, 0.3, 4], 4), b.id); c.position.set(...b.pos); g.add(c);
        const ant = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), M.metal); ant.position.set(b.pos[0], b.pos[1] + 0.8, b.pos[2]); g.add(ant);
        continue;
      }
      if (b.id === 'jet-bridge') {
        g.add(rbox(b.size, b.pos, skin('side', b.size, 3), 0.4, b.id));
        for (let k = -2; k <= 2; k++) g.add(rbox([0.12, b.size[1] + 0.06, b.size[2] + 0.06], [b.pos[0] + k * 1.6, b.pos[1], b.pos[2]], skin('side', [0.2, 1.2, 1.2], 3), 0.05)); // 주름 마디
        continue;
      }
      g.add(boxFromSpec(b));
    }
    const R = A.roof, shape = new THREE.Shape();
    shape.moveTo(R.x[0], 0); shape.quadraticCurveTo((R.x[0] + R.x[1]) / 2, R.rise, R.x[1], 0); shape.lineTo(R.x[0], 0);
    const rg = new THREE.ExtrudeGeometry(shape, { depth: R.z[1] - R.z[0] - 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 5, curveSegments: 48 });
    const roof = mesh(rg, skin('roof', [7, 2, 19], 1.2), 'roof'); roof.position.set(0, R.y, R.z[0] + 0.15); g.add(roof);
    return g;
  }

  const heroKind = { platformTop: 'concrete', platformSide: 'side', safetyLine: 'tactile', canopy: 'roof', pillar: 'side', building: 'side', glass: 'glass', trackBed: 'gravel', sleeper: 'side', asphalt: 'asphalt', mark: 'mark', line: 'mark' };
  const tileOf = { tactile: 0.6, glass: 2.4, gravel: 1.5, mark: 2, asphalt: 6, apron: 6 };
  function skinFor(colorKey, size, extra = {}) {
    const kind = heroKind[colorKey] || 'concrete';
    const glassX = kind === 'glass' ? { metalness: 0.3, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.02 } : {};
    return skin(kind, size, tileOf[kind] || 4, { ...glassX, ...extra });
  }
  const radiusFor = (size) => { const thin = Math.min(...size); return thin < 0.06 ? thin / 2 : Math.min(0.14, thin * 0.2); };
  // 같은 재질을 쓰는 조각을 한 덩어리로 합쳐 그리는 횟수를 줄임 (모양은 그대로)
  function merge(root) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), byMat = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (g.index) g = g.toNonIndexed();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
    });
    const out = new THREE.Group(); out.name = root.name;
    for (const [m, list] of byMat) {
      const geo = new THREE.BufferGeometry();
      for (const [key, size] of [['position', 3], ['normal', 3], ['uv', 2]]) {
        const total = list.reduce((a, g) => a + g.attributes[key].count * size, 0), arr = new Float32Array(total);
        let o = 0;
        for (const g of list) { const a = g.attributes[key]; for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[o++] = a.array[i * a.itemSize + k] ?? a.getComponent?.(i, k); }
        geo.setAttribute(key, new THREE.BufferAttribute(arr, size));
      }
      geo.computeBoundingSphere();
      const mm = mesh(geo, m, m.name); out.add(mm);
    }
    return out;
  }

  window.EODI_MODELS = { PAL, materials: M, roundedBox, plane, ktx, station, airport, skinFor, radiusFor, merge };
})();

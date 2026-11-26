// 승강장과 계류장의 작은 오브제: 의자, 가로등, 휴지통, 고깔, 게이트 좌석·팔걸이·다리, 캐리어, 줄 기둥, 조명탑, 수하물 카트, 견인차, 계류장 버스, 급유차, 탑승교, 탑승구 문, 관제탑 윗부분, 옥상 실외기, 캐노피 기둥머리를 실제 형태로 깎은 모델
// 모두 바닥(y 0)에 서 있고, 앞(사람이 앉거나 빛이 나가는 쪽)이 -x를 보도록 만듦. 조명탑만 빛이 +z로 나감
// 모델 하나는 [{ geo, mat }] 조각 목록. mat은 scene.js의 디테일 재질 이름 (wood, iron, graphite, brushed, light, seat, white, navy, dark)
(function () {
  window.EODI_OBJECTS = function (THREE, MD) {
    const V3 = THREE.Vector3, V2 = THREE.Vector2;
    // 같은 재질 조각을 한 덩어리로 합침 (그리는 횟수 줄이기)
    function merge(list) {
      const gs = list.map((g) => { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; });
      const out = new THREE.BufferGeometry();
      for (const [k, n] of [['position', 3], ['normal', 3], ['uv', 2]]) {
        const arr = new Float32Array(gs.reduce((a, g) => a + g.attributes[k].count * n, 0)); let o = 0;
        for (const g of gs) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
        out.setAttribute(k, new THREE.BufferAttribute(arr, n));
      }
      out.computeBoundingSphere();
      return out;
    }
    const tube = (pts, r, seg = 16) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p))), seg, r, 8, false);
    const cap = (p, r) => new THREE.SphereGeometry(r, 10, 8).translate(...p); // 관 끝 마감
    const rbox = (w, h, d, r, x, y, z, rz = 0) => { const g = MD.roundedBox(w, h, d, r, 2); if (rz) g.rotateZ(rz); return g.translate(x, y, z); };
    const cyl = (r0, r1, h, y, seg = 20) => new THREE.CylinderGeometry(r0, r1, h, seg).translate(0, y + h / 2, 0);
    const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([x, y]) => new V2(x, y)), seg);
    const build = (parts) => Object.entries(parts).map(([mat, list]) => ({ mat, geo: merge(list) }));

    // ---------- 승강장 의자: 주철 옆틀 두 개, 원목 살 다섯(앉는 곳) + 셋(등받이), 팔걸이 ----------
    function bench() {
      const iron = [], wood = [], L = 1.9;
      for (const z of [-L / 2 + 0.12, L / 2 - 0.12]) {
        iron.push(tube([[-0.21, 0.01, z], [-0.225, 0.22, z], [-0.235, 0.42, z]], 0.024, 10));                 // 앞다리
        iron.push(tube([[-0.25, 0.415, z], [-0.05, 0.4, z], [0.15, 0.405, z]], 0.02, 10));                   // 앉는 곳 받침
        iron.push(tube([[0.12, 0.01, z], [0.15, 0.2, z], [0.16, 0.41, z], [0.2, 0.62, z], [0.27, 0.87, z]], 0.022, 18)); // 뒷다리와 등받이 곡선
        iron.push(tube([[-0.235, 0.42, z], [-0.2, 0.6, z], [-0.05, 0.645, z], [0.19, 0.64, z]], 0.018, 14)); // 팔걸이
        iron.push(cap([-0.21, 0.012, z], 0.03), cap([0.12, 0.012, z], 0.03), cap([0.27, 0.87, z], 0.024));
        iron.push(tube([[-0.215, 0.12, z], [-0.03, 0.1, z], [0.135, 0.12, z]], 0.012, 8));                   // 다리 사이 보강
      }
      for (let k = 0; k < 5; k++) wood.push(rbox(0.072, 0.032, L, 0.012, -0.21 + k * 0.083, 0.445 - k * 0.004, 0));
      for (let k = 0; k < 3; k++) { const t = 0.25 + k * 0.28, x = 0.16 + (0.27 - 0.16) * t * 1.05, y = 0.47 + (0.87 - 0.47) * t; wood.push(rbox(0.032, 0.085, L, 0.012, x + 0.03, y, 0, -0.27)); }
      return build({ iron, wood });
    }

    // ---------- 승강장 가로등: 가늘어지는 기둥, 굽은 팔, 얇은 등기구와 빛나는 렌즈 ----------
    function lamp() {
      const graphite = [], light = [];
      graphite.push(cyl(0.13, 0.14, 0.05, 0));                 // 바닥판
      graphite.push(cyl(0.075, 0.09, 0.32, 0.05));             // 받침 장식
      graphite.push(cyl(0.042, 0.058, 3.0, 0.37));             // 기둥
      graphite.push(tube([[0, 3.3, 0], [0, 3.42, 0], [-0.12, 3.5, 0], [-0.35, 3.52, 0], [-0.62, 3.51, 0]], 0.028, 20)); // 굽은 팔
      graphite.push(cap([0, 3.36, 0], 0.045));
      graphite.push(rbox(0.66, 0.07, 0.22, 0.03, -0.86, 3.49, 0)); // 등기구
      light.push(rbox(0.56, 0.014, 0.15, 0.006, -0.86, 3.452, 0)); // 렌즈 (밤에 켜짐)
      return build({ graphite, light });
    }

    // ---------- 휴지통: 스테인리스 원통, 어두운 뚜껑 ----------
    function bin() {
      const brushed = [lathe([[0, 0], [0.15, 0], [0.165, 0.015], [0.17, 0.05], [0.17, 0.62], [0.175, 0.64], [0, 0.64]])];
      const graphite = [lathe([[0, 0.64], [0.182, 0.64], [0.186, 0.66], [0.17, 0.7], [0.11, 0.735], [0.05, 0.745], [0, 0.745]])];
      graphite.push(new THREE.TorusGeometry(0.17, 0.008, 6, 28).rotateX(Math.PI / 2).translate(0, 0.33, 0));
      return build({ brushed, graphite });
    }

    // ---------- 고깔: 고무 받침, 주황 몸통, 반사띠 두 줄 ----------
    function cone() {
      const dark = [rbox(0.3, 0.03, 0.3, 0.02, 0, 0.015, 0)];
      const seat = [lathe([[0.115, 0.03], [0.1, 0.1], [0.07, 0.2], [0.045, 0.28], [0.03, 0.33], [0.018, 0.345], [0, 0.35]], 24)];
      const white = [lathe([[0.091, 0.13], [0.082, 0.16]], 24), lathe([[0.066, 0.21], [0.058, 0.235]], 24)];
      return build({ dark, seat, white });
    }

    // 중심선을 따라 두께를 준 닫힌 옆모양 → 옆으로 밀어 둥근 모서리의 성형 판 (의자 좌판·등받이)
    function profile(pts, t) {
      const c = new THREE.SplineCurve(pts.map(([x, y]) => new V2(x, y))), N = 40, a = [], b = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, p = c.getPoint(u), d = c.getTangent(u), n = new V2(-d.y, d.x);
        a.push(p.clone().addScaledVector(n, t / 2)); b.push(p.clone().addScaledVector(n, -t / 2));
      }
      return new THREE.Shape([...a, ...b.reverse()]);
    }
    const molded = (pts, t, depth, bevel) => new THREE.ExtrudeGeometry(profile(pts, t), { depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 3, curveSegments: 8 }).translate(0, 0, -(depth - 2 * bevel) / 2);

    // ---------- 게이트 좌석: 알루미늄 성형 셸 위에 남색 쿠션 두 장 (앞이 -x, 가로대 높이 0.36) ----------
    function gateSeat() {
      const graphite = [molded([[-0.25, 0.45], [0.0, 0.455], [0.12, 0.47], [0.18, 0.56], [0.21, 0.74], [0.24, 0.9]], 0.04, 0.5, 0.018)];
      const navy = [
        molded([[-0.225, 0.522], [0.0, 0.526], [0.09, 0.535]], 0.034, 0.44, 0.016),           // 앉는 쿠션
        molded([[0.118, 0.6], [0.145, 0.74], [0.172, 0.87]], 0.032, 0.44, 0.016),             // 등 쿠션
      ];
      const brushed = [rbox(0.05, 0.1, 0.07, 0.015, 0.02, 0.395, 0)];                         // 가로대에 물리는 받침
      return build({ graphite, navy, brushed });
    }
    // 좌석 사이 팔걸이: 가로대에서 솟은 알루미늄 관과 검은 패드
    function armrest() {
      const brushed = [tube([[0.13, 0.36, 0], [0.125, 0.52, 0], [0.06, 0.63, 0], [-0.08, 0.645, 0], [-0.2, 0.64, 0]], 0.017, 18), cap([-0.2, 0.64, 0], 0.017)];
      const dark = [rbox(0.28, 0.026, 0.055, 0.012, -0.07, 0.665, 0)];
      return build({ brushed, dark });
    }
    // 좌석 다리: 가로대 아래 A자 주물 다리와 고무 발
    function seatLeg() {
      const brushed = [tube([[0, 0.34, 0], [0, 0.2, 0], [0.16, 0.025, 0]], 0.022, 10), tube([[0, 0.2, 0], [-0.16, 0.025, 0]], 0.02, 6)];
      const dark = [rbox(0.08, 0.025, 0.07, 0.01, 0.16, 0.012, 0), rbox(0.08, 0.025, 0.07, 0.01, -0.16, 0.012, 0)];
      return build({ brushed, dark });
    }

    // ---------- 하드 캐리어: 세로 골이 있는 둥근 껍데기, 지퍼 이음선, 손잡이, 바퀴 네 개 ----------
    // shell: 껍데기 색 재질. lying: 눕힌 것(수하물 카트 위). 세운 것은 넓은 면이 ±z, 손잡이가 위
    function suitcase(shell, lying) {
      const W = 0.4, H = 0.52, D = 0.24, y0 = 0.075, P = {}, add = (m, g) => (P[m] = P[m] || []).push(g);
      add(shell, rbox(W, H, D, 0.055, 0, y0 + H / 2, 0));
      for (const z of [-1, 1]) for (const x of [-0.12, -0.04, 0.04, 0.12]) add(shell, rbox(0.032, H - 0.1, 0.012, 0.005, x, y0 + H / 2, z * (D / 2 + 0.002))); // 세로 골
      add('dark', rbox(W + 0.006, H + 0.006, 0.014, 0.058, 0, y0 + H / 2, 0));                // 지퍼 이음선
      add('dark', rbox(0.16, 0.028, 0.045, 0.012, 0, y0 + H + 0.012, 0));                     // 위 손잡이
      add('dark', rbox(0.024, 0.16, 0.04, 0.01, W / 2 + 0.012, y0 + H * 0.55, 0));              // 옆 손잡이
      if (!lying) {
        for (const x of [-0.075, 0.075]) add('brushed', cyl(0.009, 0.009, 0.3, y0 + H - 0.02, 10).translate(x, 0, -0.07)); // 늘인 손잡이 대
        add('dark', rbox(0.19, 0.03, 0.035, 0.013, 0, y0 + H + 0.29, -0.07));                  // 손잡이
      }
      for (const x of [-0.15, 0.15]) for (const z of [-0.08, 0.08]) {                          // 회전 바퀴
        add('dark', rbox(0.05, 0.03, 0.05, 0.012, x, y0 - 0.008, z));
        add('dark', new THREE.CylinderGeometry(0.026, 0.026, 0.022, 14).rotateZ(Math.PI / 2).translate(x, 0.028, z));
      }
      const parts = build(P);
      if (lying) for (const p of parts) p.geo.rotateX(-Math.PI / 2).translate(0, D / 2 + 0.005, 0.3); // 넓은 면을 바닥에 눕힘
      return parts;
    }

    // ---------- 줄 세우는 기둥: 무거운 원판 받침, 스테인리스 기둥, 끈 감개 머리 ----------
    function stanchion() {
      const dark = [lathe([[0, 0], [0.15, 0], [0.155, 0.012], [0.14, 0.03], [0.05, 0.05], [0, 0.055]], 28)];
      const brushed = [cyl(0.026, 0.026, 0.84, 0.05, 16), cyl(0.04, 0.04, 0.09, 0.86, 18), cap([0, 0.95, 0], 0.04)];
      return build({ dark, brushed });
    }

    // ---------- 계류장 차량 공용: 둥근 고무 타이어와 금속 휠 (바퀴 축이 x) ----------
    function wheel(P, r, w, x, y, z) {
      const t = lathe([[0.55 * r, -w / 2], [0.88 * r, -w / 2], [r, -w / 2 + w * 0.22], [r, w / 2 - w * 0.22], [0.88 * r, w / 2], [0.55 * r, w / 2]], 24).rotateZ(Math.PI / 2).translate(x, y, z);
      const hub = new THREE.CylinderGeometry(0.56 * r, 0.56 * r, w * 0.9, 18).rotateZ(Math.PI / 2).translate(x, y, z);
      const cap2 = new THREE.CylinderGeometry(0.2 * r, 0.24 * r, w + 0.02, 12).rotateZ(Math.PI / 2).translate(x, y, z);
      (P.dark = P.dark || []).push(t); (P.brushed = P.brushed || []).push(hub); P.graphite.push(cap2);
    }

    // ---------- 수하물 카트: 낮은 철판 바닥, 관 난간, 지붕 덮개, 견인 막대 (앞이 +z, 바닥 윗면 높이 0.525) ----------
    function dolly() {
      const P = { graphite: [], white: [], seat: [], dark: [], brushed: [] };
      const W = 1.36, L = 2.1, DY = 0.5, RY = 1.42;
      P.graphite.push(rbox(W, 0.05, L, 0.02, 0, DY, 0));                                          // 바닥 철판
      for (const x of [-0.56, 0.56]) P.dark.push(rbox(0.07, 0.1, L - 0.1, 0.02, x, DY - 0.075, 0)); // 세로 보
      for (const z of [-0.75, 0.75]) P.dark.push(rbox(W - 0.2, 0.06, 0.06, 0.02, 0, DY - 0.09, z));  // 축
      for (const x of [-0.62, 0.62]) for (const z of [-0.75, 0.75]) wheel(P, 0.18, 0.11, x, 0.18, z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.graphite.push(tube([[sx * (W / 2 - 0.03), DY, sz * (L / 2 - 0.03)], [sx * (W / 2 - 0.03), RY, sz * (L / 2 - 0.03)]], 0.022, 2)); // 기둥
      for (const sx of [-1, 1]) P.graphite.push(tube([[sx * (W / 2 - 0.03), 0.66, -L / 2 + 0.03], [sx * (W / 2 - 0.03), 0.66, L / 2 - 0.03]], 0.016, 2)); // 옆 난간
      P.graphite.push(tube([[-W / 2 + 0.03, 0.66, -L / 2 + 0.03], [W / 2 - 0.03, 0.66, -L / 2 + 0.03]], 0.016, 2), tube([[-W / 2 + 0.03, 0.92, -L / 2 + 0.03], [W / 2 - 0.03, 0.92, -L / 2 + 0.03]], 0.016, 2)); // 뒤 난간
      P.white.push(rbox(W + 0.1, 0.06, L + 0.12, 0.03, 0, RY + 0.03, 0));                         // 지붕
      P.seat.push(rbox(W + 0.11, 0.035, L + 0.13, 0.015, 0, RY - 0.005, 0));                      // 지붕 테두리 주황 띠
      P.graphite.push(tube([[0, DY - 0.06, L / 2], [0, 0.42, L / 2 + 0.3], [0, 0.36, L / 2 + 0.55]], 0.025, 8)); // 견인 막대
      P.graphite.push(new THREE.TorusGeometry(0.05, 0.014, 6, 14).rotateX(Math.PI / 2).translate(0, 0.36, L / 2 + 0.6));
      return build(P);
    }

    // ---------- 견인차: 낮은 주황 차체, 비스듬한 보닛, 운전석과 관 지붕, 앞뒤 크기가 다른 바퀴 (앞이 +z) ----------
    function tug() {
      const P = { seat: [], graphite: [], white: [], navy: [], dark: [], brushed: [], light: [] };
      P.seat.push(rbox(1.2, 0.42, 1.8, 0.08, 0, 0.47, 0));                                         // 차체
      P.seat.push(MD.roundedBox(1.14, 0.2, 0.62, 0.08, 2).rotateX(-0.12).translate(0, 0.73, 0.55));                       // 보닛
      P.dark.push(rbox(1.24, 0.12, 0.12, 0.04, 0, 0.32, 0.92), rbox(1.24, 0.12, 0.1, 0.04, 0, 0.32, -0.92)); // 범퍼
      P.navy.push(rbox(0.5, 0.1, 0.45, 0.04, 0, 0.75, -0.3), rbox(0.5, 0.42, 0.08, 0.04, 0, 0.98, -0.52)); // 운전석
      P.graphite.push(tube([[0, 0.7, 0.2], [0, 0.95, 0.02]], 0.02, 2));                           // 핸들 대
      P.dark.push(new THREE.TorusGeometry(0.13, 0.016, 6, 20).rotateX(-0.9).translate(0, 0.98, 0.0)); // 핸들
      for (const sx of [-1, 1]) for (const z of [-0.62, 0.32]) P.graphite.push(tube([[sx * 0.55, 0.68, z], [sx * 0.55, 1.7, z]], 0.025, 2)); // 관 지붕 기둥
      P.white.push(rbox(1.22, 0.05, 1.12, 0.025, 0, 1.73, -0.15));                                 // 지붕
      P.light.push(cyl(0.05, 0.05, 0.07, 1.755, 12).translate(0.4, 0, -0.5));                      // 경광등
      for (const sx of [-1, 1]) P.light.push(rbox(0.16, 0.08, 0.02, 0.02, sx * 0.4, 0.58, 0.905)); // 전조등
      for (const sx of [-1, 1]) { wheel(P, 0.2, 0.16, sx * 0.62, 0.2, 0.58); wheel(P, 0.26, 0.2, sx * 0.62, 0.26, -0.55); }
      P.graphite.push(rbox(0.12, 0.1, 0.18, 0.03, 0, 0.36, -1.0));                                // 견인 고리
      return build(P);
    }

    // ---------- 계류장 버스: 낮은 바닥, 넓은 통유리, 둥근 지붕, 지붕 냉방기, 옆(+x) 출입문 세 개 (앞이 +z) ----------
    function apronBus() {
      const P = { white: [], glass: [], navy: [], graphite: [], dark: [], brushed: [], light: [] };
      const W = 1.24, L = 4.2;
      P.white.push(rbox(W, 0.5, L, 0.1, 0, 0.55, 0));                                              // 아래 차체
      P.glass.push(rbox(W - 0.02, 0.72, L - 0.12, 0.08, 0, 1.15, 0));                              // 통유리 띠
      P.white.push(rbox(W, 0.2, L, 0.1, 0, 1.58, 0));                                              // 지붕 테
      P.white.push(rbox(W - 0.12, 0.08, L - 0.3, 0.04, 0, 1.71, 0));                               // 지붕
      P.brushed.push(rbox(0.8, 0.12, 1.3, 0.04, 0, 1.79, -0.5));                                   // 냉방기
      for (const z of [-1.4, -0.7, 0, 0.7, 1.4]) for (const sx of [-1, 1]) P.white.push(rbox(0.03, 0.72, 0.07, 0.015, sx * (W / 2 - 0.005), 1.15, z)); // 창 기둥
      P.navy.push(rbox(W + 0.012, 0.08, L - 0.2, 0.03, 0, 0.74, 0));                               // 남색 띠
      for (const z of [-1.2, 0.05, 1.3]) { P.glass.push(rbox(0.02, 1.0, 0.72, 0.01, W / 2 + 0.006, 0.88, z)); P.dark.push(rbox(0.025, 1.0, 0.012, 0.004, W / 2 + 0.008, 0.88, z)); } // 출입문과 가운데 틈
      P.dark.push(rbox(W + 0.02, 0.16, 0.12, 0.05, 0, 0.36, L / 2), rbox(W + 0.02, 0.16, 0.12, 0.05, 0, 0.36, -L / 2)); // 범퍼
      for (const sx of [-1, 1]) P.light.push(rbox(0.18, 0.08, 0.02, 0.02, sx * 0.42, 0.6, L / 2 + 0.005));
      for (const sx of [-1, 1]) for (const z of [-1.45, 1.45]) wheel(P, 0.22, 0.16, sx * 0.54, 0.22, z);
      return build(P);
    }

    // ---------- 급유차: 둥근 운전실, 타원 단면 연료 탱크와 둥근 마구리, 위 난간, 뒤 호스 감개, 앞 홑바퀴·뒤 겹바퀴 (앞이 +z, 바닥 y 0) ----------
    function fuelTruck() {
      const P = { white: [], glass: [], seat: [], graphite: [], dark: [], brushed: [], light: [] };
      P.dark.push(rbox(1.0, 0.16, 5.0, 0.04, 0, 0.42, -0.1));                                      // 차대
      // 운전실
      P.white.push(rbox(1.7, 1.0, 1.25, 0.14, 0, 0.98, 1.95));
      P.white.push(rbox(1.66, 0.36, 1.1, 0.12, 0, 1.6, 1.9));                                       // 운전실 지붕
      P.glass.push(rbox(1.5, 0.52, 0.04, 0.03, 0, 1.36, 2.575).rotateX(0));                         // 앞유리
      for (const sx of [-1, 1]) P.glass.push(rbox(0.03, 0.48, 0.66, 0.02, sx * 0.852, 1.36, 2.0));  // 옆창
      P.dark.push(rbox(1.0, 0.3, 0.03, 0.02, 0, 0.82, 2.585));                                     // 그릴
      P.dark.push(rbox(1.76, 0.2, 0.14, 0.05, 0, 0.5, 2.6));                                        // 범퍼
      for (const sx of [-1, 1]) { P.light.push(rbox(0.22, 0.12, 0.02, 0.03, sx * 0.62, 0.82, 2.58)); P.graphite.push(rbox(0.04, 0.22, 0.12, 0.02, sx * 0.92, 1.42, 2.45)); } // 전조등, 거울
      P.seat.push(rbox(1.72, 0.08, 1.27, 0.03, 0, 0.66, 1.95));                                    // 운전실 아래 주황 띠
      // 탱크
      const tank = new THREE.CylinderGeometry(0.6, 0.6, 3.3, 32).rotateX(Math.PI / 2).scale(1.3, 1.05, 1).translate(0, 1.0, -0.75);
      P.white.push(tank);
      for (const sz of [-1, 1]) P.white.push(new THREE.SphereGeometry(0.6, 28, 14).scale(1.3, 1.05, 0.3).translate(0, 1.0, -0.75 + sz * 1.65));
      for (const z of [-1.9, -0.75, 0.4]) P.seat.push(new THREE.CylinderGeometry(0.605, 0.605, 0.1, 32).rotateX(Math.PI / 2).scale(1.3, 1.05, 1).translate(0, 1.0, z)); // 주황 띠
      for (const sx of [-1, 1]) P.brushed.push(tube([[sx * 0.4, 1.62, -2.2], [sx * 0.4, 1.78, -2.2], [sx * 0.4, 1.78, 0.7], [sx * 0.4, 1.62, 0.7]], 0.016, 12)); // 위 난간
      P.graphite.push(rbox(0.5, 0.04, 2.8, 0.01, 0, 1.64, -0.75));                                  // 위 발판
      for (const z of [-1.4, -0.1]) P.brushed.push(cyl(0.12, 0.12, 0.07, 1.62, 16).translate(0, 0, z)); // 주입구 뚜껑
      for (let k = 0; k < 5; k++) P.brushed.push(rbox(0.36, 0.025, 0.04, 0.01, 0, 0.55 + k * 0.24, -2.55)); // 뒤 사다리
      P.graphite.push(rbox(1.5, 0.6, 0.5, 0.06, 0, 0.75, -2.35));                                  // 호스 감개 함
      P.dark.push(new THREE.TorusGeometry(0.2, 0.07, 10, 22).rotateY(Math.PI / 2).translate(0.5, 0.78, -2.35)); // 호스 감개
      for (const sx of [-1, 1]) P.dark.push(rbox(0.06, 0.04, 2.6, 0.02, sx * 0.72, 0.62, -0.75)); // 옆 보호대
      for (const sx of [-1, 1]) { wheel(P, 0.42, 0.26, sx * 0.72, 0.42, 1.75); wheel(P, 0.42, 0.3, sx * 0.7, 0.42, -1.25); wheel(P, 0.42, 0.3, sx * 0.7, 0.42, -2.1); }
      return build(P);
    }

    // ---------- 탑승교: 터미널 쪽 원형 회전실과 받침 기둥, 길이가 줄어드는 세 마디 통로(양옆 유리창), 운전실, 비행기에 닿는 주름 덮개, 바퀴 달린 구동 다리 ----------
    // 길이 방향이 x (-x가 터미널, +x가 비행기), 가운데 높이 2.9, 바닥 y 0
    function jetBridge() {
      const P = { white: [], glass: [], graphite: [], dark: [], brushed: [], light: [] }, Y = 2.9;
      P.white.push(cyl(0.78, 0.78, 1.4, Y - 0.7, 36).translate(-3.22, 0, 0));                       // 회전실 (가장자리가 터미널 유리벽 바깥에 머묾)
      P.glass.push(cyl(0.792, 0.792, 0.42, Y - 0.05, 36).translate(-3.22, 0, 0));                   // 회전실 창 띠
      P.graphite.push(cyl(0.2, 0.24, Y - 0.72, 0.0, 18).translate(-3.22, 0, 0));                    // 회전실 기둥
      P.graphite.push(cyl(0.42, 0.42, 0.06, 0.0, 24).translate(-3.22, 0, 0));
      // 세 마디 통로: 바깥 마디가 굵고 안쪽 마디로 갈수록 가늘어짐 (서로 겹쳐 끼워진 모양)
      [[-2.6, -0.3, 1.22, 1.18], [-0.45, 1.95, 1.15, 1.11], [1.8, 3.38, 1.08, 1.05]].forEach(([x0, x1, h, w]) => {
        const cx = (x0 + x1) / 2, L = x1 - x0;
        P.white.push(rbox(L, h, w, 0.09, cx, Y, 0));
        P.dark.push(rbox(L + 0.01, 0.05, w + 0.01, 0.02, cx, Y - h / 2 + 0.06, 0));                 // 아래 띠
        for (const sz of [-1, 1]) {
          P.glass.push(rbox(L - 0.24, 0.46, 0.02, 0.01, cx, Y + 0.12, sz * (w / 2 + 0.002)));       // 옆 유리창
          for (let x = x0 + 0.12; x <= x1 - 0.11; x += 0.42) P.white.push(rbox(0.05, 0.48, 0.03, 0.01, x, Y + 0.12, sz * (w / 2 + 0.006))); // 창살
        }
        P.brushed.push(rbox(0.06, h + 0.04, w + 0.04, 0.02, x1 - 0.03, Y, 0));                      // 마디 끝 테
      });
      // 운전실과 주름 덮개 (비행기 문에 닿는 곳)
      P.white.push(rbox(0.56, 1.3, 1.34, 0.1, 3.62, Y, 0));
      P.glass.push(rbox(0.5, 0.42, 1.35, 0.06, 3.62, Y + 0.18, 0));                                // 운전실 창
      for (let k = 0; k < 5; k++) P.dark.push(rbox(0.05, 1.42 - k * 0.02, 1.46 - k * 0.02, 0.06, 3.92 + k * 0.075, Y + 0.02, 0)); // 주름
      P.dark.push(rbox(0.05, 0.08, 1.3, 0.03, 4.25, Y - 0.62, 0));                                 // 문턱 완충대
      P.light.push(rbox(0.16, 0.05, 0.08, 0.02, 3.62, Y + 0.72, 0.4));                             // 운전실 위 경광등
      // 구동 다리: 두 기둥, 가로대, 바퀴 둘
      for (const sz of [-1, 1]) P.graphite.push(rbox(0.16, Y - 0.85, 0.16, 0.04, 2.3, (Y - 0.85) / 2 + 0.33, sz * 0.42));
      P.graphite.push(rbox(0.26, 0.18, 1.2, 0.04, 2.3, 0.42, 0), rbox(0.3, 0.12, 1.1, 0.04, 2.3, Y - 0.6, 0));
      for (const sz of [-1, 1]) P.brushed.push(cyl(0.05, 0.05, 1.0, 0.95, 12).translate(2.3, 0, sz * 0.25)); // 유압 실린더
      wheel(P, 0.26, 0.2, 2.3, 0.26, 0.62); wheel(P, 0.26, 0.2, 2.3, 0.26, -0.62);
      return build(P);
    }

    // ---------- 탑승구 문: 스테인리스 문틀, 미닫이 유리문 두 짝, 문턱, 위에 불 켜진 탑승구 표지 (터미널 안에서 보는 면이 -x) ----------
    function gateDoor() {
      const P = { brushed: [], glass: [], graphite: [], dark: [], light: [] }, H = 2.5;
      for (const sz of [-1, 1]) P.brushed.push(rbox(0.12, H + 0.1, 0.12, 0.02, 0, (H + 0.1) / 2, sz * 0.8)); // 문틀 기둥
      P.brushed.push(rbox(0.14, 0.14, 1.72, 0.02, 0, H + 0.1, 0));                                  // 문틀 위
      for (const sz of [-1, 1]) {
        P.glass.push(rbox(0.03, H - 0.12, 0.72, 0.01, -0.01, H / 2, sz * 0.38));                    // 유리문
        P.brushed.push(rbox(0.05, H - 0.1, 0.035, 0.01, -0.01, H / 2, sz * 0.025), rbox(0.05, 0.06, 0.74, 0.01, -0.01, 0.05, sz * 0.38), rbox(0.05, 0.05, 0.74, 0.01, -0.01, H - 0.06, sz * 0.38)); // 문 테
        P.brushed.push(rbox(0.04, 0.6, 0.03, 0.01, -0.05, 1.05, sz * 0.12));                        // 세로 손잡이
      }
      P.dark.push(rbox(0.3, 0.012, 1.7, 0.005, -0.08, 0.006, 0));                                   // 문턱
      P.graphite.push(rbox(0.14, 0.42, 1.5, 0.04, -0.1, H + 0.46, 0));                              // 탑승구 표지 함
      P.light.push(rbox(0.02, 0.3, 1.36, 0.01, -0.175, H + 0.46, 0));                              // 표지 불빛
      return build(P);
    }

    // ---------- 관제탑: 몸통 띠 줄눈과 세로 창, 관제실 유리 틀, 둘레 발코니와 난간, 지붕 레이더 돔과 안테나 (바닥 y 0, 몸통 반지름은 위로 0.74 → 0.62) ----------
    function towerKit() {
      const P = { joint: [], glass: [], graphite: [], brushed: [], white: [], light: [] }, rAt = (y) => 0.74 - 0.12 * (y / 13);
      for (let y = 1.6; y < 12.4; y += 1.1) P.joint.push(cyl(rAt(y) + 0.008, rAt(y) + 0.008, 0.035, y, 40));   // 몸통 줄눈
      P.glass.push(rbox(0.05, 9.6, 0.16, 0.02, 0, 0, 0).rotateY(-Math.PI / 4).translate(0.47, 6.9, 0.47));        // 세로 슬릿 창
      P.graphite.push(cyl(2.08, 2.08, 0.07, 12.78, 40));                                                         // 발코니 바닥
      P.brushed.push(new THREE.TorusGeometry(2.04, 0.016, 6, 64).rotateX(Math.PI / 2).translate(0, 13.22, 0));   // 난간
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; P.brushed.push(tube([[2.04 * Math.sin(a), 12.85, 2.04 * Math.cos(a)], [2.04 * Math.sin(a), 13.22, 2.04 * Math.cos(a)]], 0.01, 1)); }
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P.graphite.push(tube([[1.47 * Math.sin(a), 12.92, 1.47 * Math.cos(a)], [1.82 * Math.sin(a), 14.48, 1.82 * Math.cos(a)]], 0.028, 1)); } // 관제실 유리 틀
      P.white.push(cyl(1.52, 1.52, 0.1, 12.86, 12));                                                              // 관제실 아랫단
      P.graphite.push(cyl(0.13, 0.15, 0.42, 14.72, 16));                                                         // 레이더 받침
      P.white.push(new THREE.SphereGeometry(0.44, 28, 18).translate(0, 15.42, 0));                               // 레이더 돔
      for (const [x, z, h] of [[0.95, 0.4, 1.5], [-0.8, -0.6, 1.1], [0.2, -1.1, 0.8]]) { P.brushed.push(tube([[x, 14.73, z], [x, 14.73 + h, z]], 0.014, 1)); P.light.push(new THREE.SphereGeometry(0.035, 8, 6).translate(x, 14.75 + h, z)); } // 안테나와 끝 불빛
      return build(P);
    }

    // ---------- 옥상 실외기: 흰 함체, 위에 팬 두 개(검은 망과 테), 옆 통풍 줄 (바닥 y 0) ----------
    function hvac() {
      const P = { white: [], dark: [], graphite: [], joint: [] };
      P.white.push(rbox(1.5, 0.56, 1.7, 0.05, 0, 0.3, 0));
      P.graphite.push(rbox(1.56, 0.06, 1.76, 0.02, 0, 0.03, 0));                                   // 받침틀
      for (const z of [-0.42, 0.42]) {
        P.dark.push(cyl(0.34, 0.34, 0.02, 0.575, 28).translate(0, 0, z));                           // 팬 망
        P.graphite.push(new THREE.TorusGeometry(0.35, 0.025, 6, 32).rotateX(Math.PI / 2).translate(0, 0.6, z)); // 팬 테
        P.graphite.push(cyl(0.06, 0.06, 0.04, 0.58, 12).translate(0, 0, z));
      }
      for (let y = 0.14; y < 0.5; y += 0.07) P.joint.push(rbox(0.012, 0.02, 1.5, 0.004, 0.755, y, 0)); // 옆 통풍 줄
      return build(P);
    }
    // ---------- 캐노피 기둥머리: 기둥 위에서 네 갈래로 뻗어 지붕을 받치는 금속 가지, 바닥 받침판 (바닥 y 0, 지붕 밑면 3.36) ----------
    function treeCap() {
      const P = { graphite: [], brushed: [], white: [] };
      P.graphite.push(rbox(0.5, 0.04, 0.5, 0.015, 0, 0.02, 0), cyl(0.2, 0.22, 0.08, 0.04, 20));      // 받침판
      P.brushed.push(cyl(0.19, 0.19, 0.05, 3.0, 20));                                               // 가지가 갈라지는 고리
      for (const [x, z] of [[0, 0.75], [0, -0.75], [0.5, 0], [-0.5, 0]]) {                          // 기둥과 같은 흰 도장, 굵고 짧게 (지붕 안쪽에 머묾)
        P.white.push(tube([[0, 3.02, 0], [x * 0.4, 3.2, z * 0.4], [x, 3.31, z]], 0.055, 10));
        P.white.push(rbox(0.2, 0.04, 0.2, 0.015, x, 3.335, z));                                     // 지붕에 닿는 판
      }
      return build(P);
    }

    // 좌석은 옆모양(앞이 +x)으로 깎은 뒤 세로축으로 돌려 앞이 +z가 되게 함 (객실에서 진행 방향)
    const turn = (parts) => { for (const p of parts) p.geo.rotateY(-Math.PI / 2); return parts; };
    // 앉는 쿠션과 등받이를 감싸는 좌석 한 개. o: 너비, 등받이 높이, 등 뒤 화면 여부, 머리 덮개 색
    function cabinSeat(o) {
      const Wd = o.width, T = o.top, FB = o.fabric, P = { [FB]: [], joint: [], graphite: [], dark: [], white: [], glass: [] };
      const back = (dx) => [[-0.17 + dx, 0.5], [-0.2 + dx, 0.5 + (T - 0.5) * 0.4], [-0.23 + dx, 0.5 + (T - 0.5) * 0.78], [-0.255 + dx, T]];
      P[FB].push(molded([[0.25, 0.425], [0.05, 0.455], [-0.17, 0.445]], 0.1, Wd, 0.032));         // 앉는 쿠션 (앞이 살짝 처짐)
      P[FB].push(molded(back(0), 0.13, Wd, 0.04));                                                 // 등받이 (허리 받침 곡선)
      P.joint.push(molded(back(-0.09), 0.03, Wd + 0.02, 0.012));                                    // 등받이 뒤 플라스틱 껍데기
      P.white.push(molded([[-0.108, T - 0.15], [-0.124, T - 0.075], [-0.14, T - 0.02]], 0.014, Wd * 0.62, 0.006)); // 머리 덮개
      const lean = Math.atan2(0.085, T - 0.5);                                                      // 등받이 기울기
      P.graphite.push(MD.roundedBox(0.018, 0.22, Wd * 0.78, 0.008, 2).rotateZ(lean).translate(-0.33, 0.5 + (T - 0.5) * 0.4, 0)); // 접힌 테이블
      P.dark.push(MD.roundedBox(0.012, 0.12, Wd * 0.7, 0.005, 2).rotateZ(lean).translate(-0.31, 0.5 + (T - 0.5) * 0.1, 0)); // 좌석 주머니
      if (o.screen) P.dark.push(MD.roundedBox(0.012, 0.15, 0.24, 0.006, 2).rotateZ(lean).translate(-0.36, 0.5 + (T - 0.5) * 0.8, 0)); // 등 뒤 화면
      for (const z of [-1, 1]) {
        P.dark.push(rbox(0.36, 0.045, 0.055, 0.02, 0.0, 0.66, z * (Wd / 2 + 0.03)));                  // 팔걸이 패드
        P.graphite.push(rbox(0.05, 0.22, 0.04, 0.015, -0.12, 0.54, z * (Wd / 2 + 0.03)));           // 팔걸이 받침
        P.graphite.push(rbox(0.06, 0.4, 0.04, 0.015, -0.04, 0.2, z * (Wd / 2 - 0.06)));             // 다리
      }
      P.graphite.push(rbox(0.5, 0.04, Wd - 0.08, 0.015, -0.04, 0.38, 0), rbox(0.42, 0.03, 0.04, 0.01, 0.02, 0.015, Wd / 2 - 0.06), rbox(0.42, 0.03, 0.04, 0.01, 0.02, 0.015, -Wd / 2 + 0.06)); // 받침틀과 바닥 레일
      return turn(build(P));
    }
    // 둥근 창틀(가운데가 뚫린 판). 판은 xy 면, 두께는 z. w·h: 바깥, iw·ih: 안쪽 구멍
    function ringFrame(w, h, r, iw, ih, ir, depth) {
      const rr = (sh, W2, H2, R) => { sh.moveTo(-W2 + R, -H2); sh.lineTo(W2 - R, -H2); sh.quadraticCurveTo(W2, -H2, W2, -H2 + R); sh.lineTo(W2, H2 - R); sh.quadraticCurveTo(W2, H2, W2 - R, H2); sh.lineTo(-W2 + R, H2); sh.quadraticCurveTo(-W2, H2, -W2, H2 - R); sh.lineTo(-W2, -H2 + R); sh.quadraticCurveTo(-W2, -H2, -W2 + R, -H2); };
      const outer = new THREE.Shape(); rr(outer, w / 2, h / 2, r);
      const hole = new THREE.Path(); rr(hole, iw / 2, ih / 2, ir); outer.holes.push(hole);
      return new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -depth / 2);
    }
    // KTX 창: 둥근 모서리 창틀, 위에 말린 블라인드 (판이 객실 쪽 +z를 봄)
    function ktxWin() {
      return build({ white: [ringFrame(0.86, 0.82, 0.12, 0.74, 0.7, 0.09, 0.07)], wall: [new THREE.CylinderGeometry(0.026, 0.026, 0.72, 12).rotateZ(Math.PI / 2).translate(0, 0.31, 0.02)] });
    }
    function ktxBlind() { return build({ wall: [rbox(0.72, 0.26, 0.008, 0.003, 0, 0.18, 0.025)], graphite: [rbox(0.72, 0.02, 0.015, 0.006, 0, 0.05, 0.028)] }); } // 반쯤 내린 블라인드
    // 비행기 창: 둥근 창틀과 반쯤 내린 가리개
    function planeWin() { return build({ white: [ringFrame(0.36, 0.46, 0.16, 0.22, 0.31, 0.1, 0.06)] }); }
    function planeShade() { return build({ white: [rbox(0.22, 0.13, 0.008, 0.004, 0, 0.09, 0.022)], joint: [rbox(0.08, 0.012, 0.012, 0.004, 0, 0.025, 0.028)] }); }

    // ---------- 계류장 조명탑: 가늘어지는 기둥, 투광등 세 개 (빛이 +z) ----------
    function flood() {
      const graphite = [cyl(0.14, 0.15, 0.06, 0), cyl(0.06, 0.1, 4.6, 0.06)], light = [];
      graphite.push(rbox(1.15, 0.08, 0.08, 0.02, 0, 4.72, -0.02));
      for (const x of [-0.38, 0, 0.38]) {
        graphite.push(rbox(0.3, 0.26, 0.14, 0.04, x, 4.9, 0.04));
        light.push(rbox(0.24, 0.2, 0.02, 0.01, x, 4.9, 0.115));
      }
      return build({ graphite, light });
    }

    return {
      bench: bench(), lamp: lamp(), bin: bin(), cone: cone(), gateSeat: gateSeat(), armrest: armrest(), seatLeg: seatLeg(), stanchion: stanchion(), flood: flood(),
      dolly: dolly(), tug: tug(), apronBus: apronBus(),
      fuelTruck: fuelTruck(), jetBridge: jetBridge(), gateDoor: gateDoor(), towerKit: towerKit(), hvac: hvac(), treeCap: treeCap(),
      ktxSeat: cabinSeat({ width: 0.46, top: 1.17, fabric: 'fabric' }), planeSeat: cabinSeat({ width: 0.42, top: 1.1, screen: true, fabric: 'fabricAir' }), ktxWin: ktxWin(), ktxBlind: ktxBlind(), planeWin: planeWin(), planeShade: planeShade(),
      suitcaseSeat: suitcase('seat'), suitcaseNavy: suitcase('navy'), suitcaseWhite: suitcase('white'),
      suitcaseFlatSeat: suitcase('seat', true), suitcaseFlatNavy: suitcase('navy', true), suitcaseFlatWhite: suitcase('white', true),
    };
  };
})();

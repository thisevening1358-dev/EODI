/*
 * 전광판 광고 포스터: 입체 지도에서 추천하는 축제와 관광지를 요즘 축제 포스터처럼 그림
 * - 얇은 선의 격자와 작은 정보 글자, 큰 숫자(날짜), 꽉 찬 굵은 제목, 거친 입자와 망점
 * - 배치는 세 가지: grid(위 큰 숫자 + 아래 제목), type(제목이 곧 그림), round(원형 창 + 둥근 스티커)
 * - 그림은 장소마다 하나 (불꽃, 억새, 등불, 눈 결정, 벚꽃, 갯벌, 갈대, 석탑, 기와, 탈, 거품, 음반)
 * 외부 이미지를 쓰지 않으므로 파일을 더블클릭해서 열어도 동작함.
 * 결과는 가로 3장 x 세로 2장으로 모은 한 장의 캔버스이고, 셰이더가 칸을 골라 스크롤함.
 */
(function () {
  const W = 360, H = 672, COLS = 3, ROWS = 2, M = 22;
  const FONT = 'SUIT, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // 입자: 큰 무작위 타일을 겹쳐 규칙 무늬 없이
  let noiseTile = null;
  function noise() {
    if (noiseTile) return noiseTile;
    const size = 320, c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), img = x.createImageData(size, size), r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    return (noiseTile = c);
  }
  const glow = (c, x, y, r, col, a = 1) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
  };
  const dot = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  // 망점: 위에서 아래로 점이 커지는 인쇄 망점
  function halftone(c, x0, y0, x1, y1, col, step = 9, max = 3.4, alpha = 0.5) {
    c.globalAlpha = alpha;
    for (let y = y0; y < y1; y += step) for (let x = x0 + (Math.round((y - y0) / step) % 2) * step / 2; x < x1; x += step) dot(c, x, y, Math.max(0.3, max * ((y - y0) / (y1 - y0))), col);
    c.globalAlpha = 1;
  }

  // ---------- 장소마다 하나의 그림 (b: 그림이 놓이는 영역 {x, y, w, h}) ----------
  const ART = {
    burst(c, a, b, r) { // 불꽃: 가는 빛줄기가 퍼지는 꽃 세 송이와 바다에 비친 빛
      for (const [fx, fy, R, col] of [[0.32, 0.36, 0.42, a.accent], [0.72, 0.28, 0.34, a.accent2], [0.58, 0.68, 0.3, a.accent]]) {
        const cx = b.x + b.w * fx, cy = b.y + b.h * fy, rad = b.w * R;
        glow(c, cx, cy, rad * 1.1, col, 0.35);
        for (let i = 0; i < 48; i++) {
          const t = (i / 48) * Math.PI * 2 + r() * 0.05, l = rad * (0.6 + r() * 0.4);
          c.strokeStyle = col; c.lineWidth = 1.4; c.globalAlpha = 0.85; c.beginPath();
          c.moveTo(cx + Math.cos(t) * l * 0.18, cy + Math.sin(t) * l * 0.18); c.lineTo(cx + Math.cos(t) * l, cy + Math.sin(t) * l + l * 0.08); c.stroke();
          dot(c, cx + Math.cos(t) * l, cy + Math.sin(t) * l + l * 0.08, 2.2, '#FFF6DA');
        }
        c.globalAlpha = 1;
      }
      for (let i = 0; i < 26; i++) { c.globalAlpha = 0.5; c.fillStyle = i % 2 ? a.accent : a.accent2; c.fillRect(b.x + r() * b.w, b.y + b.h * (0.86 + r() * 0.14), 10 + r() * 30, 2); }
      c.globalAlpha = 1;
    },
    grass(c, a, b, r) { // 억새: 바람에 한쪽으로 휜 가는 줄기와 은빛 이삭
      for (let i = 0; i < 150; i++) {
        const x = b.x + r() * b.w, base = b.y + b.h, top = b.y + b.h * (0.12 + r() * 0.5), bend = 26 + r() * 40;
        c.strokeStyle = r() > 0.35 ? a.accent : a.deep; c.lineWidth = 0.8 + r() * 1.4; c.globalAlpha = 0.55 + r() * 0.45;
        c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + bend * 0.3, (base + top) / 2, x + bend, top); c.stroke();
        c.fillStyle = a.accent2; c.beginPath(); c.ellipse(x + bend + 6, top - 4, 12, 3.4, -0.6, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
    },
    lanterns(c, a, b, r) { // 강 위의 등불: 떠 있는 등과 물에 비친 긴 빛
      const river = b.y + b.h * 0.62;
      for (let i = 0; i < 18; i++) {
        const x = b.x + 20 + r() * (b.w - 40), y = b.y + 20 + r() * (river - b.y - 50), s = 10 + r() * 16;
        glow(c, x, y, s * 3, a.accent, 0.55);
        c.fillStyle = a.accent2; c.beginPath(); c.ellipse(x, y, s * 0.6, s * 0.75, 0, 0, Math.PI * 2); c.fill();
        for (let k = 0; k < 7; k++) { c.globalAlpha = 0.45 - k * 0.055; c.fillStyle = a.accent; const w = s * (0.9 - k * 0.1); c.fillRect(x - w / 2 + Math.sin(k * 1.7) * 3, river + 6 + (y - b.y) * 0.2 + k * 9, w, 3); } c.globalAlpha = 1; // 물에 비쳐 흔들리는 빛 줄
      }
      c.fillStyle = a.deep; c.globalAlpha = 0.5; c.fillRect(b.x, river, b.w, 2); c.globalAlpha = 1;
    },
    crystal(c, a, b, r) { // 눈 결정: 여섯 갈래 가는 선과 흩날리는 눈
      const star = (x, y, s, col, lw) => {
        c.strokeStyle = col; c.lineWidth = lw;
        for (let k = 0; k < 6; k++) {
          const t = (k / 6) * Math.PI * 2, ex = x + Math.cos(t) * s, ey = y + Math.sin(t) * s;
          c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
          for (const f of [0.45, 0.7]) { const px = x + Math.cos(t) * s * f, py = y + Math.sin(t) * s * f; for (const d of [-0.6, 0.6]) { c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(t + d) * s * 0.22, py + Math.sin(t + d) * s * 0.22); c.stroke(); } }
        }
      };
      star(b.x + b.w * 0.5, b.y + b.h * 0.48, b.w * 0.36, a.accent, 3);
      star(b.x + b.w * 0.16, b.y + b.h * 0.18, 28, a.accent2, 1.6); star(b.x + b.w * 0.84, b.y + b.h * 0.82, 36, a.accent2, 1.6);
      for (let i = 0; i < 60; i++) dot(c, b.x + r() * b.w, b.y + r() * b.h, 1 + r() * r() * 4, a.accent);
    },
    blossom(c, a, b, r) { // 벚꽃: 다섯 잎 꽃과 떨어지는 꽃잎, 아래 망점
      halftone(c, b.x, b.y + b.h * 0.55, b.x + b.w, b.y + b.h, a.deep, 9, 3.6, 0.35);
      const flower = (x, y, s, col) => {
        c.fillStyle = col;
        for (let k = 0; k < 5; k++) { const t = (k / 5) * Math.PI * 2 - Math.PI / 2; c.beginPath(); c.ellipse(x + Math.cos(t) * s * 0.55, y + Math.sin(t) * s * 0.55, s * 0.5, s * 0.36, t, 0, Math.PI * 2); c.fill(); }
        dot(c, x, y, s * 0.16, a.deep);
      };
      for (let i = 0; i < 14; i++) flower(b.x + r() * b.w, b.y + r() * b.h * 0.7, 16 + r() * 26, r() > 0.4 ? a.accent : a.accent2);
      for (let i = 0; i < 40; i++) { c.save(); c.translate(b.x + r() * b.w, b.y + r() * b.h); c.rotate(r() * 6); c.fillStyle = a.accent; c.globalAlpha = 0.7; c.beginPath(); c.ellipse(0, 0, 6, 3.4, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      c.globalAlpha = 1;
    },
    mud(c, a, b, r) { // 갯벌 축제: 물결처럼 겹친 진흙과 튀는 방울, 형광 포인트
      for (const [dy, col, amp] of [[0.3, a.accent2, 20], [0.5, a.deep, 26], [0.72, a.accent2, 18]]) {
        c.fillStyle = col; c.beginPath(); c.moveTo(b.x, b.y + b.h);
        for (let x = 0; x <= b.w; x += 6) c.lineTo(b.x + x, b.y + b.h * dy + Math.sin(x / 34 + dy * 9) * amp + Math.sin(x / 13) * amp * 0.25);
        c.lineTo(b.x + b.w, b.y + b.h); c.fill();
      }
      for (let i = 0; i < 34; i++) dot(c, b.x + r() * b.w, b.y + r() * b.h * 0.5, 2 + r() * r() * 11, r() > 0.7 ? a.accent : a.deep);
    },
    reeds(c, a, b, r) { // 갈대 바다: S자로 굽은 물길과 촘촘한 갈대, 해
      c.strokeStyle = a.accent2; c.lineWidth = 16; c.lineCap = 'round'; c.globalAlpha = 0.9;
      c.beginPath(); c.moveTo(b.x + b.w * 0.1, b.y + b.h); c.bezierCurveTo(b.x + b.w * 1.1, b.y + b.h * 0.7, b.x - b.w * 0.1, b.y + b.h * 0.35, b.x + b.w * 0.7, b.y + b.h * 0.05); c.stroke();
      c.globalAlpha = 1; c.lineCap = 'butt';
      for (let i = 0; i < 220; i++) { const x = b.x + r() * b.w, y = b.y + b.h * (0.15 + r() * 0.85), l = 10 + r() * 22; c.strokeStyle = r() > 0.5 ? a.accent : a.deep; c.lineWidth = 1.2; c.globalAlpha = 0.7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y - l); c.stroke(); }
      c.globalAlpha = 1;
      dot(c, b.x + b.w * 0.78, b.y + b.h * 0.18, 34, a.accent);
    },
    pagoda(c, a, b) { // 석탑: 층마다 지붕돌이 얹힌 탑과 큰 해
      dot(c, b.x + b.w * 0.5, b.y + b.h * 0.42, b.w * 0.36, a.accent2);
      const cx = b.x + b.w * 0.5; let y = b.y + b.h; const w = b.w * 0.5;
      c.fillStyle = a.deep; c.fillRect(cx - w * 0.6, y - 26, w * 1.2, 26); y -= 26;
      for (let k = 0; k < 3; k++) {
        const bodyH = 40 - k * 8, bw = w * (0.42 - k * 0.07);
        c.fillStyle = a.deep; c.fillRect(cx - bw / 2, y - bodyH, bw, bodyH); y -= bodyH;
        const rw = w * (0.92 - k * 0.16); c.beginPath(); c.moveTo(cx - rw / 2, y); c.lineTo(cx + rw / 2, y); c.lineTo(cx + rw * 0.4, y - 12); c.lineTo(cx - rw * 0.4, y - 12); c.fill(); y -= 12;
      }
      c.fillRect(cx - 3, y - 46, 6, 46); for (const d of [8, 20, 32]) dot(c, cx, y - d, 6, a.deep);
    },
    roofs(c, a, b) { // 기와 지붕: 처마 곡선이 겹겹이 이어진 마을
      for (let row = 0; row < 6; row++) {
        const y = b.y + b.h * (0.18 + row * 0.15), off = (row % 2) * 60;
        for (let x = -60 + off; x < b.w + 60; x += 120) {
          const x0 = b.x + x;
          c.fillStyle = row % 2 ? a.deep : a.accent2; c.beginPath(); c.moveTo(x0 - 66, y + 10); c.quadraticCurveTo(x0 - 40, y - 4, x0 - 30, y - 22); c.lineTo(x0 + 30, y - 22); c.quadraticCurveTo(x0 + 40, y - 4, x0 + 66, y + 10); c.quadraticCurveTo(x0, y + 2, x0 - 66, y + 10); c.fill();
          c.strokeStyle = a.accent; c.globalAlpha = 0.35; c.lineWidth = 1;
          for (let k = -24; k <= 24; k += 6) { c.beginPath(); c.moveTo(x0 + k, y - 20); c.lineTo(x0 + k * 1.6, y + 4); c.stroke(); }
          c.globalAlpha = 1;
        }
      }
    },
    masks(c, a, b) { // 탈: 둥근 얼굴, 초승달 눈, 웃는 입, 볼연지
      const mask = (x, y, s, col, ink) => {
        c.fillStyle = col; c.beginPath(); c.ellipse(x, y, s, s * 1.15, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = ink; c.lineWidth = s * 0.08; c.lineCap = 'round';
        for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * s * 0.38, y - s * 0.12, s * 0.2, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
        c.beginPath(); c.arc(x, y + s * 0.2, s * 0.42, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
        for (const d of [-1, 1]) dot(c, x + d * s * 0.62, y + s * 0.25, s * 0.13, a.accent2);
        c.lineCap = 'butt';
      };
      mask(b.x + b.w * 0.5, b.y + b.h * 0.48, b.w * 0.3, a.accent, a.deep);
      mask(b.x + b.w * 0.14, b.y + b.h * 0.15, 30, a.accent2, a.deep); mask(b.x + b.w * 0.86, b.y + b.h * 0.86, 34, a.accent2, a.deep);
    },
    bubbles(c, a, b, r) { // 치맥: 맥주잔 줄무늬, 거품 머리, 올라가는 기포
      for (let k = 0; k < 7; k++) { c.fillStyle = k % 2 ? a.accent2 : a.accent; c.fillRect(b.x + k * (b.w / 7), b.y + b.h * 0.25, b.w / 7 + 1, b.h * 0.75); }
      c.fillStyle = '#FFF8E6'; c.fillRect(b.x, b.y + b.h * 0.22, b.w, b.h * 0.06);
      for (let x = 0; x <= b.w; x += 26) dot(c, b.x + x, b.y + b.h * 0.22, 14 + (x % 52 ? 5 : 0), '#FFF8E6');
      for (let i = 0; i < 46; i++) { c.strokeStyle = '#FFF8E6'; c.lineWidth = 1.4; c.globalAlpha = 0.8; c.beginPath(); c.arc(b.x + r() * b.w, b.y + b.h * (0.35 + r() * 0.62), 2 + r() * 7, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
    },
    vinyl(c, a, b) { // 재즈: 큰 음반과 소리 물결
      const cx = b.x + b.w * 0.56, cy = b.y + b.h * 0.55, R = b.w * 0.42;
      dot(c, cx, cy, R, a.deep);
      c.strokeStyle = a.accent2; c.lineWidth = 0.8; c.globalAlpha = 0.5;
      for (let k = 0.32; k < 1; k += 0.045) { c.beginPath(); c.arc(cx, cy, R * k, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1; dot(c, cx, cy, R * 0.28, a.accent); dot(c, cx, cy, 5, a.deep);
      c.strokeStyle = a.accent; c.lineWidth = 3;
      for (let k = 0; k < 4; k++) { c.beginPath(); for (let x = 0; x <= b.w; x += 4) c.lineTo(b.x + x, b.y + b.h * (0.06 + k * 0.035) + Math.sin(x / 14 + k) * 8 * (1 - k * 0.2)); c.stroke(); }
    },
  };

  // ---------- 글자 ----------
  const setFont = (c, px, w = 600) => { c.font = `${w} ${px}px ${FONT}`; if ('letterSpacing' in c) c.letterSpacing = `${-px * 0.045}px`; };
  // 제목: 줄마다 폭에 꽉 맞춘 큰 활자 (글꼴이 600까지라 같은 색 외곽선으로 두껍게)
  function title(c, lines, ink, top, maxH, maxW = W - M * 2, bottom) {
    let sizes = lines.map((t) => { setFont(c, 100); return Math.min(150, (100 * maxW) / c.measureText(t).width); });
    const total = sizes.reduce((s, v) => s + v * 0.96, 0), k = total > maxH ? maxH / total : 1;
    sizes = sizes.map((s) => s * k);
    if (bottom !== undefined) top = bottom - sizes.reduce((s, v) => s + v * 0.96, 0);
    c.fillStyle = c.strokeStyle = ink; c.lineJoin = 'round'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    let y = top;
    lines.forEach((t, i) => { const s = sizes[i]; y += s * 0.88; setFont(c, s); c.lineWidth = s * 0.035; c.strokeText(t, M, y); c.fillText(t, M, y); y += s * 0.08; });
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    return y;
  }
  const small = (c, txt, x, y, align, px, col, w = 600) => { if ('letterSpacing' in c) c.letterSpacing = '0px'; c.font = `${w} ${px}px ${FONT}`; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = col; c.fillText(txt, x, y); };
  const rule = (c, y, col, a = 0.55) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(M, y, W - M * 2, 1.2); c.globalAlpha = 1; };
  // 큰 숫자(날짜): 폭에 꽉 찬 외곽선 숫자
  function bigNumber(c, txt, ink, y, maxH) {
    setFont(c, 100); const w = c.measureText(txt).width, s = Math.min(maxH / 0.74, (100 * (W - M * 2)) / w);
    setFont(c, s); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.lineWidth = 2; c.strokeStyle = ink;
    c.strokeText(txt, M - s * 0.03, y + s * 0.74);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
  }
  // 둥근 스티커: 살짝 돌아간 원 안에 날짜
  function sticker(c, x, y, rad, bg, ink, line1, line2) {
    c.save(); c.translate(x, y); c.rotate(-0.22);
    dot(c, 0, 0, rad, bg);
    c.strokeStyle = ink; c.lineWidth = 1.2; c.setLineDash([3, 4]); c.beginPath(); c.arc(0, 0, rad - 7, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    small(c, line1, 0, 4, 'center', rad * 0.46, ink); small(c, line2, 0, rad * 0.46, 'center', rad * 0.22, ink, 500);
    c.restore();
  }

  function poster(c, a, seed) {
    const r = rng(seed * 991 + 13), ink = a.ink;
    const bg = c.createLinearGradient(0, 0, W * 0.3, H); bg.addColorStop(0, a.bg[0]); bg.addColorStop(1, a.bg[1]);
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    glow(c, W * (0.2 + r() * 0.6), H * (0.25 + r() * 0.5), 320, a.blob || a.accent, 0.35);

    // 맨 위: 작은 정보 줄과 가는 선
    small(c, a.place, M, 34, 'left', 13, ink); small(c, a.kind === 'event' ? '축제' : '여행지', W / 2, 34, 'center', 13, ink, 500); small(c, a.when, W - M, 34, 'right', 13, ink);
    rule(c, 46, ink);

    if (a.layout === 'grid') { // 위에 큰 외곽선 숫자, 가운데 그림 띠, 아래 제목
      bigNumber(c, a.big, ink, 60, 150);
      const box = { x: 0, y: 236, w: W, h: 240 };
      c.save(); c.beginPath(); c.rect(0, box.y, W, box.h); c.clip(); ART[a.art](c, a, box, r); c.restore();
      rule(c, box.y, ink, 0.4); rule(c, box.y + box.h, ink, 0.4);
      title(c, a.title, ink, 0, 124, W - M * 2, H - 64);
    } else if (a.layout === 'type') { // 제목이 위쪽을 꽉 채우고, 아래 그림
      const end = title(c, a.title, ink, 56, 290);
      const top = Math.max(end + 16, 300), box = { x: 0, y: top, w: W, h: H - 62 - top };
      c.save(); c.beginPath(); c.rect(0, box.y, W, box.h); c.clip(); ART[a.art](c, a, box, r); c.restore();
      small(c, a.big, W - M, top - 10, 'right', 20, ink);
    } else { // round: 원형 창 안의 그림, 날짜 스티커, 아래 제목
      const cx = W / 2, cy = 232, R = 150, box = { x: cx - R, y: cy - R, w: R * 2, h: R * 2 };
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
      c.fillStyle = a.window || a.bg[1]; c.fillRect(box.x, box.y, box.w, box.h); ART[a.art](c, a, box, r); c.restore();
      c.strokeStyle = ink; c.lineWidth = 1.2; c.globalAlpha = 0.6; c.beginPath(); c.arc(cx, cy, R + 8, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      sticker(c, W - 66, 350, 46, a.accent, a.deep, a.big, a.kind === 'event' ? '열려요' : '추천');
      title(c, a.title, ink, 0, 176, W - M * 2, H - 64);
    }

    // 입자: 그러데이션과 그림 위에 거칠게
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.22; c.drawImage(noise(), 0, 0, W, H); c.restore();

    // 맨 아래: 가는 선, 이름과 가는 길, eodi
    rule(c, H - 50, ink);
    small(c, a.name, M, H - 29, 'left', 15, ink);
    small(c, a.trip || '', M, H - 12, 'left', 10, ink, 500);
    small(c, 'eodi', W - M, H - 22, 'right', 18, ink);
  }

  // 포스터 여섯 장을 한 장에 모음
  window.EODI_POSTERS = {
    cols: COLS, rows: ROWS,
    make() { const c = document.createElement('canvas'); c.width = W * COLS; c.height = H * ROWS; return c; },
    draw(canvas, ads) {
      const c = canvas.getContext('2d');
      ads.slice(0, COLS * ROWS).forEach((a, i) => {
        c.save(); c.translate((i % COLS) * W, Math.floor(i / COLS) * H);
        c.beginPath(); c.rect(0, 0, W, H); c.clip();
        poster(c, a, i + 1);
        c.restore();
      });
    },
    ready() { return document.fonts && document.fonts.load ? document.fonts.load(`600 40px ${FONT}`, '여행가나').catch(() => {}) : Promise.resolve(); },
  };
})();

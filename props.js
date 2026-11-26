/*
 * 좌석 시점의 소품: 종이 지도와 휴대폰 화면을 캔버스에 그림
 * 종이 지도는 이후 '탐색'과 '코스 만들기', 휴대폰은 '내 여행'과 '동반자' 기능이 들어갈 자리.
 * 지금 내용은 자리표시용 예시 (노선과 도시 위치는 실제 대략값, 일정과 동반자는 예시).
 */
(function () {
  const FONT = 'SUIT, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const INK = '#0E2F47', MUTED = '#4E6C80';
  const font = (w, px) => `${w} ${px}px ${FONT}`;

  // 종이 결: 아주 옅은 얼룩과 섬유
  function paper(c, W, H, base) {
    c.fillStyle = base; c.fillRect(0, 0, W, H);
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(90,100,110,${0.02 + r() * 0.03})`; c.fillRect(r() * W, r() * H, 1 + r() * 2, 1); }
  }
  // 접힌 자국: 세로 3줄, 가로 1줄 (빛을 받는 쪽과 그늘 쪽)
  function folds(c, W, H) {
    for (let k = 1; k < 4; k++) {
      const x = (W * k) / 4, g = c.createLinearGradient(x - 18, 0, x + 18, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(0.5, 'rgba(60,70,80,0.16)'); g.addColorStop(1, 'rgba(60,70,80,0)');
      c.fillStyle = g; c.fillRect(x - 18, 0, 36, H);
    }
    const y = H / 2, g = c.createLinearGradient(0, y - 14, 0, y + 14);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.3)'); g.addColorStop(0.5, 'rgba(60,70,80,0.12)'); g.addColorStop(1, 'rgba(60,70,80,0)');
    c.fillStyle = g; c.fillRect(0, y - 14, W, 28);
  }
  function header(c, W, title, sub) {
    c.fillStyle = INK; c.font = font(700, 44); c.textBaseline = 'alphabetic'; c.fillText('eodi', 56, 92);
    c.font = font(600, 34); c.fillText(title, 170, 90);
    c.fillStyle = MUTED; c.font = font(500, 22); c.fillText(sub, 56, 132);
  }
  const station = (c, x, y, name, col, big, align = 'left') => {
    c.beginPath(); c.arc(x, y, big ? 17 : 11, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = big ? 8 : 6; c.strokeStyle = col; c.stroke();
    c.fillStyle = INK; c.font = font(big ? 700 : 500, big ? 32 : 24); c.textAlign = align; c.textBaseline = 'middle';
    c.fillText(name, x + (align === 'left' ? 22 : align === 'right' ? -22 : 0), y + (align === 'center' ? -30 : 0));
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  };

  // 윤곽 그리기: rings는 [경도, 위도, ...] x scale, P는 (위도, 경도) → 화면 좌표
  function landPath(c, rings, scale, P) {
    c.beginPath();
    for (const r of rings) {
      for (let i = 0; i < r.length; i += 2) { const [x, y] = P(r[i + 1] / scale, r[i] / scale); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.closePath();
    }
  }
  const SEA = '#8FB8D6', LAND = '#FBFBF7', COAST = 'rgba(30,70,100,0.7)'; // 바다는 하늘색, 땅은 종이색

  // 국내: 한반도 윤곽만 (종이 가운데에 크게, 탐색 화면으로 들어가는 입구 역할)
  function domesticMap(c, W, H) {
    paper(c, W, H, '#E9EDEA');
    header(c, W, '국내 여행 지도', '어디로 떠날지 지도를 눌러 골라 보세요');
    const left = 60, right = W - 60, top = 160, bottom = H - 60;
    const LAT0 = 32.9, LAT1 = 43.2, k = (bottom - top) / (LAT1 - LAT0), kx = k * Math.cos((38 * Math.PI) / 180), LONC = 127.6;
    const P = (lat, lon) => [(left + right) / 2 + (lon - LONC) * kx, top + (LAT1 - lat) * k];
    c.save(); c.beginPath(); c.roundRect(left, top, right - left, bottom - top, 18); c.clip();
    c.fillStyle = SEA; c.fillRect(left, top, right - left, bottom - top);
    // 위경도 눈금
    c.strokeStyle = 'rgba(78,108,128,0.12)'; c.lineWidth = 1.5;
    for (let lat = 33; lat <= 43; lat++) { const [, y] = P(lat, LONC); c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke(); }
    for (let lon = 118; lon <= 137; lon++) { const [x] = P(LAT0, lon); c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke(); }
    landPath(c, MAPDATA.korea, 100, P); c.fillStyle = LAND; c.fill('evenodd'); c.lineWidth = 2.5; c.strokeStyle = COAST; c.stroke();
    c.restore();
    folds(c, W, H);
  }

  // 해외: 세계 지도 위 인천 출발 항로 (도시 위치는 실제 위경도, 등장방형 투영)
  function overseasMap(c, W, H) {
    paper(c, W, H, '#E8ECF0');
    header(c, W, '해외 여행 지도', '인천에서 떠나는 이번 시즌 항로');
    const L0 = -60, L1 = 180, A0 = -55, A1 = 75, left = 60, right = W - 60, top = 175, k = (right - left) / (L1 - L0), bottom = top + (A1 - A0) * k;
    const P = (lat, lon) => [left + (lon - L0) * k, top + (A1 - lat) * k];
    c.save(); c.beginPath(); c.roundRect(left, top, right - left, bottom - top, 18); c.clip();
    c.fillStyle = SEA; c.fillRect(left, top, right - left, bottom - top);
    landPath(c, MAPDATA.world, 10, P); c.fillStyle = LAND; c.fill(); c.lineWidth = 2; c.strokeStyle = COAST; c.stroke();
    c.strokeStyle = 'rgba(78,108,128,0.12)'; c.lineWidth = 1.5;
    for (let lon = -90; lon <= 180; lon += 30) { const [x] = P(0, lon); c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke(); }
    for (let lat = -30; lat <= 60; lat += 30) { const [, y] = P(lat, 0); c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke(); }
    const home = P(37.46, 126.44);
    // [이름, 위도, 경도, 글자 위치]: 가까운 도시끼리 글자가 겹치지 않게 방향을 정함
    const dests = [['오사카', 34.7, 135.5, 'below'], ['삿포로', 43.1, 141.4, 'right'], ['방콕', 13.8, 100.5, 'below'], ['치앙마이', 18.8, 99.0, 'left'], ['파리', 48.9, 2.35, 'left'], ['프라하', 50.1, 14.4, 'above'], ['리우', -22.9, -43.2, 'right']];
    c.lineCap = 'round';
    for (const [n, lat, lon, side] of dests) {
      const [x, y] = P(lat, lon), mx = (home[0] + x) / 2, my = Math.min(home[1], y) - Math.hypot(x - home[0], y - home[1]) * 0.2;
      c.beginPath(); c.moveTo(...home); c.quadraticCurveTo(mx, my, x, y); c.strokeStyle = 'rgba(26,129,189,0.9)'; c.lineWidth = 6; c.setLineDash([2, 12]); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#1A81BD'; c.stroke();
      c.fillStyle = INK; c.font = font(700, 28);
      const [ax, ay, al] = { left: [-20, 10, 'right'], right: [20, 10, 'left'], above: [0, -22, 'center'], below: [0, 44, 'center'] }[side];
      c.textAlign = al; c.fillText(n, x + ax, y + ay); c.textAlign = 'left';
    }
    c.beginPath(); c.arc(...home, 15, 0, Math.PI * 2); c.fillStyle = '#FF5A3C'; c.fill();
    c.fillStyle = INK; c.font = font(700, 30); c.textAlign = 'right'; c.fillText('인천', home[0] - 24, home[1] + 40); c.textAlign = 'left';
    c.restore();
    c.fillStyle = MUTED; c.font = font(500, 21);
    c.fillText('점선: 인천 출발 항로   ·   다홍: 출발지', left, H - 40);
    folds(c, W, H);
  }

  // 휴대폰 잠금 화면: 시각, '내 여행' 다음 일정, '동반자'
  // 입체 지도에서 휴대폰은 코스 요약판: 담은 순서대로 번호, 장소, 지역
  function courseScreen(c, W, H, list) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1A81BD'); g.addColorStop(1, '#0A3C66');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = font(600, 30); c.fillText('코스 만들기', 64, 150);
    c.fillStyle = '#fff'; c.font = font(700, 72); c.fillText('내 코스', 64, 240);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = font(500, 32); c.fillText(list.length ? `국내 · ${list.length}곳` : '국내', 64, 296);
    if (!list.length) {
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = font(600, 40);
      c.fillText('지도에서 장소를 골라', 64, 520); c.fillText('코스에 담아 보세요', 64, 580);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = font(500, 30); c.fillText('담은 순서대로 이곳에 쌓여요', 64, 640);
    }
    const shown = list.slice(0, 8);
    shown.forEach((p, i) => {
      const y = 400 + i * 128;
      if (i < shown.length - 1) { c.fillStyle = 'rgba(255,90,60,0.55)'; c.fillRect(64 + 33, y + 34, 4, 128 - 68); } // 다음 장소로 이어지는 선
      c.beginPath(); c.arc(64 + 35, y, 34, 0, Math.PI * 2); c.fillStyle = '#FF5A3C'; c.fill();
      c.fillStyle = '#fff'; c.font = font(700, 32); c.textAlign = 'center'; c.fillText(String(i + 1), 64 + 35, y + 11); c.textAlign = 'left';
      c.fillStyle = '#fff'; c.font = font(700, 42); c.fillText(p.name, 136, y + 6);
      c.fillStyle = 'rgba(255,255,255,0.65)'; c.font = font(500, 26); c.fillText(p.trip, 136, y + 46);
    });
    if (list.length > shown.length) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = font(600, 28); c.fillText(`외 ${list.length - shown.length}곳`, 136, 400 + shown.length * 128); }
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = font(600, 30); c.textAlign = 'center'; c.fillText('eodi', W / 2, H - 70); c.textAlign = 'left';
  }

  // 좌석 휴대폰 화면: 동반자 앱(companion.js) 홈과 같은 모습. 흰색과 브랜드 블루, 위는 블루 면, 아래는 흰 시트, 떠 있는 알약 탭
  // d: companion.seat(mode) 요약 { trip, when, dates, me, crew[{name,color}], todo[[라벨, 제목, 설명]], badges }
  function seatHome(c, W, H, d, now) {
    const u = W / 390, BLUE = '#1478D6', PAGE = '#F5F8FC', TX = '#0B2A44', MU = '#6A8196';
    const rr = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x * u, y * u, w * u, h * u, r * u); };
    const txt = (s, x, y, w, px, col, align = 'left') => { c.font = font(w, px * u); c.fillStyle = col; c.textAlign = align; c.fillText(s, x * u, y * u); };
    const fit = (s, px, w, max) => { c.font = font(w, px * u); if (c.measureText(s).width <= max * u) return s; let t = s; while (t.length > 1 && c.measureText(t + '…').width > max * u) t = t.slice(0, -1); return t + '…'; };
    const wrap = (s, px, w, max) => { c.font = font(w, px * u); const out = []; let line = ''; for (const ch of s) { if (c.measureText(line + ch).width > max * u && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); return out.slice(0, 2); };
    c.textBaseline = 'alphabetic';
    c.fillStyle = PAGE; c.fillRect(0, 0, W, H);
    // 블루 면: 여행 이름, 날짜, 함께 가는 사람
    const heroH = 300;
    c.fillStyle = BLUE; c.fillRect(0, 0, W, (heroH + 30) * u);
    const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
    txt(`${hh}:${mm}`, 34, 33, 600, 15, '#fff');
    c.globalAlpha = 0.4; c.fillStyle = '#fff'; rr(332, 21, 25, 12, 4); c.fill(); c.globalAlpha = 1; c.fillStyle = '#fff'; rr(334, 23, 15, 8, 2); c.fill();
    c.font = font(700, 13 * u); const kw = c.measureText(d.when).width / u + 20;
    c.fillStyle = 'rgba(255,255,255,0.16)'; rr(24, 78, kw, 26, 9); c.fill(); txt(d.when, 34, 96, 700, 13, '#fff');
    txt(fit(d.trip, 34, 800, 340), 24, 152, 800, 34, '#fff');
    c.globalAlpha = 0.82; txt(d.dates, 24, 180, 500, 15, '#fff'); c.globalAlpha = 1;
    const ppl = [d.me].concat(d.crew);
    ppl.forEach((p, i) => { const x = 24 + 17 + i * 26, y = 226; c.beginPath(); c.arc(x * u, y * u, 19.5 * u, 0, Math.PI * 2); c.fillStyle = BLUE; c.fill(); c.beginPath(); c.arc(x * u, y * u, 17 * u, 0, Math.PI * 2); c.fillStyle = p.color; c.fill(); txt(p.name, x, y + 4.5, 800, 13, '#fff', 'center'); });
    const names = d.crew.length ? `${d.crew.map((p) => p.name).join(', ')}와 함께` : '아직 혼자예요';
    txt(fit(names, 14, 600, 150), 24 + ppl.length * 26 + 22, 231, 600, 14, 'rgba(255,255,255,0.92)');
    c.fillStyle = '#fff'; rr(296, 209, 70, 34, 17); c.fill(); txt('+ 초대', 331, 231, 800, 13, BLUE, 'center');
    // 흰 시트: 지금 할 일
    c.fillStyle = PAGE; rr(0, heroH, 390, 600, 30); c.fill();
    txt('지금 할 일', 22, heroH + 42, 800, 17, TX);
    let y = heroH + 60;
    for (const [k, a, b] of d.todo.slice(0, 3)) {
      const lines = wrap(a, 16, 700, 318), h = 30 + lines.length * 22 + 22;
      if (y + h > 740) break;
      c.save(); c.shadowColor = 'rgba(11,42,68,0.06)'; c.shadowBlur = 4 * u; c.shadowOffsetY = 1 * u; c.fillStyle = '#fff'; rr(22, y, 346, h, 22); c.fill(); c.restore();
      txt(k, 40, y + 26, 800, 12, BLUE);
      lines.forEach((l, i) => txt(l, 40, y + 49 + i * 22, 700, 16, TX));
      txt(fit(b, 13, 500, 310), 40, y + 49 + lines.length * 22 + 2, 500, 13, MU);
      y += h + 10;
    }
    // 떠 있는 알약 탭 (동반자 탭이 펼쳐진 상태)
    const tabY = 844 - 24 - 64 - (844 - H / u), tabX = 18, tabW = 354;
    c.save(); c.shadowColor = 'rgba(11,42,68,0.22)'; c.shadowBlur = 28 * u; c.shadowOffsetY = 12 * u; c.fillStyle = '#fff'; rr(tabX, tabY, tabW, 64, 34); c.fill(); c.restore();
    const inner = tabW - 12, unit = (inner - 12) / (2.1 + 3), on = unit * 2.1;
    c.fillStyle = BLUE; rr(tabX + 6, tabY + 6, on, 52, 26); c.fill();
    const icon = (k, cx, cy, col) => { // 앱 아이콘과 같은 모양 (선으로)
      c.save(); c.translate((cx - 11) * u, (cy - 11) * u); c.scale(u, u); c.strokeStyle = col; c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round';
      const P = { people: 'M11.2 8a3.2 3.2 0 1 1-6.4 0a3.2 3.2 0 1 1 6.4 0M2.5 18C3 14.9 5.3 13 8 13S13 14.9 13.5 18M18.1 7.5a2.6 2.6 0 1 1-5.2 0a2.6 2.6 0 1 1 5.2 0M15 12.2C17.4 12.2 19.1 13.9 19.5 16.5',
        vote: 'M6.5 4H15.5Q19 4 19 7.5V14.5Q19 18 15.5 18H6.5Q3 18 3 14.5V7.5Q3 4 6.5 4ZM7 11.2L9.6 13.6L15 8.4',
        money: 'M5.5 5H16.5Q19.5 5 19.5 8V14Q19.5 17 16.5 17H5.5Q2.5 17 2.5 14V8Q2.5 5 5.5 5ZM13.6 11a2.6 2.6 0 1 1-5.2 0a2.6 2.6 0 1 1 5.2 0M5.5 8.5V13.5M16.5 8.5V13.5',
        meet: 'M11 19.5C11 19.5 17 14 17 9.2C17 5.8 14.3 3 11 3S5 5.8 5 9.2C5 14 11 19.5 11 19.5ZM13.3 9.2a2.3 2.3 0 1 1-4.6 0a2.3 2.3 0 1 1 4.6 0' };
      c.stroke(new Path2D(P[k])); c.restore();
    };
    const cy = tabY + 32, first = tabX + 6 + on / 2;
    icon('people', first - 26, cy, '#fff'); txt('동반자', first + 12, cy + 5, 700, 14, '#fff', 'center');
    ['vote', 'money', 'meet'].forEach((k, i) => {
      const cx = tabX + 6 + on + 4 + unit * i + 4 * i + unit / 2; icon(k, cx, cy, MU);
      const n = (d.badges || {})[k]; if (n) { c.fillStyle = BLUE; c.beginPath(); c.arc((cx + 14) * u, (cy - 15) * u, 9 * u, 0, Math.PI * 2); c.fill(); txt(String(n), cx + 14, cy - 11, 700, 10, '#fff', 'center'); }
    });
    c.textAlign = 'left';
  }

  function phone(c, W, H, mode, now) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mode === 'overseas' ? '#0F4E8E' : '#1A81BD'); g.addColorStop(1, mode === 'overseas' ? '#061A3A' : '#0A3C66');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = font(500, 30); c.fillText(`${now.getMonth() + 1}월 ${now.getDate()}일 ${'일월화수목금토'[now.getDay()]}요일`, W / 2, 170);
    c.font = font(600, 190); c.fillText(`${hh}:${mm}`, W / 2, 360);
    // 위젯: 내 여행
    const card = (y, h) => { c.fillStyle = 'rgba(255,255,255,0.14)'; c.beginPath(); c.roundRect(48, y, W - 96, h, 36); c.fill(); };
    card(470, 250);
    c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = font(600, 28); c.fillText('내 여행', 88, 528);
    c.fillStyle = '#fff'; c.font = font(700, 50); c.fillText(mode === 'overseas' ? '겨울 홋카이도 2박 3일' : '가을 남도 1박 2일', 88, 600); // 동반자 앱(companion-data.js)과 같은 여행
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = font(500, 30); c.fillText(mode === 'overseas' ? '2월 6일 출발 · 인천 → 신치토세' : '11월 21일 출발 · 서울 → 부산', 88, 660);
    // 위젯: 동반자
    card(750, 220);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = font(600, 28); c.fillText('동반자', 88, 808);
    const people = [['지', '#FF8A5C'], ['민', '#8FE3FF'], ['서', '#C5F06F']];
    people.forEach(([t, col], i) => {
      const x = 118 + i * 84; c.beginPath(); c.arc(x, 890, 36, 0, Math.PI * 2); c.fillStyle = col; c.fill();
      c.fillStyle = INK; c.font = font(700, 30); c.textAlign = 'center'; c.fillText(t, x, 901); c.textAlign = 'left';
    });
    c.fillStyle = '#fff'; c.font = font(500, 30); c.fillText('3명과 함께 · 투표 1건', 380, 901);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = font(600, 30); c.textAlign = 'center'; c.fillText('eodi', W / 2, H - 70); c.textAlign = 'left';
  }

  window.EODI_PROPS = {
    map(mode, cv) { (mode === 'overseas' ? overseasMap : domesticMap)(cv.getContext('2d'), cv.width, cv.height); return cv; },
    phone(cv, mode, now, course, seat) { const c = cv.getContext('2d'); course ? courseScreen(c, cv.width, cv.height, course) : seat ? seatHome(c, cv.width, cv.height, seat, now) : phone(c, cv.width, cv.height, mode, now); return cv; }, // seat: 동반자 앱 홈과 같은 화면 (없으면 예전 잠금 화면)
  };
})();

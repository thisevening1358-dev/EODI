// eodi 워치: 걷는 중, 지도로 바로 찾기 (기획 06-3). Figma '워치 · 걷는 중 지도'를 그대로 옮김
// 실제 워치 앱이 아니라 46mm 크기 웹 시안. 크라운은 마우스 휠, 두 번 톡 치기는 화면 더블 클릭이나 'D' 키로 대신함
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const screen = $('#screen'), note = $('#note'), crown = $('#crown');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* 진동이 없는 기기 */ } };
  // 아이콘: Phosphor Icons (MIT)
  const P = {
    nav: 'M248,121.58a15.76,15.76,0,0,1-11.29,15l-.2.06-78,21.84-21.84,78-.06.2a15.77,15.77,0,0,1-15,11.29h-.3a15.77,15.77,0,0,1-15.07-10.67L41,61.41a1,1,0,0,1-.05-.16A16,16,0,0,1,61.25,40.9l.16.05,175.92,65.26A15.78,15.78,0,0,1,248,121.58Z',
    pin: 'M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z',
    plus: 'M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z',
    check: 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
    clock: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z',
    fork: 'M72,88V40a8,8,0,0,1,16,0V88a8,8,0,0,1-16,0ZM216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40ZM200,53.9c-32.17,24.57-38.47,84.42-39.7,106.1H200ZM119.89,38.69a8,8,0,1,0-15.78,2.63L112,88.63a32,32,0,0,1-64,0l7.88-47.31a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z',
    mount: 'M164,80a28,28,0,1,0-28-28A28,28,0,0,0,164,80Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,164,40Zm90.88,155.92-54.56-92.08A15.87,15.87,0,0,0,186.55,96h0a15.85,15.85,0,0,0-13.76,7.84L146.63,148l-44.84-76.1a16,16,0,0,0-27.58,0L1.11,195.94A8,8,0,0,0,8,208H248a8,8,0,0,0,6.88-12.08ZM88,80l23.57,40H64.43ZM22,192l33-56h66l18.74,31.8,0,0L154,192Zm150.57,0-16.66-28.28L186.55,112,234,192Z',
    tap: 'M56,76a60,60,0,0,1,120,0,8,8,0,0,1-16,0,44,44,0,0,0-88,0,8,8,0,1,1-16,0Zm140,44a27.9,27.9,0,0,0-13.36,3.39A28,28,0,0,0,144,106.7V76a28,28,0,0,0-56,0v80l-3.82-6.13a28,28,0,0,0-48.41,28.17l29.32,50A8,8,0,1,0,78.89,220L49.6,170a12,12,0,1,1,20.78-12l.14.23,18.68,30A8,8,0,0,0,104,184V76a12,12,0,0,1,24,0v68a8,8,0,1,0,16,0V132a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0v36c0,21.61-7.1,36.3-7.16,36.42a8,8,0,0,0,3.58,10.73A7.9,7.9,0,0,0,208,232a8,8,0,0,0,7.16-4.42c.37-.73,8.85-18,8.85-43.58V148A28,28,0,0,0,196,120Z',
  };
  const icon = (k) => `<svg class="ic" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${P[k]}"/></svg>`;
  const PH = '../assets/course/';
  const NEAR = [
    { id: 'haenyeo', name: '영도 해녀촌', sub: '걸어서 6분', photo: PH + 'place-haenyeo-1.jpg', line: '걸어서 6분, 해산물', after: '흰여울 다음, 16:20' },
    { id: 'jeoryeong', name: '절영해안산책로', sub: '걸어서 4분', photo: PH + 'place-jeoryeong-1.jpg', line: '걸어서 4분, 바다 산책', after: '흰여울 다음, 16:10' },
    { id: 'taejong', name: '태종대 등대', sub: '버스 12분', photo: PH + 'place-taejongdae-3.jpg', line: '버스 12분, 노을 전망', after: '흰여울 다음, 16:30' },
  ];

  // ---------- 시각: 예시 장면은 14:16에서 시작해 실제 초만큼 흐름 ----------
  const t0 = Date.now(), base = 14 * 3600 + 16 * 60;
  const nowSec = () => base + Math.floor((Date.now() - t0) / 1000);
  const hm = (s) => `${Math.floor(s / 3600) % 24}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`;

  // ---------- 걷기: 내 위치가 길을 따라 움직임 (예시로 40초에 도착) ----------
  const MAP = window.EODI_WMAP, B = MAP.end; // 벡터 지도와 길 (map.js). 좌표는 지도 층 기준 = Figma 화면 좌표 + 30
  const WALK = 40000; let walk0 = performance.now(), arrivedAt = 0, zoom = 1;
  const progress = () => (reduce ? 0 : Math.min(1, (performance.now() - walk0) / WALK));

  // ---------- 화면 그리기 ----------
  const V = {};
  screen.querySelectorAll('.view').forEach((v) => (V[v.dataset.view] = v));
  V.face.innerHTML = `<i class="wall" aria-hidden="true"></i><div class="face-date">11월 27일 금</div><div class="face-time" id="ftime">14:16</div>
    <button class="widget" data-go="map" aria-label="다음 장소 지도 열기"><span class="ring"><svg viewBox="0 0 60 60"><circle class="r-bg" cx="30" cy="30" r="27"/><circle class="r-fg" id="ring" cx="30" cy="30" r="27" stroke-dasharray="169.6" stroke-dashoffset="50"/></svg><b id="rmin">4분</b></span>
    <div><b>흰여울</b><span id="wdist">350m</span><em>14:20 도착</em></div></button>`;
  V.map.innerHTML = `<div class="map-layer" id="mlayer">${MAP.svg}
      <svg class="route-svg" viewBox="0 0 208 288" aria-hidden="true"><defs><filter id="rglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>
        <path class="r-walked" id="rwalk" d="${MAP.route}"/><path class="r-glow" id="rglow" d="${MAP.route}" filter="url(#rglow)"/><path class="r-line" id="rline" d="${MAP.route}"/></svg>
      <span class="dest" id="dest" style="left:${B[0]}px;top:${B[1]}px"><i class="dest-halo"></i><span class="dest-pin"><img src="${PH}place-huinnyeoul-2.jpg" alt=""></span></span>
      <i class="me" id="me"><i class="cone" id="cone"></i></i></div>
    <div class="map-top"></div><span class="ttl">다음 장소</span><span class="clock"></span>
    <button class="map-card" id="mcard" data-go="near" aria-label="근처에 가볼 곳 보기"><span class="row"><span class="nav" id="nav">${icon('nav')}</span><span class="dist" id="dist">350m</span><span class="eta" id="eta">4분</span></span><span class="name" id="mname">흰여울문화마을</span></button>`;
  V.near.innerHTML = `<span class="ttl">근처에 가볼 곳</span><span class="clock"></span><div class="near-list" id="nlist">${NEAR.map((n, i) => `<button class="near-item" data-near="${i}"><span class="th">${n.photo ? `<img src="${n.photo}" alt="">` : icon(n.ic)}</span><span><b>${n.name}</b><span>${n.sub}</span></span></button>`).join('')}</div><div class="near-fade"></div>`;
  V.done.innerHTML = `<span class="clock"></span><div class="done-ck"><svg viewBox="0 0 34 34"><path d="M8 17.5l6 6L26 11"/></svg></div><div class="done-txt"><b>코스에 넣었어요</b><span id="dafter">흰여울 다음, 16:30</span></div>`;
  function drawPlace(n) {
    V.place.innerHTML = `${n.photo ? `<img class="place-ph" src="${n.photo}" alt="">` : `<div class="place-ph" style="display:grid;place-items:center;background:linear-gradient(160deg,#2A2F5C,#141838);color:var(--acc);font-size:56px">${icon(n.ic)}</div>`}
      <div class="place-shade"></div><span class="ttl">근처</span><span class="clock"></span>
      <div class="place-txt"><b>${n.name}</b><span>${n.line}</span></div>
      <button class="wbtn" style="bottom:14px" data-add="${n.id}">${icon('plus')}코스에 넣기</button>`;
  }

  // ---------- 화면 이동: 앞으로는 오른쪽에서, 뒤로는 왼쪽에서 튕기며 ----------
  let cur = 'face'; const stack = [];
  function show(name, how = 'fwd') {
    if (name === cur) return;
    const from = V[cur], to = V[name];
    to.classList.remove('is-on', 'is-back', 'is-zoom');
    if (how === 'back') to.classList.add('is-back'); else if (how === 'zoom') to.classList.add('is-zoom');
    void to.offsetWidth;
    to.classList.remove('is-back', 'is-zoom'); to.classList.add('is-on');
    from.classList.remove('is-on'); if (how === 'fwd') from.classList.add('is-back'); else from.classList.remove('is-back');
    if (how !== 'back') stack.push(cur); cur = name; tick(); buzz(6); syncPanel();
  }
  const back = () => { if (note.classList.contains('is-on')) return closeNote(); const p = stack.pop(); if (p) show(p, 'back'); };
  const home = () => { stack.length = 0; closeNote(); show('face', 'back'); };

  // ---------- 걷기: 매 프레임 내 위치와 남은 길 ----------
  const me = $('#me'), cone = $('#cone'), rline = $('#rline'), L = rline.getTotalLength(), mlayer = $('#mlayer');
  const rglow = $('#rglow'), rwalk = $('#rwalk'), dest = $('#dest');
  let heading = 0;
  function drawWalk() {
    const t = progress(), w = t * L, p = rline.getPointAtLength(w);
    const a = rline.getPointAtLength(Math.max(0, w - 3)), b = rline.getPointAtLength(Math.min(L, w + 3));
    if (t < 1) heading = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    me.style.left = p.x + 'px'; me.style.top = p.y + 'px'; cone.style.rotate = (heading + 90) + 'deg';
    const left = `0 ${w.toFixed(2)} ${(L - w + 1).toFixed(2)} ${L}`;
    rline.style.strokeDasharray = rglow.style.strokeDasharray = left;
    rwalk.style.strokeDasharray = `${w.toFixed(2)} ${L}`;
    const nav = $('#nav'); nav.style.rotate = (heading + 135) + 'deg'; nav.classList.toggle('is-off', t >= 1); // 아이콘 기본 방향이 왼쪽 위(-135도). 도착하면 숨김
    dest.classList.toggle('is-here', t >= 1);
    mlayer.style.transformOrigin = `${p.x}px ${p.y}px`; mlayer.style.transform = `scale(${zoom})`;
    if (!reduce) requestAnimationFrame(drawWalk);
  }
  // ---------- 시각과 글자: 0.25초마다 ----------
  function tick() {
    const s = nowSec(); document.querySelectorAll('.clock').forEach((c) => (c.textContent = hm(s))); $('#ftime').textContent = hm(s);
    const t = progress();
    const m = Math.max(0, Math.round((350 * (1 - t)) / 10) * 10), min = Math.max(1, Math.ceil(4 * (1 - t)));
    const card = $('#mcard');
    if (t >= 1) {
      if (!arrivedAt) { arrivedAt = performance.now(); buzz(20); }
      $('#dist').textContent = '도착'; $('#eta').textContent = ''; card.classList.add('is-arrived');
      if (performance.now() - arrivedAt > 5000) { walk0 = performance.now(); arrivedAt = 0; card.classList.remove('is-arrived'); } // 예시라 다시 걸음
    } else { $('#dist').textContent = m + 'm'; $('#eta').textContent = min + '분'; }
    $('#rmin').textContent = t >= 1 ? '도착' : min + '분'; $('#wdist').textContent = t >= 1 ? '도착했어요' : m + 'm';
    $('#ring').style.strokeDashoffset = (169.6 * t).toFixed(1);
    if (reduce) drawWalk();
  }
  drawWalk();
  (function loop() { tick(); if (!reduce) setTimeout(loop, 250); })();

  // ---------- 누르기 ----------
  screen.addEventListener('click', (e) => {
    if (Date.now() < noClick) return;
    const t = e.target.closest('[data-go],[data-near],[data-add],[data-note]'); if (!t) return;
    if (t.dataset.go) show(t.dataset.go, cur === 'face' ? 'zoom' : 'fwd');
    else if (t.dataset.near) { drawPlace(NEAR[+t.dataset.near]); show('place'); }
    else if (t.dataset.add) addToCourse(t.dataset.add);
    else if (t.dataset.note) noteAction(t.dataset.note);
  });
  function addToCourse(id) {
    const n = NEAR.find((x) => x.id === id); $('#dafter').textContent = n.after;
    show('done'); buzz(16);
    setTimeout(() => { stack.length = 0; stack.push('face'); show('map', 'back'); }, 1900);
  }

  // ---------- 알림: 출발 5분 전, 동행 제안 ----------
  let noteKind = null;
  function openNote(kind) {
    noteKind = kind;
    note.innerHTML = kind === 'depart'
      ? `<div class="note-card"><div class="note-hd"><i class="app">${icon('clock')}</i><span class="t15 mu">eodi</span></div><span class="clock"></span>
        <div class="note-body"><b>5분 뒤 출발해요</b><span>버스 7번, 남포동</span></div>
        <button class="wbtn" style="bottom:${14 + 44 + 10}px" data-note="go">${icon('nav')}길 안내</button><button class="wbtn is-soft" style="bottom:14px" data-note="close">닫기</button></div>`
      : `<div class="note-card"><div class="note-hd"><i class="av">민</i><span class="t15 mu">동행</span></div><span class="clock"></span>
        <div class="note-body" style="top:48px"><b class="s18">순서 바꾸기 제안</b></div>
        <div class="vote-lines"><div><span>송도</span><em>14:30</em></div><div><span>흰여울</span><em>16:10</em></div></div>
        <button class="wbtn" id="yes" style="bottom:14px" data-note="yes">${icon('tap')}찬성</button><i class="tap-ring" id="tring"></i></div>`;
    note.classList.add('is-on'); tick(); buzz([12, 60, 12]); syncPanel();
  }
  function closeNote() { note.classList.remove('is-on'); noteKind = null; syncPanel(); }
  function noteAction(a) {
    if (a === 'close') closeNote();
    else if (a === 'go') { closeNote(); if (cur !== 'map') show('map', cur === 'face' ? 'zoom' : 'fwd'); }
    else if (a === 'yes') approve();
  }
  function approve() {
    if (noteKind !== 'vote') return; const y = $('#yes'); if (!y || y.classList.contains('is-done')) return;
    const r = $('#tring'); r.classList.remove('is-go'); void r.offsetWidth; r.classList.add('is-go');
    y.classList.add('is-done'); y.innerHTML = `${icon('check')}찬성했어요`; buzz([10, 40, 10]);
    setTimeout(closeNote, 1300);
  }

  // ---------- 손가락: 위로 밀면 근처, 오른쪽으로 밀면 뒤로, 두 번 톡 치면 찬성 ----------
  let sx = 0, sy = 0, st = 0, noClick = 0, lastTap = 0;
  screen.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); });
  screen.addEventListener('pointerup', (e) => {
    const k = $('#device').getBoundingClientRect().width / 248 || 1; // 목업 확대 배율
    const dx = (e.clientX - sx) / k, dy = (e.clientY - sy) / k, fast = performance.now() - st < 450;
    if (Math.abs(dx) > 40 && dx > Math.abs(dy) && fast) { noClick = Date.now() + 200; back(); return; }
    if (dy < -36 && Math.abs(dy) > Math.abs(dx) && fast && cur === 'map' && !noteKind) { noClick = Date.now() + 200; show('near'); return; }
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) { const now = performance.now(); if (noteKind === 'vote' && now - lastTap < 320) approve(); lastTap = now; }
  });

  // ---------- 디지털 크라운: 돌리면 확대(지도)나 스크롤(목록), 누르면 시계 화면 ----------
  let ridge = 0;
  function turn(d) {
    ridge += d * 0.6; crown.firstElementChild.style.backgroundPosition = `0 ${ridge}px`;
    if (cur === 'map' && !noteKind) { zoom = Math.max(1, Math.min(2.4, zoom - d * 0.004)); if (reduce) drawWalk(); }
    else if (cur === 'near') $('#nlist').scrollBy({ top: d * 0.8 });
    if (Math.abs(d) > 2) buzz(2);
  }
  document.addEventListener('wheel', (e) => { if (!e.target.closest('.device')) return; e.preventDefault(); turn(e.deltaY); }, { passive: false });
  crown.addEventListener('click', home);
  $('#side').addEventListener('click', () => { closeNote(); show('map', cur === 'face' ? 'zoom' : 'fwd'); });

  // ---------- 옆 버튼 (시연용) ----------
  // 화면마다 짧은 설명: 버튼을 누르면 설명만 바뀌고(워치 화면은 그대로), 워치 안에서 화면을 옮기면 그 화면 설명으로 따라감
  const DESC = {
    map: ['다음 장소 지도', '워치를 들면 처음 보이는 화면이에요. 다음 장소까지의 길과 남은 거리, 시간을 보여 줘요. 크라운(마우스 휠)을 돌리면 지도가 커지고, 아래 카드를 누르거나 화면을 위로 밀면 근처에 가볼 곳이 나와요.', '시계 화면의 위젯을 누르거나, 워치 오른쪽 측면 버튼(크라운 아래 긴 버튼)을 눌러요.'],
    near: ['근처에 가볼 곳', '지금 있는 곳에서 가까운 곳 세 군데를 걸어서 몇 분인지와 함께 보여 줘요. 크라운으로 내려 보고, 누르면 장소를 자세히 봐요.', '다음 장소 지도에서 아래 카드를 누르거나, 화면을 위로 밀어요.'],
    place: ['장소 보기', '사진 한 장과 한 줄 설명만 보여 줘요. 코스에 넣기를 누르면 지금 가는 장소 다음 순서로 들어가요.', '근처에 가볼 곳에서 장소 하나를 눌러요.'],
    depart: ['출발 알림', '다음 장소로 떠날 시간 5분 전에 와요. 길 안내를 누르면 바로 지도로 가요.', '숫자 키 5. 실제로는 출발 5분 전에 저절로 와요.'],
    vote: ['동행 제안', '같이 가는 사람이 순서를 바꾸자고 하면 와요. 화면을 두 번 톡 치면 찬성해요. 여기서는 화면을 두 번 클릭해요.', '숫자 키 6. 실제로는 동행이 순서를 바꾸자고 하면 와요.'],
    face: ['시계 화면 위젯', '앱을 열지 않아도 시계 화면에서 다음 장소와 남은 시간을 볼 수 있어요. 위젯을 누르면 지도가 열려요.', '디지털 크라운(오른쪽 위 돌기)을 눌러요. 처음 열면 이 화면이에요.'],
  };
  const acts = document.querySelector('.acts'), desc = $('#desc');
  function syncPanel(pick) {
    const k = pick || noteKind || cur; if (!DESC[k]) return;
    acts.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.demo === k));
    if (desc.dataset.k === k) return;
    desc.dataset.k = k; desc.querySelector('b').textContent = DESC[k][0]; desc.querySelector('p').textContent = DESC[k][1]; desc.querySelector('.how span').textContent = DESC[k][2];
    desc.classList.remove('is-in'); void desc.offsetWidth; desc.classList.add('is-in');
  }
  acts.addEventListener('click', (e) => {
    const b = e.target.closest('[data-demo]'); if (b) syncPanel(b.dataset.demo);
  });
  // 숫자 키: 1 시계 화면, 2 지도, 3 근처, 4 장소, 5 출발 알림, 6 동행 제안, 7 넣었어요
  function jump(k) {
    if (k === '1') home();
    else if (k === '2' || k === '3' || k === '4' || k === '7') { closeNote(); const v = { 2: 'map', 3: 'near', 4: 'place', 7: 'done' }[k]; if (v === 'place') drawPlace(NEAR[2]); show(v, cur === 'face' ? 'zoom' : 'fwd'); }
    else if (k === '5') openNote('depart'); else if (k === '6') openNote('vote');
  }
  addEventListener('keydown', (e) => { if (/^[1-7]$/.test(e.key)) jump(e.key); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); else if (e.key === 'ArrowDown') turn(40); else if (e.key === 'ArrowUp') turn(-40); else if (e.key === 'd' || e.key === 'D') approve(); });

  // 목업 크기: 화면 높이에 맞춰 1~1.9배 (휴대폰처럼 좁으면 아래 설명 칸 자리를 뺌)
  function fit() { const narrow = innerWidth <= 760, k = Math.max(0.9, Math.min(1.9, (innerHeight - (narrow ? 250 : 90)) / 320, (narrow ? innerWidth - 48 : innerWidth * 0.5) / 262)); document.documentElement.style.setProperty('--k', k.toFixed(3)); }
  fit(); addEventListener('resize', fit);
  // 유리 반사가 마우스를 따라 조금 움직임
  addEventListener('pointermove', (e) => { const d = $('#device'), r = d.getBoundingClientRect(); d.style.setProperty('--gx', (20 + 25 * ((e.clientX - r.left) / r.width)).toFixed(1) + '%'); d.style.setProperty('--gy', (10 + 25 * ((e.clientY - r.top) / r.height)).toFixed(1) + '%'); });

  // 처음: 시계 화면이 살짝 떠오르며 켜짐
  V.face.classList.add('is-zoom'); requestAnimationFrame(() => requestAnimationFrame(() => { V.face.classList.remove('is-zoom'); V.face.classList.add('is-on'); }));
  const q = new URLSearchParams(location.search); // 확인용: ?view=map|near|place|done, ?note=depart|vote
  if (q.get('view')) { const v = q.get('view'); if (v === 'place') drawPlace(NEAR[2]); setTimeout(() => show(v, 'fwd'), 50); }
  if (q.get('note')) setTimeout(() => openNote(q.get('note')), 120);
  syncPanel();
  const hashGo = () => { const h = location.hash.slice(1); if (/^[1-7]$/.test(h)) jump(h); }; // 예: index.html#5
  setTimeout(hashGo, 150); addEventListener('hashchange', hashGo);
})();

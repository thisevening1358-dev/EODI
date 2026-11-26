// 코스 만들기와 내 코스: 입체 지도 위에 겹치는 화면 (Figma '코스 만들기 1~4-2', '내 코스 5-1~5-4')
// 전국 화면은 3D 지도(atlas.js)를 그대로 쓰고 경로·핀만 그 위에 그림. 도시 세부는 평면 지도(OSM으로 그린 이미지)로 바꿔 끼움.
(function () {
  // 노트북 화면: 1920 너비에서 디자인한 판(왼쪽 칸, 아래 바, 카드, 머리글)을 화면 너비에 맞춰 줄임. 1920 이상은 그대로(1), 가장 작게 0.8
  // 지도에 붙는 핀과 이름표는 줄이지 않음 (자리가 지도 좌표라서). CSS에서는 zoom: var(--ui)
  function fitUI() {
    const w = window.innerWidth, k = w <= 860 ? 1 : Math.max(0.8, Math.min(1, w / 1920));
    const lx = 48 * k, lw = (w <= 1100 ? 440 : 560) * k; // 왼쪽 칸 (화면 px)
    const r = document.documentElement.style;
    r.setProperty('--ui', k.toFixed(4));
    r.setProperty('--map-cx-px', (w <= 860 ? w / 2 : lx + lw + (w - lx - lw) / 2).toFixed(1) + 'px'); // 지도 쪽 가운데 (아래 바 자리)
  }
  fitUI(); window.addEventListener('resize', fitUI);
  // 동반자 앱에서 정한 투표를 코스에 넣음. spec: { day, newCity | city+after | existing, t, note, x, y }, fl: { key, stops } (평면 지도 도시)
  function applyVote(courses, id, spec, name, fl) {
    const c = courses.find((x) => x.id === id), d = c && spec && c.days[spec.day]; if (!d) return false;
    if (spec.existing) { for (const ct of d.cities) for (const st of ct.stops) if (st.name === spec.existing) Object.assign(st, { note: spec.note, voted: true }); for (const st of c.flat || []) if (st.name === spec.existing) st.voted = true; return true; }
    const stop = { t: spec.t || '', name, note: spec.note || '', voted: true };
    if (spec.newCity) { d.cities.unshift({ key: spec.newCity, move: '', stops: [stop], solo: true }); return true; }
    const ct = d.cities.find((x) => x.key === spec.city); if (!ct || ct.stops.some((x) => x.name === name)) return false;
    ct.stops.splice(ct.stops.findIndex((x) => x.name === spec.after) + 1, 0, stop);
    if (fl && spec.city === fl.key && spec.x != null) { // 평면 지도 세부 일정에도 같은 자리
      c.flat = c.flat || JSON.parse(JSON.stringify(fl.stops));
      c.flat.splice(c.flat.findIndex((x) => x.name === spec.after) + 1, 0, { id: 'vote-' + Date.now(), t: spec.t, name, note: spec.note, card: '투표로 정함', x: spec.x, y: spec.y, move: '도보 10분', voted: true });
    }
    return true;
  }
  window.EODI_COURSE_APPLY = applyVote;
  window.EODI_COURSE = function (ctx) {
    const reduce = ctx.reduce;
    const AT = () => (ctx.getAtlas ? ctx.getAtlas() : ctx.atlas); // 해외는 세계 지도와 일본 지도를 오가므로 그때그때 지금 지도
    const D = ctx.data || window.EODI_COURSE_DATA, POI = ctx.pois || window.EODI_POIS || { all: [], singles: [], clusters: [] };
    const CITY = D.CITY;
    // 국내 값이 기본. 해외 데이터(course-data-jp.js)는 HOME, FLAT, TXT, DAY_COLORS 등으로 덮어씀
    const HOME = D.HOME || { key: 'seoul', label: '서울역', short: '서울', sub: '출발·도착', start: '서울역 출발' };
    const FL = D.FLAT || { key: 'busan', img: 'assets/course/busan-flat.png', stops: D.BUSAN_STOPS, places: D.BUSAN_PLACES, special: D.MINRAK, specialAt: 4, districts: D.DISTRICTS, nearby: D.NEARBY,
      event: '불꽃축제', eventPick: 'fireworks', moveSum: '이동 1시간 32분', similar: ['밀면', '돼지국밥', '씨앗호떡', '어묵', '물회'], mpp: 16.4 };
    const TX = Object.assign({ mine: '내 코스', redate: '열차 시간도 다시 찾아요', directSub: '지도에서 축제와 장소를 골라 담기', aiHint: '11월 마지막 주말, 친구 둘이랑 바다 보러 가고 싶어', aiConds: ['날짜', '출발역', '인원', '여유롭게'],
      startersT: '이번 주말 축제로 바로 시작', startersSub: '서울역 출발 기준', starterMove: (n) => `서울역 KTX, ${n} 도착`, propsSub: '요청과 축제 일정을 보고 만들었어요',
      aiFoot: '축제 일정, 붐비는 시간, 이동 시간을 보고 정했어요. 장소를 눌러 바로 고칠 수 있어요.', newDates: '11월 28일 금, 29일 토', newDday: 'D-6', other: null }, D.TXT);
    const DAYC = D.DAY_COLORS || ['var(--sky)', 'var(--sky2)']; // 일차별 색 (국내 2색, 해외 3색)
    const DEMO = D.DEMO || { course: 'namdo', alert: 'namdo' }; // 확인용 ?course= 로 바로 여는 코스
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const $ = (sel, el = document) => el.querySelector(sel);
    const after = (ms, fn) => setTimeout(fn, reduce ? 0 : ms);

    // ---------- 아이콘 ----------
    const I = {
      spark: (s = 16, c = 'currentColor') => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5L9.4 6.6L14.5 8L9.4 9.4L8 14.5L6.6 9.4L1.5 8L6.6 6.6L8 1.5Z" style="fill:${c}"/></svg>`,
      chev: (d = 'r', s = 12) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="${{ r: 'M4.5 2.5L8 6L4.5 9.5', l: 'M7.5 2.5L4 6L7.5 9.5', d: 'M2.5 4.5L6 8L9.5 4.5', u: 'M2.5 7.5L6 4L9.5 7.5' }[d]}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      plus: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      minus: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7H12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      more: '<svg class="ic" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><g fill="currentColor"><circle cx="4" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="14" cy="9" r="1.6"/></g></svg>',
      handle: '<svg class="ic" width="12" height="18" viewBox="0 0 12 18" aria-hidden="true"><g fill="currentColor"><circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/><circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/><circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/></g></svg>',
      bell: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 11.5V7.5C4 5.3 5.8 3.5 8 3.5C10.2 3.5 12 5.3 12 7.5V11.5L13 12.5H3L4 11.5Z" fill="currentColor"/><path d="M6.6 14H9.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      cal: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 6H12.5M4.5 1V3.5M9.5 1V3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
      train: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="3" y="1.5" width="8" height="9" rx="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 7H11M5 12.5L4 13.5M9 12.5L10 13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
      pencil: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10.5 2.5L13.5 5.5L5.5 13.5H2.5V10.5L10.5 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
      check: (s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="9" fill="currentColor" fill-opacity="0.14"/><path d="M5.4 9.2L7.8 11.5L12.6 6.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      checkOn: (s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10.2L8.7 12.8L14 7.4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      swap: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 5H11L8.5 2.5M11.5 9H3L5.5 11.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      redo: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M11.5 7A4.5 4.5 0 1 1 9.8 3.5M11.5 2V4.5H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      undo: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M4.5 2.5L2 5L4.5 7.5M2 5H8.5C10.4 5 12 6.6 12 8.5C12 10.4 10.4 12 8.5 12H5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      share: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="5" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="11.5" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="11.5" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M6.8 7L9.7 5M6.8 9L9.7 11" stroke="currentColor" stroke-width="1.5"/></svg>',
      stop: '<svg class="ic" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="2" fill="currentColor"/></svg>',
      search: '<svg class="ic" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.7"/><path d="M12.2 12.2L15.5 15.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      x: '<svg class="ic" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      mark: '<svg class="ic" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4.5 2.5H13.5V15.5L9 12.3L4.5 15.5V2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      clock: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M7 4V7.2L9 8.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      pin: '<svg class="ic" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 16C9 16 14 11.4 14 7.5C14 4.7 11.8 2.5 9 2.5C6.2 2.5 4 4.7 4 7.5C4 11.4 9 16 9 16Z" fill="currentColor"/><circle cx="9" cy="7.5" r="2" fill="#fff"/></svg>',
      copy: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M11 3V2.5C11 2.2 10.8 2 10.5 2H2.5C2.2 2 2 2.2 2 2.5V10.5C2 10.8 2.2 11 2.5 11H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      invite: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="6" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M1.5 13.5C1.8 11.2 3.7 9.5 6 9.5C8.3 9.5 10.2 11.2 10.5 13.5M12.5 6V10M10.5 8H14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      plane: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M12.6 1.4C12 0.8 11 0.9 10.4 1.5L8.2 3.7L2.4 2L1.2 3.2L6 6L3.9 8.1L2.2 7.8L1.2 8.8L3.6 10.4L5.2 12.8L6.2 11.8L5.9 10.1L8 8L10.8 12.8L12 11.6L10.3 5.8L12.5 3.6C13.1 3 13.2 2 12.6 1.4Z" fill="currentColor"/></svg>',
      car: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 9.5V7L3.4 3.8C3.6 3.3 4 3 4.6 3H9.4C10 3 10.4 3.3 10.6 3.8L12 7V9.5C12 9.8 11.8 10 11.5 10H2.5C2.2 10 2 9.8 2 9.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2.5 7H11.5" stroke="currentColor" stroke-width="1.4"/><circle cx="4.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="9.5" cy="10.5" r="1.2" fill="currentColor"/></svg>',
      bed: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1.5 3V11.5M1.5 9H12.5V11.5M12.5 9V7.5C12.5 6.4 11.6 5.5 10.5 5.5H6.5V9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="6.5" r="1.3" fill="currentColor"/></svg>',
      trash: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 4.5H13.5M6 4.5V3C6 2.4 6.4 2 7 2H9C9.6 2 10 2.4 10 3V4.5M4 4.5L4.7 13C4.8 13.6 5.2 14 5.8 14H10.2C10.8 14 11.2 13.6 11.3 13L12 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };

    // ---------- 상태 ----------
    const S = {
      on: false, view: 'explore', stack: [],
      courses: clone(D.COURSES), past: clone(D.PAST), curId: null, day: 'all', alertMode: false,
      hoverCourse: null, hoverStarter: 0, menu: null, newMenu: false, undo: null, renaming: null, pastOpen: false, copied: null,
      cityKey: null, cityFrom: 'edit', sel: null, slotPick: false, photo: 0, query: '', cat: '전체', hoverPoi: null, moreDots: false,
      ai: { request: D.AI.request, chips: D.AI.chips.slice(), step: 0, timer: 0, sel: 0, cityIdx: 1, swap: null, stops: null, regen: false },
      dragCity: null,
    };
    const cur = () => S.courses.find((c) => c.id === S.curId);
    const cityOf = (e) => (e.key ? { ...CITY[e.key], ...e } : e);
    const placeCount = (c) => c.days.reduce((n, d) => n + d.cities.reduce((m, ct) => m + ct.stops.length, 0), 0);
    const flatCities = (c) => { const out = []; c.days.forEach((d, di) => d.cities.forEach((ct, ci) => out.push({ ct, di, ci }))); return out; };
    const tm = (t) => { const m = /^(\d+):(\d+)$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
    const fmt = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    // ---------- 바탕 DOM ----------
    const root = document.createElement('div'); root.id = 'course-ui' + (D.id ? '-' + D.id : ''); root.className = 'cx' + (D.id ? ' cx--' + D.id : ''); root.hidden = true;
    root.innerHTML = `
      <div class="cx-city" aria-label="${esc(CITY[FL.key].name)} 평면 지도"><div class="cx-world"><img class="cx-map" alt="" src="${FL.img}" draggable="false"><svg class="cx-wsvg" viewBox="0 0 1920 1080" preserveAspectRatio="none"></svg><div class="cx-wdots"></div><div class="cx-wpins"></div></div></div>
      <div class="cx-scrim"></div>
      <svg class="cx-nat" aria-hidden="true"><g class="cx-nat-glow"></g><g class="cx-nat-lines"></g></svg>
      <div class="cx-natpins"></div>
      <div class="cx-float"></div>
      <aside class="cx-left" aria-live="polite"></aside>
      <div class="cx-bar"></div>`;
    document.body.appendChild(root);
    const cityEl = $('.cx-city', root), world = $('.cx-world', root), wsvg = $('.cx-wsvg', root), wdots = $('.cx-wdots', root), wpins = $('.cx-wpins', root);
    const natSvg = $('.cx-nat', root), natGlow = $('.cx-nat-glow', root), natLines = $('.cx-nat-lines', root), natPins = $('.cx-natpins', root);
    const floatEl = $('.cx-float', root), left = $('.cx-left', root), bar = $('.cx-bar', root);

    // 탐색 화면 왼쪽 위 '탐색 / 내 코스' 전환 (atlas-head 맨 위)
    const heads = ctx.heads || [document.querySelector('.atlas-head')]; // 해외는 세계 지도와 일본 지도 머리글 두 곳
    const exploreSegs = heads.map((h) => { const el = document.createElement('div'); el.className = 'cx-seg cx-seg--explore'; h.prepend(el); el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act, b); }); return el; });
    const segHTML = (on) => `<div class="cx-seg-in" role="tablist" aria-label="지도 보기"><span class="cx-seg-thumb" aria-hidden="true"></span><button type="button" role="tab" class="cx-seg-opt${on === 'explore' ? ' is-on' : ''}" aria-selected="${on === 'explore'}" data-act="go-explore">탐색</button><button type="button" role="tab" class="cx-seg-opt${on === 'mine' ? ' is-on' : ''}" aria-selected="${on === 'mine'}" data-act="go-mine">내 코스${S.courses.length ? `<span class="cx-count">${S.courses.length}</span>` : ''}</button></div>`;
    // 탐색 화면 아래 코스 바 (담은 장소가 있을 때)
    const exploreBar = document.createElement('div'); exploreBar.className = 'cx-bar cx-bar--explore'; root.appendChild(exploreBar);

    // ---------- 화면 전환 ----------
    const NAT_VIEWS = ['mine', 'edit', 'ai-start', 'ai-gen', 'ai'];
    const CITY_VIEWS = ['city', 'add', 'ai-city'];
    const COURSE_POSE = D.COURSE_POSE || { lat: 36.15, lon: 125.05, dist: 31, pitch: 50 }; // 전국 화면보다 한반도를 오른쪽으로 (왼쪽 코스 칸 560 자리). 해외는 화면·코스에 따라 고르는 함수
    const coursePose = () => { const p = typeof COURSE_POSE === 'function' ? COURSE_POSE(S.view, cur(), S) : COURSE_POSE; return p && [p.lat, p.lon, p.dist].every(isFinite) ? p : (D.COURSE_POSE_FALLBACK || { lat: 36.15, lon: 125.05, dist: 31, pitch: 50 }); }; // 값이 비면 하늘을 보지 않게 기본 자리로
    let flatOn = false, poseKey = '';
    function go(view, opts = {}) {
      if (S.ai.timer && view !== 'ai-gen') { clearInterval(S.ai.timer); S.ai.timer = 0; }
      if (!opts.back && view !== S.view) S.stack.push(S.view);
      if (opts.back) S.stack.pop();
      S.view = view; S.menu = null; S.newMenu = false; S.hoverPoi = null;
      if (!CITY_VIEWS.includes(view)) { S.sel = null; S.slotPick = false; }
      render(true);
    }
    function setPose() {
      const v = S.view, key = v === 'explore' ? 'explore' : CITY_VIEWS.includes(v) ? 'city:' + S.cityKey : 'course:' + JSON.stringify(coursePose());
      if (key !== 'explore' && ctx.ensureMap) ctx.ensureMap(); // 해외: 코스 화면은 일본 지도에서 (세계 지도면 바꿔 끼움)
      if (key === poseKey) return; poseKey = key;
      if (key === 'explore') { AT().setCourseMode(false); AT().pose(null); return; }
      AT().setCourseMode(true);
      if (key.startsWith('course')) { AT().pose(coursePose()); return; }
      const c = CITY[S.cityKey] || CITY[FL.key]; // 도시로 확대 (평면 지도가 덮기 전 3D로 다가감)
      AT().pose({ lat: c.lat - 0.05, lon: c.lon - (hasFlat() ? 0 : 0.35), dist: hasFlat() ? 5 : 7.5, pitch: hasFlat() ? 62 : 50 }, 1100);
    }
    const hasFlat = () => S.cityKey === FL.key;
    function setFlat(on) {
      if (on === flatOn) return; flatOn = on;
      if (on) { fitWorld(true); cityEl.classList.remove('is-on'); after(reduce ? 0 : 650, () => { if (flatOn) cityEl.classList.add('is-on'); }); }
      else cityEl.classList.remove('is-on');
    }

    // ---------- 그리기 ----------
    function render(full) {
      const v = S.view, inCourse = S.on && v !== 'explore';
      document.body.classList.toggle('is-course', inCourse);
      document.body.classList.toggle('is-course-city', inCourse && CITY_VIEWS.includes(v));
      { const hs = segHTML('explore'); for (const el of exploreSegs) if (el._h !== hs) { el._h = hs; el.innerHTML = hs; } }
      updateExploreBar();
      if (!S.on) { placeThumb(); return; }
      setPose();
      setFlat(CITY_VIEWS.includes(v) && hasFlat());
      const L = { mine: leftMine, edit: leftEdit, 'ai-start': leftAiStart, 'ai-gen': leftAiGen, ai: leftAi, city: leftCity, add: leftAdd, 'ai-city': leftAiCity }[v];
      const scroll = left.scrollTop;
      if (!full) left.classList.remove('is-enter'); // 같은 화면을 다시 그릴 때는 들어오는 움직임을 반복하지 않음
      left.innerHTML = L ? L() : '';
      left.classList.toggle('is-on', !!L);
      if (!full) left.scrollTop = scroll;
      const B = { edit: barEdit, 'ai-gen': barAiGen, ai: barAi, city: barCity, add: barCity, 'ai-city': barAiCity }[v];
      bar.innerHTML = B ? B() : ''; bar.classList.toggle('is-on', !!B);
      bar.classList.toggle('is-city', CITY_VIEWS.includes(v));
      natSig = ''; buildNat();
      world.classList.toggle('is-draw', !!full); // 경로 그려짐, 핀 튀어나옴은 화면에 처음 들어올 때만
      if (CITY_VIEWS.includes(v) && hasFlat()) buildWorld(); else { wpins.innerHTML = ''; wdots.innerHTML = ''; wsvg.innerHTML = ''; }
      buildFloat();
      if (full && !reduce) { left.classList.remove('is-enter'); void left.offsetWidth; left.classList.add('is-enter'); }
      const f = left.querySelector('[data-autofocus]'); if (f && full) f.focus({ preventScroll: true });
      placeThumb();
    }
    // '탐색 / 내 코스' 흰 손잡이: 지난 자리에서 새 자리로 미끄러지며 살짝 늘었다 줄어듦 (용수철)
    let segPos = null;
    function placeThumb() {
      const box = S.view === 'explore' ? (exploreSegs.find((el) => el.offsetWidth) || exploreSegs[0]) : left;
      const inn = box.querySelector('.cx-seg-in'); if (!inn) return;
      const on = inn.querySelector('.cx-seg-opt.is-on'), th = inn.querySelector('.cx-seg-thumb'); if (!on || !th || !on.offsetWidth) return;
      const to = { x: on.offsetLeft, w: on.offsetWidth };
      const fresh = !th.style.width; // 방금 새로 그린 손잡이: 0에서 늘어나며 튀지 않게
      if (fresh && (!segPos || (segPos.x === to.x && segPos.w === to.w))) { th.style.transition = 'none'; th.style.transform = `translateX(${to.x}px)`; th.style.width = to.w + 'px'; void th.offsetWidth; th.style.transition = ''; segPos = to; return; }
      if (segPos && !reduce && (segPos.x !== to.x || segPos.w !== to.w)) { th.style.transition = 'none'; th.style.transform = `translateX(${segPos.x}px)`; th.style.width = segPos.w + 'px'; void th.offsetWidth; th.style.transition = ''; }
      th.style.transform = `translateX(${to.x}px)`; th.style.width = to.w + 'px';
      segPos = to;
    }

    // ---------- 공통 조각 ----------
    const seg = (on) => `<div class="cx-seg">${segHTML(on)}</div>`;
    const back = (label, act2 = 'back') => `<button type="button" class="cx-back" data-act="${act2}">${I.chev('l', 14)}<span>${esc(label)}</span></button>`;
    const avatars = (ids, cid) => (ids.length ? `<${cid ? `button type="button" data-act="crew" data-id="${cid}" aria-label="동반자 ${ids.map((k) => D.people[k][0]).join(', ')} 보기"` : 'span'} class="cx-ppl">${ids.map((k) => `<span class="cx-av" style="background:${D.people[k][1]}">${D.people[k][0]}</span>`).join('')}</${cid ? 'button' : 'span'}>` : '');
    const comp = (id) => (ctx.companionInfo ? ctx.companionInfo(id) : null);
    // 코스 편집 위 동반자 줄: 함께 가는 사람, 가장 최근 소식, 열린 투표
    function crewLine(c) {
      if (!ctx.openCompanion) return '';
      if (!c.people || !c.people.length) return `<button type="button" class="cx-crew is-empty" data-act="crew-invite" data-id="${c.id}">${I.invite}<span><b>아직 혼자예요</b><i>동반자를 초대하면 함께 고치고 투표해요</i></span>${I.chev('r')}</button>`;
      const inf = comp(c.id), nm = (k) => (k === 'me' ? '내가' : `${D.people[k][0]}가`);
      const line = inf && inf.latest ? `${nm(inf.latest[0])} ${inf.latest[1]}` : `${c.people.map((k) => D.people[k][0]).join(', ')}와 함께 가요`;
      return `<button type="button" class="cx-crew" data-act="crew" data-id="${c.id}"><span class="cx-ppl">${c.people.map((k) => `<span class="cx-av" style="background:${D.people[k][1]}">${D.people[k][0]}</span>`).join('')}</span>
        <span><b>동반자 ${c.people.length}명</b><i>${esc(line)}</i></span>${inf && inf.vote ? '<span class="cx-tag">투표 1건</span>' : ''}${I.chev('r')}</button>`;
    }
    const chain = (keys, on) => `<span class="cx-chain${on ? ' is-on' : ''}">${keys.map((k, i) => `${i ? '<i class="cx-chain-ln"></i>' : ''}<span class="cx-chain-c"><i class="cx-chain-dot${i === 0 ? ' is-start' : ''}"${on && i && D.DAY_COLORS ? ` style="background:${chainColor(k)}"` : ''}></i>${esc(k === HOME.key ? HOME.short : (CITY[k] ? CITY[k].name : k))}</span>`).join('')}</span>`;
    let chainCourse = null; // 해외: 체인 점 색을 그 도시가 든 날의 색으로
    const chainColor = (k) => { const c = chainCourse; if (!c) return DAYC[0]; const di = c.days.findIndex((d) => d.cities.some((ct) => (ct.key || ct.name) === k)); return DAYC[Math.max(0, Math.min(di, DAYC.length - 1))]; };
    const keysOf = (c) => [HOME.key, ...flatCities(c).map(({ ct }) => ct.key || ct.name).filter((k, i, a) => a.indexOf(k) === i)];
    const tag = (t) => (t ? `<span class="cx-tag">${esc(t)}</span>` : '');
    // 이동 칩: 국내는 글자만(KTX), 해외는 { kind: 'plane' | 'train' | 'car', text, tag }. from이 있으면 바뀐 시간 (알림)
    const moveHTML = (m, cls = '') => { if (!m) return ''; const o = typeof m === 'string' ? { kind: 'train', text: m } : m;
      return `<div class="cx-move ${cls}${o.from ? ' is-changed' : ''}"><i class="cx-move-ln"></i><button type="button" class="cx-chip cx-chip--move" data-act="move-pick">${I[o.kind] || I.train}${o.from ? `<s>${esc(o.from)}</s>${I.chev('r', 10)}` : ''}${esc(o.text)}${I.chev('d', 10)}</button>${tag(o.tag)}</div>`; };
    const btn = (label, act2, cls = '', icon = '', extra = '') => `<button type="button" class="cx-btn ${cls}" data-act="${act2}" ${extra}>${icon}<span>${esc(label)}</span></button>`;

    // ---------- 5-1 / 5-2 내 코스 ----------
    function leftMine() {
      if (!S.courses.length && !S.undo) return leftEmpty();
      const groups = [['다가오는 여행', 'upcoming'], ['만드는 중', 'draft']];
      let h = `${seg('mine')}<div class="cx-head"><h2 class="cx-title">${esc(TX.mine)}</h2><span class="cx-dim">${S.courses.length}개</span><span class="cx-grow"></span>
        <div class="cx-newwrap"><button type="button" class="cx-btn cx-btn--ink" data-act="new-menu" aria-expanded="${S.newMenu}">${I.plus}<span>새 코스</span></button>
        ${S.newMenu ? `<div class="cx-menu cx-menu--new" role="menu"><button type="button" role="menuitem" class="cx-mi" data-act="new-direct">${I.pin}<span><b>직접 만들기</b><i>${esc(TX.directSub)}</i></span></button><button type="button" role="menuitem" class="cx-mi" data-act="new-ai">${I.spark(16, 'var(--sky)')}<span><b>AI로 만들기</b><i>한 문장으로 코스 받기</i></span></button></div>` : ''}</div></div>`;
      for (const [title, st] of groups) {
        const list = S.courses.filter((c) => c.status === st);
        const undoHere = S.undo && S.undo.status === st;
        h += `<div class="cx-sec"><b>${title}</b><span class="cx-dim">${list.length}개</span></div>`;
        list.forEach((c, i) => {
          if (undoHere && S.undo.index === i) h += undoRow();
          h += courseCard(c);
        });
        if (undoHere && S.undo.index >= list.length) h += undoRow();
      }
      h += `<button type="button" class="cx-past" data-act="past" aria-expanded="${S.pastOpen}"><b>다녀온 여행</b><span class="cx-dim">${S.past.length}개</span>${S.pastOpen ? '' : `<span class="cx-dim cx-faint">${esc(S.past[0] ? S.past[0].name : '')}${S.past.length > 1 ? ` 외 ${S.past.length - 1}개` : ''}</span>`}<span class="cx-grow"></span>${I.chev(S.pastOpen ? 'u' : 'd')}</button>`;
      if (TX.other) h += `<button type="button" class="cx-othermode" data-act="other-mode"><span class="cx-dim">${esc(TX.other.text)}</span><span class="cx-grow"></span><b>${esc(TX.other.btn)}</b>${I.chev('r')}</button>`;
      if (S.pastOpen) h += `<div class="cx-pastlist">${S.past.map((p, i) => `<div class="cx-pastrow"><span><b>${esc(p.name)}</b><i>${esc(p.dates)}</i></span><button type="button" class="cx-link" data-act="again" data-i="${i}">다시 가기${I.chev('r')}</button></div>`).join('')}</div>`;
      return h;
    }
    function courseCard(c) {
      const hot = (S.hoverCourse || S.courses[0].id) === c.id, menu = S.menu === c.id;
      const badges = [c.dday ? `<span class="cx-badge${c.dday === '오늘 출발' ? ' is-hot' : ''}">${esc(c.dday)}</span>` : '', c.shared ? '<span class="cx-badge is-sky">함께</span>' : ''].join('');
      const title = S.renaming === c.id ? `<input class="cx-rename" data-id="${c.id}" value="${esc(c.name)}" aria-label="코스 이름" data-autofocus>` : `<b class="cx-cname">${esc(c.name)}</b>`;
      return `<article class="cx-course${hot ? ' is-hot' : ''}${menu ? ' is-menu' : ''}" data-course="${c.id}">
        <div class="cx-crow">${c.ai ? I.spark(14, 'var(--sky)') : ''}${title}${badges}<span class="cx-grow"></span>
          <button type="button" class="cx-more${menu ? ' is-on' : ''}" data-act="menu" data-id="${c.id}" aria-label="${esc(c.name)} 더보기" aria-expanded="${menu}">${I.more}</button>
          ${menu ? menuHTML(c) : ''}</div>
        <div class="cx-cmeta"><span class="${c.dates ? '' : 'cx-dim'}">${esc(c.dates || '날짜 아직 없음')}</span>${avatars(c.people, c.id)}<span class="cx-dim">장소 ${placeCount(c)}곳</span>${c.shared ? `<span class="cx-dim">${esc(c.shared)}</span>` : ''}</div>
        ${(chainCourse = c, chain(keysOf(c), hot))}
        ${c.alert ? `<button type="button" class="cx-alert" data-act="alert" data-id="${c.id}">${I.bell}<span>${esc(c.alert.text)}</span><span class="cx-grow"></span><b>확인하기</b>${I.chev('r')}</button>` : ''}
        ${!c.dates ? `<button type="button" class="cx-link" data-act="open" data-id="${c.id}">날짜 정하기${I.chev('r')}</button>` : ''}
        ${S.openCard === c.id ? cardDetail(c) : ''}
        <button type="button" class="cx-cover" data-act="card" data-id="${c.id}" aria-label="${esc(c.name)} 세부 일정 ${S.openCard === c.id ? '접기' : '보기'}" aria-expanded="${S.openCard === c.id}"></button>
      </article>`;
    }
    function cardDetail(c) { // 펼친 코스: 일차마다 이동, 도시, 장소와 시간, 숙소
      const flatCity = c.days.some((d) => d.cities.some((ct) => ct.key === FL.key));
      return `<div class="cx-cdetail">${c.days.map((d, di) => `<div class="cx-cd-day"><div class="cx-cd-h"><b>${esc(d.label)}</b><span class="cx-dim">${esc(d.date || '')}</span></div>
        ${d.cities.map((ct) => `${[].concat(ct.move || []).map((m) => { const o = typeof m === 'string' ? { kind: 'train', text: m } : m; return `<div class="cx-cd-move">${I[o.kind] || I.train}<span>${esc(o.text)}</span>${tag(o.tag)}</div>`; }).join('')}
          <div class="cx-cd-city"><i style="background:${numColor(di)}"></i><b>${esc(cityOf(ct).name)}</b><span class="cx-dim">${ct.stops.length}곳</span></div>
          ${ct.stops.map((s) => `<div class="cx-cd-stop${s.hot ? ' is-hot' : ''}"><span>${esc(s.t || '')}</span><b>${esc(s.name)}</b><span class="cx-dim">${esc(s.note || '')}</span></div>`).join('')}
          ${ct.stay ? `<div class="cx-cd-move">${I.bed}<span>${esc(ct.stay[0])}</span>${tag(ct.stay[1])}</div>` : ''}`).join('')}
        ${d.end ? (() => { const o = d.end; return `<div class="cx-cd-move">${I[o.kind] || I.train}<span>${esc(o.text)}</span>${tag(o.tag)}</div>`; })() : ''}</div>`).join('')}
        <div class="cx-cd-btns">${btn('코스 편집', 'open', 'cx-btn--ink', '', `data-id="${c.id}"`)}${flatCity ? btn(`${CITY[FL.key].name} 세부 코스`, 'card-city', 'cx-btn--soft', '', `data-id="${c.id}"`) : ''}</div></div>`;
    }
    function menuHTML(c) {
      const shared = !!c.shared;
      const it = (label, a, ic, sub, cls = '') => `<button type="button" role="menuitem" class="cx-mi ${cls}" data-act="${a}" data-id="${c.id}">${ic}<span><b>${label}</b>${sub ? `<i>${sub}</i>` : ''}</span></button>`;
      return `<div class="cx-menu" role="menu" aria-label="${esc(c.name)} 메뉴">
        ${it('이름 바꾸기', 'rename', I.pencil)}${it('날짜 바꾸기', 'open', I.cal, TX.redate)}${it('복제', 'dup', I.copy)}${it(S.copied === c.id ? '링크를 복사했어요' : '동행 초대, 공유', 'share', I.invite)}
        <i class="cx-mi-gap"></i>${it(shared ? '코스에서 나가기' : '삭제', 'del', I.trash, '', 'is-danger')}</div>`;
    }
    const undoRow = () => `<div class="cx-undo" role="status"><svg class="cx-undo-ring" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" style="stroke:var(--ink)" stroke-opacity="0.15" stroke-width="2.5"/><circle class="cx-undo-arc" cx="10" cy="10" r="8" fill="none" style="stroke:var(--sky)" stroke-width="2.5" stroke-linecap="round" transform="rotate(-90 10 10)"/></svg>
      <b>"${esc(S.undo.course.name)}"를 ${S.undo.course.shared ? '나갔어요' : '지웠어요'}</b>${S.undo.course.people && S.undo.course.people.length && S.undo.course.status === 'upcoming' && !S.undo.course.shared ? `<span class="cx-dim">동행 ${S.undo.course.people.length - 1}명에게서도 사라져요</span>` : ''}<span class="cx-grow"></span><button type="button" class="cx-btn cx-btn--white" data-act="undo">${I.undo}<span>되돌리기</span></button></div>`;
    function leftEmpty() {
      return `${seg('mine')}<h2 class="cx-title cx-title--big">첫 코스를 만들어 볼까요</h2><p class="cx-lead">가고 싶은 여행을 한 문장으로 말하거나, 지도에서 직접 골라 담으면 돼요.</p>${aiInputCard()}
        <button type="button" class="cx-direct" data-act="new-direct">${I.pin}<b>지도에서 직접 만들기</b><span class="cx-dim">축제와 장소를 골라 담으면 코스가 돼요</span><span class="cx-grow"></span>${I.chev('r')}</button>${startersHTML()}`;
    }
    const aiInputCard = () => `<form class="cx-ai-in" data-form="ai"><label class="cx-ai-row">${I.spark(18, 'var(--sky)')}<input name="q" autocomplete="off" placeholder="${esc(TX.aiHint)}" aria-label="가고 싶은 여행" data-autofocus></label>
      <div class="cx-ai-chips">${TX.aiConds.map((s) => `<button type="button" class="cx-chip" data-act="ai-cond" data-v="${s}">+ ${s}</button>`).join('')}<span class="cx-grow"></span><button type="submit" class="cx-btn cx-btn--ink">${I.spark(14, 'var(--on-btn)')}<span>AI로 만들기</span></button></div></form>`;
    const startersHTML = () => `<div class="cx-sec cx-sec--gap"><b>${esc(TX.startersT)}</b><span class="cx-dim">${esc(TX.startersSub)}</span></div>${D.STARTERS.map((s, i) => `
      <div class="cx-starter${S.hoverStarter === i ? ' is-hot' : ''}" data-starter="${i}"><span class="cx-starter-t"><span><b>${esc(s.name)}</b><span class="cx-badge${i === 0 ? ' is-hot' : ' is-sky'}">${esc(s.when)}</span></span><span class="cx-dim">${s.meta.map(esc).join('<i class="cx-sp"></i>')}</span></span>
      <button type="button" class="cx-btn ${S.hoverStarter === i ? 'cx-btn--ink' : 'cx-btn--soft'} cx-btn--sm" data-act="starter" data-i="${i}"><span>이 코스로 시작</span>${I.chev('r')}</button></div>`).join('')}`;
    function leftAiStart() { return `${back('내 코스')}<div class="cx-head"><span class="cx-sky">${I.spark(18)}</span><h2 class="cx-title">AI로 코스 만들기</h2></div><p class="cx-lead">어디로, 언제, 누구와, 어떤 여행인지 한 문장이면 돼요.</p>${aiInputCard()}${startersHTML()}`; }

    // ---------- 3 / 5-4 코스 편집 ----------
    function leftEdit() {
      const c = cur(); if (!c) return '';
      const A = S.alertMode && c.alert;
      let h = A ? back('내 코스') : seg('mine');
      h += `<div class="cx-head cx-head--name">${S.renaming === c.id ? `<input class="cx-rename cx-rename--big" data-id="${c.id}" value="${esc(c.name)}" aria-label="코스 이름" data-autofocus>` : `<h2 class="cx-title">${esc(c.name)}</h2><button type="button" class="cx-icon" data-act="rename" data-id="${c.id}" aria-label="코스 이름 고치기">${I.pencil}</button>`}</div>`;
      h += `<div class="cx-chips"><span class="cx-chip cx-chip--info">${I.cal}${esc(c.dates || '날짜 정하기')}</span><span class="cx-chip cx-chip--info">${esc(HOME.start)}</span>${avatars(c.people, c.id)}</div>${A ? '' : crewLine(c)}`;
      if (A) h += `<div class="cx-notice">${I.bell}<div><b>${esc(c.alert.text)}</b><p>${esc(c.alert.source)}<i class="cx-sp"></i>영향받는 곳 ${c.alert.changes.length}곳을 하늘색으로 표시했어요</p>
        <div class="cx-notice-btns">${btn('제안대로 바꾸기', 'alert-apply', 'cx-btn--ink')}${btn('그대로 두기', 'alert-keep', 'cx-btn--white')}</div></div></div>`;
      const changedDay = A ? (c.alert.day != null ? c.alert.day : c.days.findIndex((d) => d.cities.some((ct) => ct.key === c.alert.city))) : -1;
      chainCourse = c;
      h += `<div class="cx-tabs" role="tablist">${['all', ...c.days.map((_, i) => i)].map((k) => `<button type="button" role="tab" class="cx-tab${S.day === k ? ' is-on' : ''}" aria-selected="${S.day === k}" data-act="day" data-k="${k}">${k === 'all' ? '전체' : c.days[k].label}${k === changedDay ? '<i class="cx-tab-dot"></i>' : ''}</button>`).join('')}<button type="button" class="cx-tab cx-tab--add" data-act="add-day">${I.plus}날 추가</button></div>`;
      let n = 0;
      c.days.forEach((d, di) => {
        const shown = S.day === 'all' || S.day === di;
        const count = d.cities.reduce((m, ct) => m + ct.stops.length, 0);
        if (A && di !== changedDay) { h += `<button type="button" class="cx-dayfold" data-act="day" data-k="${di}"><b>${d.label}</b><span class="cx-dim">${d.cities.map((ct) => esc(cityOf(ct).name)).join(', ')}</span><span class="cx-grow"></span><span class="cx-dim">바뀐 곳 없음</span>${I.chev('r')}</button>`; n += d.cities.length; return; }
        if (!shown) { n += d.cities.length; return; }
        const fold = d.fold;
        h += `<button type="button" class="cx-dayhead" data-act="fold" data-d="${di}" aria-expanded="${!fold}"><b>${d.label}</b><span class="cx-dim">${esc(d.date)}</span><span class="cx-grow"></span>${A ? `<span class="cx-sky">바뀐 곳 ${c.alert.changes.length}곳</span>` : `<span class="cx-dim">장소 ${count}곳</span>`}${I.chev(fold ? 'r' : 'd')}</button>`;
        if (fold) { h += `<div class="cx-dayfold cx-dayfold--sum">${d.cities.map((ct) => { n++; return `<span class="cx-num" style="--c:${numColor(di)}">${n}</span><b>${esc(cityOf(ct).name)}</b><span class="cx-dim">${ct.stops.slice(0, 2).map((s) => esc(s.name)).join(', ')}</span>`; }).join('')}</div>`; return; }
        h += `<div class="cx-daylist" data-day="${di}">`;
        d.cities.forEach((ct, ci) => {
          n++;
          for (const m of [].concat(ct.move || [])) h += moveHTML(m);
          const hot = ct.key === (A ? c.alert.city : FL.key);
          h += `<div class="cx-citycard${hot ? ' is-hot' : ''}" draggable="${!A}" data-d="${di}" data-c="${ci}">
            <div class="cx-cc-head"><span class="cx-num" style="--c:${hot ? 'var(--bright)' : numColor(di)}">${n}</span><b>${esc(cityOf(ct).name)}</b><span class="cx-dim">${ct.stops.length}곳</span><span class="cx-grow"></span>
            ${A ? '' : `<button type="button" class="cx-chip cx-chip--sky" data-act="city-detail" data-d="${di}" data-c="${ci}">세부 코스${I.chev('r')}</button>`}<span class="cx-handle" aria-hidden="true">${I.handle}</span></div>
            ${ct.stops.map((s) => { const ch = A && c.alert.changes.find((x) => x.name === s.name);
              return `<div class="cx-cc-row${ch ? ' is-changed' : ''}${s.hot ? ' is-hot' : ''}${s.voted ? ' is-vote' : ''}"><span class="cx-cc-t">${ch ? `<s>${esc(ch.from)}</s>${I.chev('r', 10)}${esc(ch.to)}` : esc(s.t)}</span><b>${esc(s.name)}</b><span class="cx-dim">${esc(ch ? ch.note : s.note)}</span></div>`; }).join('')}
            ${ct.stay ? `<div class="cx-cc-stay">${I.bed}<span>${esc(ct.stay[0])}</span>${tag(ct.stay[1])}</div>` : ''}
          </div>`;
        });
        if (d.end) { const ch = A && di === changedDay && c.alert.changes.find((x) => x.end); h += moveHTML(ch ? { ...d.end, from: ch.from, text: ch.to } : d.end); }
        h += '</div>';
      });
      if (A) h += '<p class="cx-foot">바뀐 시간에 맞춰 뒤 일정만 밀었어요. 1일차와 다른 장소는 그대로예요.</p>';
      return h;
    }
    const numColor = (di) => DAYC[Math.max(0, Math.min(di, DAYC.length - 1))];
    const barEdit = () => `<span class="cx-saved">${I.check(16)}<span>${S.copied === 'bar' ? '공유 링크를 복사했어요' : '자동 저장됨'}</span></span><span class="cx-gap"></span>${btn('AI로 다듬기', 'ai-refine', 'cx-btn--soft', I.spark(16, 'var(--sky)'))}${btn('동행에게 공유', 'share-bar', 'cx-btn--soft', I.share)}${btn('편집 마치기', 'edit-done', 'cx-btn--ink')}`;

    // ---------- 4-0 / 4 / 4-2 AI ----------
    const reqBox = () => `<div class="cx-req"><p>${esc(S.ai.request)}</p><div class="cx-chips">${S.ai.chips.map((s) => `<span class="cx-chip cx-chip--sky">${esc(s)}</span>`).join('')}</div></div>`;
    function leftAiGen() {
      const st = S.ai.step, P = D.AI.proposals[0];
      const steps = D.AI.steps.map(([t, sub], i) => { const k = i < st ? 'done' : i === st ? 'now' : 'wait';
        return `<li class="cx-step is-${k}"><span class="cx-step-ic">${k === 'done' ? I.check(18) : '<i></i>'}</span><span><b>${t}</b>${sub && k !== 'wait' ? `<i>${esc(sub)}</i>` : ''}</span></li>`; }).join('');
      const lines = D.AI.genLines || [['gyeongju', '10:20 불국사, 석굴암까지 버스로', 3], ['busan', '14:20 부산역, 감천문화마을', 4], ['jinju', '', 5]];
      return `${back('내 코스')}<div class="cx-head"><span class="cx-sky">${I.spark(18)}</span><h2 class="cx-title">AI로 코스 만들기</h2></div>${reqBox()}
        <div class="cx-sec cx-sec--gap"><span class="cx-sky cx-spin">${I.spark(16)}</span><b>코스를 짜는 중</b><span class="cx-dim">${esc(TX.genTime || '보통 5초쯤 걸려요')}</span></div><ol class="cx-steps">${steps}</ol>
        <div class="cx-prop is-hot is-filling"><b class="cx-prop-t">${st >= 2 ? esc(P.name) : '<i class="cx-bone" style="width:180px"></i>'}</b>${st >= 2 ? chain(P.route, true) : '<i class="cx-bone" style="width:240px"></i>'}
          <div class="cx-detail">${lines.map(([k, t, need, col, lab]) => `<div class="cx-det-row${st + 1 < need ? ' is-wait' : ''}"><span class="cx-det-c"><i style="background:${col || (k === 'busan' ? 'var(--bright)' : k === 'jinju' ? 'var(--sky2)' : 'var(--sky)')}"></i>${esc(lab || CITY[k].name)}</span><span>${st + 1 >= need && t ? esc(t) : ''}${st + 1 === need ? '<i class="cx-caret"></i><i class="cx-bone" style="width:70px"></i>' : st + 1 < need ? '<i class="cx-bone" style="width:200px"></i>' : ''}</span></div>`).join('')}</div></div>
        <div class="cx-prop cx-prop--bone"><i class="cx-bone" style="width:170px;height:14px"></i><i class="cx-bone" style="width:210px"></i><i class="cx-bone" style="width:120px"></i></div>
        <div class="cx-prop cx-prop--bone"><i class="cx-bone" style="width:200px;height:14px"></i><i class="cx-bone" style="width:180px"></i><i class="cx-bone" style="width:90px"></i></div>`;
    }
    const barAiGen = () => `<label class="cx-say">${I.spark(14, 'var(--sky)')}<input placeholder="만드는 동안에도 조건을 더할 수 있어요" aria-label="조건 더하기"></label>${btn('멈추기', 'ai-stop', 'cx-btn--soft', I.stop)}`;
    function leftAi() {
      const props = D.AI.proposals.map((P, i) => { const on = i === S.ai.sel;
        if (on) chainCourse = P.as || null;
      return `<div class="cx-prop${on ? ' is-hot' : ''}${S.ai.regen && on ? ' is-regen' : ''}" data-prop="${i}"><div class="cx-prop-h"><b class="cx-prop-t">${esc(P.name)}</b><span class="cx-grow"></span>${on ? `<span class="cx-bright">${I.checkOn(20)}</span>` : ''}</div>${chain(P.route, on)}<div class="cx-cmeta">${P.meta.map((m) => `<span class="${m[0] === '!' ? 'cx-sky' : 'cx-dim'}">${esc(m.replace(/^!/, ''))}</span>`).join('')}</div>
          ${on ? `<p class="cx-sky cx-why">${esc(P.why)}</p><div class="cx-detail">${P.detail.map(([k, ls, lab, dl]) => `<button type="button" class="cx-det-row" data-act="ai-city" data-k="${k}"><span class="cx-det-c">${dl ? `<span class="cx-dim cx-det-d">${esc(dl)}</span>` : ''}<i style="background:${detColor(P, k)}"></i>${esc(lab || CITY[k].name)}</span><span class="cx-det-l">${ls.map((l) => `<span class="${l[0] === '!' ? 'cx-sky' : ''}">${esc(l.replace(/^!/, ''))}</span>`).join('')}</span></button>`).join('')}
            <p class="cx-det-hint cx-sky">도시를 눌러 세부 코스 지도에서 보기${I.chev('r')}</p></div>` : ''}
          <button type="button" class="cx-cover" data-act="prop" data-i="${i}" aria-label="${esc(P.name)} 고르기" aria-pressed="${on}"></button></div>`; }).join('');
      return `${back('내 코스')}<div class="cx-head"><span class="cx-sky">${I.spark(18)}</span><h2 class="cx-title">AI로 코스 만들기</h2></div>${reqBox()}
        <div class="cx-sec cx-sec--gap"><b>제안 3개</b><span class="cx-dim">${esc(TX.propsSub)}</span></div>${props}
        <p class="cx-dim cx-sm cx-sec--gap">이렇게 바꿔 볼까요</p><div class="cx-chips">${D.AI.refine.map((r) => `<button type="button" class="cx-chip cx-chip--soft" data-act="ai-refine-chip" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>`;
    }
    const detColor = (P, k) => (D.DAY_COLORS ? DAYC[Math.max(0, Math.min((P.days[P.route.indexOf(k) - 1] || 1) - 1, DAYC.length - 1))] : k === 'busan' ? 'var(--bright)' : k === 'jinju' || k === 'suncheon' ? 'var(--sky2)' : 'var(--sky)');
    const barAi = () => `<form class="cx-say" data-form="say">${I.spark(14, 'var(--sky)')}<input name="q" placeholder="바꾸고 싶은 점을 말해 주세요" aria-label="바꾸고 싶은 점"></form>${btn('다시 만들기', 'ai-again', 'cx-btn--soft', I.redo)}${btn('이 코스로 시작', 'ai-start-course', 'cx-btn--ink')}`;

    // ---------- 2-2 / 2-3 / 4-2 도시 세부 ----------
    const cityStops = () => { const c = cur(); if (S.view === 'ai-city') return S.ai.stops; if (!c) return []; c.flat = c.flat || clone(FL.stops); return c.flat; };
    function syncCity() { // 세부 일정을 코스 편집의 도시 카드와 맞춤
      const c = cur(); if (!c || !c.flat) return;
      const ct = c.days.flatMap((d) => d.cities).find((x) => x.key === FL.key && !x.solo); if (ct) ct.stops = c.flat.map((s) => ({ t: s.t, name: s.name, note: s.hot ? FL.event : (s.card || ''), hot: s.hot, voted: s.voted }));
    }
    function leftCity() {
      const c = cur(), ct = CITY[S.cityKey];
      if (!hasFlat()) return leftCityPlain();
      const st = cityStops(), selP = S.sel && placeById(S.sel);
      const ins = selP && !st.some((s) => s.name === selP.name) ? insertAt(selP) : -1;
      let rows = '';
      st.forEach((s, i) => {
        if (S.slotPick && selP) rows += `<button type="button" class="cx-slot" data-act="slot" data-i="${i}">${I.plus}<span>${i + 1}번 앞에 넣기</span></button>`;
        rows += `<div class="cx-stop${s.hot ? ' is-hot' : ''}" draggable="true" data-i="${i}"><span class="cx-stop-t">${esc(s.t)}</span><span class="cx-num" style="--c:${s.hot ? 'var(--bright)' : 'var(--pin)'}">${i + 1}</span><span class="cx-stop-b"><b>${esc(s.name)}</b><span class="${s.hot ? 'cx-sky' : 'cx-dim'}">${esc(s.note)}</span></span><span class="cx-handle" aria-hidden="true">${I.handle}</span></div>`;
        if (!S.slotPick && ins === i + 1) rows += `<div class="cx-stop is-new"><span class="cx-stop-t cx-sky">${esc(slotTime(i))}</span><span class="cx-num cx-num--plus">${I.plus}</span><span class="cx-stop-b"><b class="cx-sky">${esc(selP.name)}</b><span class="cx-sky">넣을 자리, 40분 머묾</span></span></div>`;
        if (s.move && i < st.length - 1) rows += `<div class="cx-move cx-move--in"><i class="cx-move-ln"></i><button type="button" class="cx-chip cx-chip--move" data-act="move-pick">${esc(s.move)}${I.chev('d', 10)}</button></div>`;
      });
      return `${back('전체 코스')}<p class="cx-sm"><b>${esc(ct.name)} 세부 코스</b></p><div class="cx-chips"><span class="cx-chip cx-chip--sky">1일차</span><span class="cx-dim">오후 ${esc(st[0] ? st[0].t : '')}부터 ${esc(st[st.length - 1] ? st[st.length - 1].t : '')}까지</span></div>
        <div class="cx-stops">${rows}</div><button type="button" class="cx-btn cx-btn--soft cx-btn--add" data-act="go-add">${I.plus}<span>지도에서 장소 추가</span></button>
        <div class="cx-sec cx-sec--gap"><span class="cx-dim">근처에서 더 담기</span></div><div class="cx-near">${(FL.nearby || []).map((p) => { const inC = st.some((s) => s.name === p.name); return `<button type="button" class="cx-near-row${inC ? ' is-in' : ''}" data-act="pick-place" data-id="${p.id}"><span class="cx-rdot">${inC ? I.checkOn(16) : '<i></i>'}</span><span><b>${esc(p.name)}</b><i>${esc(p.sub)}</i></span></button>`; }).join('')}</div>`;
    }
    function leftCityPlain() { // 평면 지도가 없는 도시: 3D로 다가간 채 목록만
      const c = cur(); let stops = [];
      if (S.view === 'ai-city') { const P = D.AI.proposals[S.ai.sel]; const d = P.detail.find(([k]) => k === S.cityKey); stops = d ? d[1].map((l) => { const m = /^!?(\d+:\d+)\s(.*)$/.exec(l); return { t: m ? m[1] : '', name: m ? m[2] : l }; }) : []; }
      else if (c) for (const d of c.days) for (const ct of d.cities) if (ct.key === S.cityKey) stops = stops.concat(ct.stops);
      return `${back(S.view === 'ai-city' ? 'AI 제안으로' : '전체 코스')}${S.view === 'ai-city' ? aiStepper() : ''}<p class="cx-sm"><b>${esc(CITY[S.cityKey].name)} 세부 코스</b></p>
        <div class="cx-stops">${stops.map((s, i) => `<div class="cx-stop"><span class="cx-stop-t">${esc(s.t)}</span><span class="cx-num" style="--c:#0E2F47">${i + 1}</span><span class="cx-stop-b"><b>${esc(s.name)}</b><span class="cx-dim">${esc(s.note || '')}</span></span></div>`).join('')}</div>
        <p class="cx-foot">${esc(CITY[S.cityKey].name)}은 아직 평면 지도를 준비 중이라 입체 지도로 보여 드려요.</p>`;
    }
    const slotTime = (i) => { const st = cityStops(); const m = tm(st[i].t); return m == null ? '' : fmt(m + (st[i].hot ? 130 : 60)); };
    const barCity = () => { const st = cityStops(); const last = st.find((s) => s.hot);
      return `${btn('전체 코스', 'back', 'cx-btn--soft', I.chev('l', 14))}<span class="cx-sum"><b>${esc(CITY[S.cityKey].name)} 세부</b><span><span class="cx-dim">장소 ${st.length}곳</span><span class="cx-dim">${esc(FL.moveSum)}</span>${last ? `<span class="cx-sky">${esc(last.t)} ${esc(FL.event)}에 맞춰 도착</span>` : ''}</span></span><span class="cx-gap"></span>${btn('AI로 다듬기', 'ai-refine', 'cx-btn--soft', I.spark(16, 'var(--sky)'))}${btn('세부 완료', 'back', 'cx-btn--ink')}`; };
    function leftAdd() {
      const res = searchResults();
      const st = cityStops();
      const cats = ['전체', '먹거리', '카페', '볼거리', '자연'];
      return `${back(`${CITY[FL.key].name} 세부 코스`)}<p class="cx-sm"><b>장소 추가</b></p>
        <form class="cx-search" data-form="search"><span class="cx-dim">${I.search}</span><input name="q" value="${esc(S.query)}" placeholder="장소나 음식 이름" aria-label="장소 검색" autocomplete="off" data-autofocus>${S.query ? `<button type="button" class="cx-icon" data-act="q-clear" aria-label="검색어 지우기">${I.x}</button>` : ''}</form>
        <div class="cx-cats" role="tablist">${cats.map((k) => `<button type="button" role="tab" class="cx-cat${S.cat === k ? ' is-on' : ''}" aria-selected="${S.cat === k}" data-act="cat" data-v="${k}">${k}</button>`).join('')}</div>
        ${S.query || S.cat !== '전체' ? `<div class="cx-sec"><b>검색 결과 ${res.length}곳</b><span class="cx-dim">경로에서 가까운 순</span></div>
          <div class="cx-results">${res.length ? res.map((r) => { const inC = st.some((s) => s.name === r.name); return `<button type="button" class="cx-res${inC ? ' is-in' : ''}" data-act="pick-place" data-id="${r.pid || 'poi:' + r.i}"><span class="cx-rdot">${inC ? I.checkOn(18) : '<i></i>'}</span><span><b>${esc(r.name)}</b><i>${esc(r.kind)}<i class="cx-sp"></i>${inC ? `<span class="cx-sky">${esc(r.inNote)}</span>` : esc(r.near)}</i></span></button>`; }).join('') : '<p class="cx-dim cx-sm">찾는 곳이 없어요. 다른 이름이나 음식으로 찾아 보세요.</p>'}</div>`
          : '<p class="cx-dim cx-sm">지도에서 점을 눌러 담거나, 위에서 이름으로 찾아 보세요.</p>'}
        <p class="cx-dim cx-sm cx-sec--gap">비슷한 검색</p><div class="cx-chips">${(FL.similar || []).filter((x) => x !== S.query).map((x) => `<button type="button" class="cx-chip cx-chip--soft" data-act="q-set" data-v="${x}">${x}</button>`).join('')}</div>`;
    }
    const CAT = FL.cats || { 먹거리: ['음식점', '술집'], 카페: ['카페'], 볼거리: ['전망대', '볼거리', '박물관', '전시'], 자연: ['전망대'] };
    const nearestStop = (x, y) => { const st = cityStops(); let best = 0, bd = 1e9; st.forEach((s, i) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = i; } }); return { i: best, d: bd }; };
    const tripTxt = (dpx) => { const m = dpx * (FL.mpp || 16.4); /* 지도 1px의 실제 거리(m) */ return m < 1200 ? `도보 ${Math.max(2, Math.round(m / 75))}분` : m < 6000 ? `버스 ${Math.round(m / 280 + 5)}분` : `지하철 ${Math.round(m / 450 + 8)}분`; };
    function searchResults() {
      const q = S.query.trim(), kinds = CAT[S.cat];
      if (!q && S.cat === '전체') return [];
      if (!POI.all.length) { // OSM 점 자료가 없는 도시(삿포로): 이름 있는 장소에서 찾음
        return allPlaces().filter((p) => (!q || p.name.includes(q) || (p.kind || '').includes(q) || (p.line || '').includes(q)) && (!kinds || kinds.includes(p.kind))).map((p) => {
          const n = nearestStop(p.x, p.y), st = cityStops()[n.i];
          return { pid: p.id, x: p.x, y: p.y, name: p.name, kind: p.kind, d: n.d, near: `${n.i + 1}번 ${st.name}에서 ${tripTxt(n.d)}`, inNote: `${n.i + 1}번 다음에 들어감` };
        }).sort((a, b) => a.d - b.d).slice(0, 6);
      }
      const out = [];
      POI.all.forEach(([x, y, name, kind], i) => {
        if (q && !name.includes(q)) return;
        if (kinds && !kinds.includes(kind)) return;
        const n = nearestStop(x, y), st = cityStops()[n.i];
        out.push({ i, x, y, name, kind, d: n.d, near: `${n.i + 1}번 ${st.name}에서 ${tripTxt(n.d)}`, inNote: `${n.i + 1}번 다음에 들어감` });
      });
      out.sort((a, b) => a.d - b.d);
      const seen = new Set(); return out.filter((r) => (seen.has(r.name) ? false : seen.add(r.name))).slice(0, 6);
    }
    // 4-2 AI가 짠 세부 코스
    const aiStepper = () => { const steps = aiSteps(), cities = steps.map(([k]) => k);
      return `<div class="cx-stepper">${steps.map(([k, name], i) => { const stt = k === S.cityKey ? 'now' : i < cities.indexOf(S.cityKey) ? 'done' : 'next';
        return `${i ? '<i class="cx-stepper-ln"></i>' : ''}<button type="button" class="cx-stepper-c is-${stt}" data-act="ai-city" data-k="${k}">${stt === 'done' ? I.check(14) : '<i></i>'}${esc(name)}</button>`; }).join('')}</div>`; };
    const aiSteps = () => { const P = D.AI.proposals[S.ai.sel]; return P.stepper || P.route.slice(1).map((k) => [k, CITY[k].name]); };
    function leftAiCity() {
      if (!hasFlat()) return leftCityPlain();
      const P = D.AI.proposals[S.ai.sel];
      const st = S.ai.stops;
      return `${back('AI 제안 3개로')}<div class="cx-head"><span class="cx-sky">${I.spark(18)}</span><h2 class="cx-title">AI가 짠 ${CITY[S.cityKey].name} 세부 코스</h2></div><p class="cx-dim cx-sm">${esc(P.name)}, 1일차 ${esc(st[0].t)}부터 ${esc(st[st.length - 1].t)}까지</p>${aiStepper()}
        <div class="cx-stops cx-stops--ai${S.ai.regen ? ' is-regen' : ''}">${st.map((s, i) => `${i ? `<div class="cx-move cx-move--ai"><i class="cx-move-ln"></i><span class="cx-chip">${esc(st[i - 1].move || '')}</span></div>` : ''}
          <div class="cx-aistop${s.hot ? ' is-hot' : ''}"><span class="cx-stop-t">${esc(s.t)}</span><span class="cx-num" style="--c:${s.hot ? 'var(--bright)' : 'var(--pin)'}">${i + 1}</span>
          <span class="cx-stop-b"><span><b class="${s.hot ? 'cx-sky' : ''}">${esc(s.name)}</b><span class="${s.hot ? 'cx-sky' : 'cx-dim'}">${esc(s.note)}</span></span>${s.why ? `<span class="cx-why cx-sky">${I.spark(12)}${esc(s.why)}</span>` : '<span class="cx-dim cx-sm">직접 고친 곳</span>'}
          ${S.ai.swap === i && s.alts ? `<span class="cx-alts"><span class="cx-dim">다른 자리도 있어요</span><span class="cx-chips">${s.alts.map((a, k) => `<button type="button" class="cx-chip cx-chip--soft" data-act="alt" data-i="${i}" data-k="${k}"><b>${esc(a.name)}</b><span class="cx-dim">${esc(a.sub)}</span></button>`).join('')}</span></span>` : ''}</span>
          <button type="button" class="cx-chip cx-chip--soft cx-swap" data-act="swap" data-i="${i}" aria-expanded="${S.ai.swap === i}">${I.swap}바꾸기</button></div>`).join('')}</div>
        <p class="cx-foot">${I.spark(12)}${esc(TX.aiFoot)}</p>`;
    }
    const barAiCity = () => { const steps = aiSteps(), i = steps.findIndex(([k]) => k === S.cityKey), nx = steps[i + 1], hot = (S.ai.stops || []).find((x) => x.hot);
      return `<span class="cx-sum"><b>${esc(CITY[S.cityKey].name)} 세부 코스</b><span><span class="cx-dim">장소 ${S.ai.stops.length}곳</span><span class="cx-dim">${esc(FL.aiMoveSum || FL.moveSum)}</span>${hot ? `<span class="cx-sky">${esc(hot.t)} ${esc(FL.event)}에 맞춰 도착</span>` : ''}</span></span><span class="cx-gap"></span>
        ${btn(`${CITY[S.cityKey].name}만 다시 짜기`, 'ai-city-regen', 'cx-btn--soft', I.redo)}${nx ? `<button type="button" class="cx-btn cx-btn--soft" data-act="ai-city" data-k="${nx[0]}"><span>${esc(nx[1])} 세부 코스</span>${I.chev('r')}</button>` : ''}${btn('이 코스로 시작', 'ai-start-course', 'cx-btn--ink')}`; };

    // ---------- 1 탐색 화면 코스 바 ----------
    // 장소를 담을 때마다: 번호가 하나씩 튀어나오고, '장소 N곳' 숫자가 굴러 올라가고, 바는 가운데를 지킨 채 양옆으로 늘어남
    let ebT = 0, ebW = 0;
    function roll(el, n) {
      const cur = +el.dataset.n; if (cur === n) return; el.dataset.n = n;
      if (reduce) { el.textContent = n; return; }
      el.innerHTML = `<span class="cx-roll-o">${cur}</span><span class="cx-roll-n">${n}</span>`;
      el.classList.remove('is-up', 'is-down'); void el.offsetWidth; el.classList.add(n > cur ? 'is-up' : 'is-down');
      clearTimeout(el._t); el._t = setTimeout(() => { el.textContent = n; el.classList.remove('is-up', 'is-down'); }, 650);
    }
    function updateExploreBar() {
      const picks = S.on ? AT().course() : [], on = S.view === 'explore' && picks.length > 0;
      if (!on) {
        if (exploreBar.classList.contains('is-on') && !exploreBar.classList.contains('is-out')) {
          exploreBar.classList.add('is-out'); clearTimeout(ebT);
          ebT = setTimeout(() => { exploreBar.classList.remove('is-on', 'is-out'); exploreBar.innerHTML = ''; exploreBar.style.width = ''; }, reduce ? 0 : 320);
        }
        return;
      }
      clearTimeout(ebT); exploreBar.classList.remove('is-out');
      const first = !exploreBar.firstChild, w0 = first ? 0 : exploreBar.getBoundingClientRect().width;
      if (first) {
        exploreBar.innerHTML = `<span class="cx-chain cx-chain--bar"><i class="cx-chain-dot is-start"></i></span>
          <span class="cx-sum"><b>새 코스</b><span><span class="cx-dim">장소 <span class="cx-roll" data-n="0">0</span>곳</span><span class="cx-dim cx-eb-days"></span><span class="cx-dim cx-eb-names"></span></span></span><span class="cx-gap"></span>
          ${btn('AI로 다듬기', 'ai-from-picks', 'cx-btn--soft', I.spark(16, 'var(--sky)'))}${btn('코스 편집', 'edit-picks', 'cx-btn--ink')}`;
        exploreBar.classList.add('is-on');
      }
      const chainEl = exploreBar.querySelector('.cx-chain--bar'), items = [...chainEl.querySelectorAll('.cx-eb-item')];
      for (let i = items.length; i < picks.length; i++) { const it = document.createElement('span'); it.className = 'cx-eb-item' + (first ? '' : ' is-new'); it.innerHTML = `<i class="cx-chain-ln"></i><span class="cx-num">${i + 1}</span>`; chainEl.appendChild(it); }
      for (let i = items.length - 1; i >= picks.length; i--) items[i].remove();
      chainEl.querySelectorAll('.cx-eb-item .cx-num').forEach((n, i) => n.style.setProperty('--c', i < 2 ? 'var(--sky)' : 'var(--sky2)'));
      roll(exploreBar.querySelector('.cx-roll'), picks.length);
      exploreBar.querySelector('.cx-eb-days').textContent = picks.length > 2 ? '1박 2일' : '당일';
      exploreBar.querySelector('.cx-eb-names').textContent = picks.map((p) => p.name).join(', ');
      if (first || reduce) return;
      exploreBar.style.width = ''; const w1 = exploreBar.getBoundingClientRect().width;
      if (Math.abs(w1 - w0) < 1) return;
      exploreBar.style.width = w0 + 'px'; void exploreBar.offsetWidth; exploreBar.style.width = w1 + 'px';
      clearTimeout(ebW); ebW = setTimeout(() => { exploreBar.style.width = ''; }, 900);
    }

    // ---------- 전국 지도 위 경로와 핀 ----------
    let natSpec = null, natSig = '';
    const dcls = (di) => (D.DAY_COLORS ? 'd' + Math.min(di + 1, DAYC.length) : di === 0 ? 'd1' : 'd2');
    // 해외: 집(인천)에서 공항까지 비행 점선 + 비행시간 칩, 공항은 작은 점
    function flyIn(spec, air, note, faint) {
      spec.segs.push({ a: HOME.key, b: air, cls: 'fly' + (faint ? ' faint' : '') });
      if (!faint) { spec.pins.push({ key: air, label: CITY[air].name, cls: 'is-air' }); if (note) spec.bubbles.push({ key: `mid:${HOME.key}:${air}`, text: note, side: 'mid', icon: 'plane' }); }
    }
    function specCourse(c, o = {}) {
      const segs = [], pins = [{ key: HOME.key, label: HOME.label, sub: HOME.sub, cls: 'is-start' }], bubbles = [];
      let prev = HOME.key, n = 0;
      if (c.air) { flyIn({ segs, pins, bubbles }, c.air, c.flyNote, o.faint); prev = c.air; }
      c.days.forEach((d, di) => d.cities.forEach((ct) => {
        const k = ct.key || ct.name; if (!CITY[k] && ct.lat) CITY[k] = { name: ct.name, lat: ct.lat, lon: ct.lon };
        n++; const dim = o.day != null && o.day !== 'all' && o.day !== di;
        if (k !== prev) segs.push({ a: prev, b: k, cls: dcls(di) + (dim ? ' is-dim' : '') + (o.faint ? ' faint' : '') });
        const hot = o.hot === k;
        if (!pins.some((p) => p.key === k)) pins.push({ key: k, label: CITY[k].name, sub: o.sub ? o.sub(ct) : `${ct.stops.length}곳`, num: n, left: (c.left || []).includes(k), cls: (hot ? 'is-hot' : dcls(di)) + (dim ? ' is-dim' : '') });
        prev = k;
      }));
      const end = c.air || HOME.key;
      if (prev !== end) segs.push({ a: prev, b: end, cls: 'back' + (o.faint ? ' faint' : '') });
      return { segs, pins, bubbles };
    }
    function buildNat() {
      const v = S.view; let spec = { segs: [], pins: [], bubbles: [], glow: [] };
      if (v === 'mine') {
        if (!S.courses.length) spec = starterSpec();
        else {
          const hotId = S.hoverCourse || S.courses[0].id;
          for (const c of S.courses) {
            if (c.id === hotId) continue;
            const sp = specCourse(c, { faint: true }); spec.segs.push(...sp.segs.filter((s) => !s.cls.startsWith('fly')).map((s) => ({ ...s, cls: 'faint' })));
            spec.pins.push(...sp.pins.filter((p) => p.key !== HOME.key && p.cls !== 'is-air').map((p) => ({ key: p.key, label: p.label, cls: 'is-faint' })));
          }
          const hc = S.courses.find((c) => c.id === hotId); if (hc) { const sp = specCourse(hc, { hot: hc.alert && hc.alert.city ? null : FL.key }); spec.segs.push(...sp.segs); spec.pins.push(...sp.pins); spec.bubbles.push(...sp.bubbles); if (hc.days.some((d) => d.cities.some((ct) => ct.key === FL.key)) && D.DAY_COLORS) spec.glow.push(FL.key); }
        }
      } else if (v === 'ai-start') spec = starterSpec();
      else if (v === 'edit') {
        const c = cur(); if (c) { const A = S.alertMode && c.alert; const sp = specCourse(c, { day: A ? (c.alert.day != null ? c.alert.day : c.days.findIndex((d) => d.cities.some((ct) => ct.key === c.alert.city))) : S.day, hot: A ? c.alert.city : FL.key, sub: (ct) => (ct.key === FL.key ? `세부 ${ct.stops.length}곳` : `${ct.stops.length}곳`) }); spec.segs = sp.segs; spec.pins = sp.pins; spec.bubbles = sp.bubbles; if (A) { spec.bubbles.push({ key: c.alert.city, text: c.alert.map, side: c.alert.side || 'b', icon: 'bell' }); spec.glow.push(c.alert.city); } else if (c.days.some((d) => d.cities.some((ct) => ct.key === FL.key))) spec.glow.push(FL.key); }
      } else if (v === 'ai-gen' && D.AI.genSpec) { spec = Object.assign(spec, D.AI.genSpec(S.ai.step));
      } else if (v === 'ai-gen') {
        const st = S.ai.step, R = ['seoul', 'gyeongju', 'busan', 'jinju'];
        spec.pins.push({ key: 'seoul', label: '서울역', sub: '출발·도착', cls: 'is-start' });
        if (st >= 2) { spec.segs.push({ a: 'seoul', b: 'gyeongju', cls: 'd1' }); spec.pins.push({ key: 'gyeongju', label: '경주', sub: '1곳', num: 1, cls: 'd1' }); }
        if (st >= 2) { spec.segs.push({ a: 'gyeongju', b: 'busan', cls: 'draw' }); spec.pins.push({ key: 'busan', label: '부산', sub: st >= 3 ? '세부 코스 짜는 중' : '', num: 2, cls: 'is-hot is-subsky' }); spec.glow.push('busan'); }
        if (st >= 2) spec.pins.push({ key: 'jinju', label: '진주', sub: '1곳', num: 3, cls: 'd2 is-dim' });
        if (st < 3) for (const k of ['jeonju', 'suncheon', 'gangneung']) spec.pins.push({ key: k, label: CITY[k].name, cls: 'is-cand' });
        void R;
      } else if (v === 'ai') {
        D.AI.proposals.forEach((P, i) => {
          if (i === S.ai.sel) return;
          for (let k = 1; k < P.route.length; k++) if (!(k === 1 && P.air)) spec.segs.push({ a: P.route[k - 1], b: P.route[k], cls: 'faint' });
        });
        const P = D.AI.proposals[S.ai.sel];
        spec.pins.push({ key: HOME.key, label: HOME.label, sub: HOME.sub, cls: 'is-start' });
        if (P.air) flyIn(spec, P.air, P.flyNote);
        P.route.slice(1).forEach((k, i) => { const di = P.days[i] - 1; spec.segs.push({ a: i === 0 && P.air ? P.air : P.route[i], b: k, cls: dcls(di) }); spec.pins.push({ key: k, label: CITY[k].name, sub: (P.subs && P.subs[k]) || (k === FL.key ? '세부 5곳' : '1곳'), num: i + 1, left: (P.left || []).includes(k), cls: k === FL.key ? 'is-hot' : dcls(di) }); });
        spec.segs.push({ a: P.route[P.route.length - 1], b: P.air || HOME.key, cls: 'back' });
        if (P.route.includes(FL.key)) spec.glow.push(FL.key);
        for (const k of P.alt || []) spec.pins.push({ key: k, label: CITY[k].name, cls: 'is-faint' });
        spec.bubbles.push(...P.reasons.map(([k, t, side]) => ({ key: k, text: t, side })));
      }
      if (HOME.pin === false) spec.pins = spec.pins.filter((p) => p.key !== HOME.key); // 해외: 인천은 왼쪽 칸 뒤라 핀 없이 점선만
      natSpec = spec;
      const sig = JSON.stringify(spec);
      if (sig === natSig) return; natSig = sig;
      natLines.innerHTML = spec.segs.map((s, i) => `<path class="cx-seg-p ${s.cls}" data-i="${i}"/>`).join('');
      natGlow.innerHTML = spec.segs.map((s, i) => (/(^| )d1( |$)/.test(s.cls) && !/dim|faint/.test(s.cls) ? `<path class="cx-seg-g" data-i="${i}"/>` : '')).join('');
      natPins.innerHTML = spec.glow.map((k) => `<span class="cx-npglow" data-k="${k}"></span>`).join('') + spec.pins.map((p, i) => `<div style="--i:${i}" class="cx-np ${p.cls || ''}${p.left ? ' is-left' : ''}" data-k="${p.key}"><span class="cx-np-dot">${p.num != null ? p.num : '<i></i>'}</span>${p.label ? `<span class="cx-np-tag"><b>${esc(p.label)}</b>${p.sub ? `<span>${esc(p.sub)}</span>` : ''}</span>` : ''}</div>`).join('')
        + spec.bubbles.map((b) => `<div class="cx-nb is-${b.side}" data-k="${b.key}">${b.icon === 'bell' ? `<span class="cx-sky">${I.bell}</span>` : b.icon === 'plane' ? `<span class="cx-sky">${I.plane}</span>` : I.spark(12, 'var(--sky)')}<span>${esc(b.text)}</span></div>`).join('');
      natPos();
    }
    function starterSpec() {
      const s = D.STARTERS[S.hoverStarter] || D.STARTERS[0];
      const spec = { segs: [{ a: HOME.key, b: s.spot, cls: 'draw' }], pins: [{ key: HOME.key, label: HOME.label, sub: '여기서 출발', cls: 'is-start' }], bubbles: [], glow: [s.spot] };
      for (const t of D.STARTERS) spec.pins.push({ key: t.spot, label: t.spotLabel, sub: t.when, left: t.spot === 'jinju', cls: 'is-spot' + (t === s ? ' is-hot' : '') });
      return spec;
    }
    const bow = (a, b, k = 0.16) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${(mx - dy * k).toFixed(1)} ${(my + dx * k).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`; };
    function natPos() {
      if (!natSpec || !S.on || CITY_VIEWS.includes(S.view) || S.view === 'explore') return;
      const P = {};
      const at = (k) => { if (!P[k]) {
        if (k.startsWith('mid:')) { // 비행 호 위, 공항 쪽으로 70% 지점 (출발지는 왼쪽 칸 뒤라서)
          const [, a, b] = k.split(':'), A0 = at(a), B0 = at(b), dx = B0[0] - A0[0], dy = B0[1] - A0[1], t = 0.7, cx = (A0[0] + B0[0]) / 2 - dy * 0.16, cy = (A0[1] + B0[1]) / 2 + dx * 0.16;
          const q = (u, v, w) => (1 - t) * (1 - t) * u + 2 * t * (1 - t) * v + t * t * w;
          P[k] = [q(A0[0], cx, B0[0]), q(A0[1], cy, B0[1]), true]; }
        else { const c = CITY[k]; P[k] = c ? AT().projectLL(c.lat, c.lon, 0.05) : [0, 0, false]; } } return P[k]; };
      natSpec.segs.forEach((s, i) => { const a = at(s.a), b = at(s.b), d = bow(a, b, s.cls.includes('back') ? -0.12 : 0.16);
        const p = natLines.children[i]; if (p) p.setAttribute('d', d);
        const g = natGlow.querySelector(`[data-i="${i}"]`); if (g) g.setAttribute('d', d); });
      const lx = left.classList.contains('is-on') ? left.getBoundingClientRect().right + 24 : 0; // 왼쪽 칸에 덮이는 비행 칩은 숨김
      for (const el of natPins.children) { const p = at(el.dataset.k); el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`; el.style.visibility = p[2] && !(el.dataset.k.startsWith('mid:') && p[0] < lx + 90) ? '' : 'hidden'; }
    }

    // ---------- 평면 지도 (부산) ----------
    const W = { s: 1, tx: 0, ty: 0, s0: 1 };
    const vw = () => window.innerWidth, vh = () => window.innerHeight;
    function clampW() { W.s = Math.max(W.s0, Math.min(W.s0 * 3.2, W.s)); W.tx = Math.min(0, Math.max(vw() - 1920 * W.s, W.tx)); W.ty = Math.min(0, Math.max(vh() - 1080 * W.s, W.ty)); }
    function applyW(anim) {
      clampW();
      world.classList.toggle('is-anim', !!anim && !reduce);
      world.style.transform = `translate(${W.tx.toFixed(1)}px, ${W.ty.toFixed(1)}px) scale(${W.s.toFixed(4)})`;
      world.style.setProperty('--inv', (1 / W.s).toFixed(4));
      placeFloat();
    }
    function fitWorld(reset) {
      W.s0 = Math.max(vw() / 1920, vh() / 1080);
      if (reset) { W.s = W.s0 * 1.08; W.tx = (vw() - 1920 * W.s) / 2 + 90; W.ty = (vh() - 1080 * W.s) / 2; }
      applyW(false);
    }
    const toScreen = (x, y) => [W.tx + x * W.s, W.ty + y * W.s];
    function zoomAt(f, sx, sy, anim) { const ns = Math.max(W.s0, Math.min(W.s0 * 3.2, W.s * f)); const k = ns / W.s; W.tx = sx - (sx - W.tx) * k; W.ty = sy - (sy - W.ty) * k; W.s = ns; applyW(anim); }
    function panTo(x, y, tx, ty) { const [sx, sy] = toScreen(x, y); W.tx += tx - sx; W.ty += ty - sy; applyW(true); }
    const allPlaces = () => (FL.places || []).concat(FL.special && !(FL.places || []).some((p) => p.id === FL.special.id) ? [FL.special] : []);
    const placeById = (id) => (FL.special && id === FL.special.id ? FL.special : (FL.places || []).find((p) => p.id === id) || (id && id.startsWith('poi:') ? poiPlace(+id.slice(4)) : null));
    const poiPlace = (i) => { const p = POI.all[i]; if (!p) return null; const n = nearestStop(p[0], p[1]); return { id: 'poi:' + i, name: p[2], kind: p[3], x: p[0], y: p[1], line: '', near: `${n.i + 1}번에서 ${tripTxt(n.d)}` }; };
    const insertAt = (p) => { if (FL.special && p.id === FL.special.id && FL.specialAt) return FL.specialAt; return nearestStop(p.x, p.y).i + 1; };
    function buildWorld() {
      const v = S.view, st = cityStops();
      // 경로
      let paths = '';
      for (let i = 1; i < st.length; i++) { const a = [st[i - 1].x, st[i - 1].y], b = [st[i].x, st[i].y]; paths += `<path class="cx-wroute${st[i].hot || st[i - 1].hot ? ' is-hot' : ''}" d="${bow(a, b, 0.14)}"/>`; }
      wsvg.innerHTML = `<g class="cx-wroute-glow">${paths}</g><g>${paths}</g>`;
      // 점: 이름 있는 장소, 구 이름, (장소 추가) OSM 점과 묶음
      const searching = v === 'add' && (S.query || S.cat !== '전체');
      const res = v === 'add' ? searchResults() : [];
      let dots = (FL.districts || []).map(([n, x, y]) => `<span class="cx-district" style="left:${x}px;top:${y}px">${n}</span>`).join('');
      if (v === 'add' || S.moreDots) {
        dots += POI.singles.map((i) => { const p = POI.all[i]; return `<button type="button" class="cx-poi${searching ? ' is-dim' : ''}" style="left:${p[0]}px;top:${p[1]}px" data-poi="${i}" aria-label="${esc(p[2])}"></button>`; }).join('');
        if (v === 'add') dots += POI.clusters.filter((c) => !st.some((s) => Math.hypot(s.x - c[0], s.y - c[1]) < 72)).map((c) => `<button type="button" class="cx-cluster${searching ? ' is-dim' : ''}" style="left:${c[0]}px;top:${c[1]}px;--d:${Math.round(26 + Math.sqrt(c[2]) * 1.8)}px" data-act="cluster" data-x="${c[0]}" data-y="${c[1]}" aria-label="장소 ${c[2]}곳, 눌러서 확대">${c[2]}</button>`).join('');
      }
      if (v !== 'ai-city') dots += (FL.places || []).filter((p) => !st.some((s) => s.name === p.name)).map((p) => `<button type="button" class="cx-place${S.sel === p.id ? ' is-sel' : ''}${searching ? ' is-dim' : ''}" style="left:${p.x}px;top:${p.y}px" data-act="pick-place" data-id="${p.id}"><i></i><span>${esc(p.name)}</span></button>`).join('');
      if ((v === 'city' || v === 'add') && S.sel && placeById(S.sel)) {
        const p = placeById(S.sel); if (p && !st.some((s) => s.name === p.name)) dots += `<span class="cx-selmark" style="left:${p.x}px;top:${p.y}px"><i class="cx-selglow"></i><i class="cx-seldot"></i></span>`;
      }
      if (v === 'add') dots += res.map((r) => { const inC = st.some((s) => s.name === r.name); return `<button type="button" class="cx-place cx-place--res${inC ? ' is-in' : ''}" style="left:${r.x}px;top:${r.y}px" data-act="pick-place" data-id="${r.pid || 'poi:' + r.i}">${inC ? I.checkOn(18) : '<i></i>'}<span>${esc(r.name)}</span></button>`; }).join('');
      if (v === 'ai-city') { const s = st.find((x) => x.hot); if (s && s.alts) dots += s.alts.map((a) => `<span class="cx-altdot" style="left:${a.x}px;top:${a.y}px"><i></i></span>`).join(''); }
      wdots.innerHTML = dots;
      wpins.innerHTML = st.map((s, i) => `<button type="button" class="cx-wpin${s.hot ? ' is-hot' : ''}" style="left:${s.x}px;top:${s.y}px;--i:${i}" data-act="stop-pin" data-i="${i}" aria-label="${i + 1}번 ${esc(s.name)}"><i class="cx-wpin-glow"></i><span class="cx-num" style="--c:${s.hot ? 'var(--bright)' : 'var(--pin)'}">${i + 1}</span>${v === 'ai-city' && s.why ? `<span class="cx-wpin-ai">${I.spark(11, 'var(--sky)')}</span>` : ''}<span class="cx-wpin-tag${s.hot ? ' is-sky' : ''}">${esc(s.name)}</span></button>`).join('');
    }

    // 지도 위 떠 있는 것: 장소 카드, 마우스 올림 카드, 조절 버튼, '이 지역 장소 보기'
    function buildFloat() {
      const v = S.view;
      let h = '';
      if (CITY_VIEWS.includes(v) && hasFlat()) {
        h += `<div class="cx-zoom"><div class="cx-zoom-b"><button type="button" data-act="zin" aria-label="확대">${I.plus}</button><button type="button" data-act="zout" aria-label="축소">${I.minus}</button></div></div>`;
        if (S.moved && v === 'city') h += `<button type="button" class="cx-pill" data-act="area">${I.redo}<span>이 지역 장소 보기</span></button>`;
        if ((v === 'city' || v === 'add') && S.sel) h += placeCard(placeById(S.sel));
        if (v === 'add' && S.hoverPoi != null) h += previewCard(S.hoverPoi);
        if (v === 'ai-city') { const s = S.ai.stops.find((x) => x.hot); if (s && s.why) h += `<div class="cx-nb cx-nb--w" data-x="${s.x}" data-y="${s.y}">${I.spark(12, 'var(--sky)')}<span>${esc(s.mapWhy || s.why)}</span></div>`; }
      }
      if (v === 'edit' && cur() && cur().check) h += checkCard(cur());
      floatEl.innerHTML = h;
      placeFloat();
    }
    function crewCheck(c) { // 사람마다 남은 준비. 남은 사람에게 알려 주기
      const inf = comp(c.id); if (!inf || !Object.keys(inf.crewCheck).length) return '';
      S.pinged = S.pinged || {};
      return `<div class="cx-ck-crew"><p class="cx-dim cx-sm">동반자 준비</p>${Object.entries(inf.crewCheck).map(([k, left]) => `<div class="cx-ckp"><span class="cx-av" style="background:${D.people[k][1]}">${D.people[k][0]}</span>
        <span><b>${D.people[k][0]}</b><i class="${left.length ? '' : 'cx-sky'}">${left.length ? `${esc(left.join(', '))} 남음` : '다 마쳤어요'}</i></span>
        ${left.length ? `<button type="button" class="cx-chip ${S.pinged[c.id + k] ? 'cx-chip--sky' : 'cx-chip--soft'}" data-act="ping" data-id="${k}">${S.pinged[c.id + k] ? `${I.check(14)}알렸어요` : '알려 주기'}</button>` : ''}</div>`).join('')}</div>`;
    }
    function checkCard(c) { // 해외: 출발 전 확인 (여권, 입국, 환전 등). 누르면 끝낸 것으로
      const done = c.check.filter((x) => x.done).length;
      return `<aside class="cx-check${S.checkFlash ? ' is-flash' : ''}" aria-label="출발 전 확인"><div class="cx-ck-h"><b>출발 전 확인</b><span class="cx-dim">${c.check.length}개 중 ${done}개</span></div>
        <div class="cx-ck-bar"><i style="width:${(done / c.check.length) * 100}%"></i></div>
        ${c.local ? `<div class="cx-chips">${c.local.map((t) => `<span class="cx-chip cx-chip--sky">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="cx-ck-list">${c.check.map((x, i) => `<button type="button" class="cx-ck${x.done ? ' is-done' : ''}" data-act="check" data-i="${i}" aria-pressed="${!!x.done}"><span class="cx-ck-box">${x.done ? I.checkOn(22) : '<i></i>'}</span><span><b>${esc(x.name)}</b><i>${esc(x.note)}</i></span></button>`).join('')}</div>
        ${crewCheck(c)}
        ${done < c.check.length ? `<button type="button" class="cx-btn cx-btn--soft cx-ck-remind" data-act="check-remind">${I.bell}<span>${S.reminded ? '출발 3일 전에 알려 드릴게요' : `남은 ${c.check.length - done}개, 출발 3일 전에 알려 주기`}</span></button>` : '<p class="cx-sky cx-sm">출발 준비를 다 마쳤어요</p>'}</aside>`;
    }
    function placeCard(p) {
      if (!p) return '';
      const st = cityStops(), k = insertAt(p), inC = st.some((s) => s.name === p.name);
      const big = p.photos;
      const photos = big ? `<div class="cx-gal"><img src="assets/course/${p.photos[S.photo]}" alt="${esc(p.name)} 사진 ${S.photo + 1}"><button type="button" class="cx-gal-b is-l" data-act="photo" data-d="-1" aria-label="이전 사진">${I.chev('l', 14)}</button><button type="button" class="cx-gal-b is-r" data-act="photo" data-d="1" aria-label="다음 사진">${I.chev('r', 14)}</button><span class="cx-gal-n">${S.photo + 1} / ${p.photos.length}</span></div>
        <div class="cx-thumbs">${p.photos.map((f, i) => `<button type="button" class="${i === S.photo ? 'is-on' : ''}" data-act="photo-i" data-i="${i}" aria-label="사진 ${i + 1}"><img src="assets/course/${f}" alt=""></button>`).join('')}</div>`
        : p.photo ? `<div class="cx-gal cx-gal--one"><img src="assets/course/${p.photo}" alt="${esc(p.name)}"></div>` : '';
      const saved = S.saved && S.saved[p.id];
      return `<aside class="cx-pcard${big ? ' is-big' : ''}" aria-label="${esc(p.name)} 정보">${photos}
        <div class="cx-pc-name"><b>${esc(p.name)}</b><button type="button" class="cx-icon cx-save${saved ? ' is-on' : ''}" data-act="save" data-id="${p.id}" aria-pressed="${!!saved}" aria-label="${esc(p.name)} 저장">${I.mark}</button></div>
        <div class="cx-cmeta">${(p.meta || [p.kind, p.near]).filter(Boolean).map((m) => `<span class="cx-dim">${esc(m)}</span>`).join('')}</div>
        ${p.line ? `<p class="cx-pc-line">${esc(p.line)}</p>` : ''}
        ${p.info ? `<dl class="cx-info">${p.info.map(([a, b, hi]) => `<dt>${a}</dt><dd class="${hi ? 'cx-sky' : ''}">${esc(b)}</dd>`).join('')}</dl>` : ''}
        ${p.tags ? `<div class="cx-chips">${p.tags.map((t) => `<span class="cx-chip cx-chip--soft">${esc(t)}</span>`).join('')}</div>` : ''}
        ${p.eta ? `<p class="cx-sky cx-eta">${I.clock}${esc(p.eta)}</p>` : ''}
        <div class="cx-pc-btns">${inC ? `<button type="button" class="cx-btn cx-btn--soft cx-grow" data-act="remove-place" data-id="${p.id}">${I.checkOn(16)}<span>코스에 담김, 빼기</span></button>` : `<button type="button" class="cx-btn cx-btn--ink cx-grow" data-act="insert" data-id="${p.id}"><span>${k}번 다음에 넣기</span></button><button type="button" class="cx-btn cx-btn--soft" data-act="slot-pick" aria-pressed="${S.slotPick}"><span>자리 고르기</span></button>`}</div>
      </aside><i class="cx-pc-tail"></i>`;
    }
    function previewCard(i) {
      const p = poiPlace(i); if (!p) return '';
      const st = cityStops(), inC = st.some((s) => s.name === p.name);
      const glyph = { 카페: '☕', 음식점: '🍜' }[p.kind] ? '' : '';
      void glyph;
      return `<div class="cx-prev" data-x="${p.x}" data-y="${p.y}" role="dialog" aria-label="${esc(p.name)}"><span class="cx-prev-ph" data-kind="${esc(p.kind)}">${p.name.includes('이기대') ? '<img src="assets/course/igidae.jpg" alt="">' : `<b>${esc(p.kind)}</b>`}</span>
        <span class="cx-prev-b"><b>${esc(p.name)}</b><span class="cx-cmeta"><span class="cx-dim">${esc(p.kind)}</span><span class="cx-dim">${esc(p.near)}</span></span>
        <button type="button" class="cx-chip cx-chip--soft" data-act="add-poi" data-i="${i}">${inC ? `<span class="cx-bright">${I.checkOn(14)}</span>담겼어요` : '<i class="cx-rdot-s"></i>코스에 담기'}</button></span><i class="cx-prev-tail"></i></div>`;
    }
    function placeFloat() {
      if (!S.on) return;
      const card = floatEl.querySelector('.cx-pcard');
      if (card && S.sel && vw() <= 860) { card.style.transform = ''; const t = floatEl.querySelector('.cx-pc-tail'); if (t) t.style.opacity = 0; } // 휴대폰: 아래에 붙는 카드 그대로
      else if (card && S.sel) {
        const p = placeById(S.sel); if (!p) return;
        // 장소 오른쪽에 붙임 (자리가 없으면 왼쪽). 위아래는 화면 안에서 장소 높이에 맞춤
        const [sx, sy] = toScreen(p.x, p.y), k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
        const r = card.getBoundingClientRect(), w = r.width, h = r.height, gap = 30, top = 76 * k, bot = bar.classList.contains('is-on') ? bar.getBoundingClientRect().top - 14 : vh() - 24 * k; // 아래 바 위에서 멈춤
        const lx = left.classList.contains('is-on') ? left.getBoundingClientRect().right + 16 : 16;
        let side = sx + gap + w <= vw() - 20 ? 'r' : 'l', x = side === 'r' ? sx + gap : sx - gap - w;
        if (side === 'l' && x < lx) { side = 'r'; x = Math.min(sx + gap, vw() - 20 - w); }
        const y = Math.max(top, Math.min(bot - h, sy - Math.min(140 * k, h * 0.3)));
        card.style.transform = `translate(${(x / k).toFixed(1)}px, ${(y / k).toFixed(1)}px)`;
        card.classList.toggle('is-left', side === 'l');
        const tail = floatEl.querySelector('.cx-pc-tail'), ty = Math.max(y + 22, Math.min(y + h - 22, sy));
        tail.classList.toggle('is-left', side === 'l');
        tail.style.transform = `translate(${(side === 'r' ? x - 11 : x + w - 1).toFixed(1)}px, ${(ty - 11).toFixed(1)}px)`;
        tail.style.opacity = sy > y + 8 && sy < y + h - 8 ? 1 : 0;
      }
      for (const el of floatEl.querySelectorAll('[data-x]')) { const [sx, sy] = toScreen(+el.dataset.x, +el.dataset.y); el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`; }
    }

    // ---------- 동작 ----------
    function openCourse(id, alert) { S.curId = id; S.day = 'all'; S.alertMode = !!alert; S.renaming = null; go('edit'); }
    function openCity(key, from) {
      S.cityKey = key; S.cityFrom = from; S.sel = null; S.moved = false; S.photo = 0;
      if (from === 'ai') { S.ai.stops = S.ai.stops || clone(FL.aiStops || FL.stops); go('ai-city'); } else go('city');
    }
    function startAi(request) {
      if (request) { S.ai.request = request; }
      S.ai.step = 0; S.ai.sel = 0; S.ai.stops = null; go('ai-gen');
      clearInterval(S.ai.timer);
      if (reduce) { S.ai.step = 5; go('ai'); return; }
      S.ai.timer = setInterval(() => {
        S.ai.step++;
        if (S.ai.step >= D.AI.steps.length) { clearInterval(S.ai.timer); S.ai.timer = 0; S.stack.pop(); go('ai'); return; }
        render(false);
      }, 1050);
    }
    function aiToCourse() {
      const P = D.AI.proposals[S.ai.sel];
      const base = P.course ? S.courses.find((c) => c.id === P.course) || D.COURSES.find((c) => c.id === P.course) : null;
      const c = base ? clone(base) : { name: P.name, days: [{ label: '1일차', date: '', cities: P.route.slice(1).map((k) => ({ key: k, move: '', stops: (P.detail.find(([x]) => x === k) || [k, []])[1].join(', ').replace(/!/g, '').split(', ').map((s) => { const m = /^(\d+:\d+)\s(.*)$/.exec(s); return { t: m ? m[1] : '', name: m ? m[2] : s, note: '' }; }) })) }] };
      Object.assign(c, { id: 'c' + Date.now(), name: P.name, status: 'upcoming', ai: true, dday: c.dday || TX.newDday, dates: c.dates || TX.newDates, people: c.people || [], alert: null });
      if (S.ai.stops) c.flat = clone(S.ai.stops);
      S.courses.unshift(c); syncCityFor(c);
      S.stack = ['explore', 'mine']; openCourse(c.id);
    }
    function syncCityFor(c) { const keep = S.curId; S.curId = c.id; syncCity(); S.curId = keep; }
    function picksToCourse() {
      const picks = AT().course(); if (!picks.length) return;
      let c = S.courses.find((x) => x.id === 'picks');
      const cities = picks.map((p) => (p.id === FL.eventPick ? { key: FL.key, move: '', stops: clone(FL.stops).map((s) => ({ t: s.t, name: s.name, note: s.hot ? FL.event : '', hot: s.hot })) } : { name: p.name, lat: p.lat, lon: p.lon, move: '', stops: [{ t: '', name: p.name, note: p.kind === 'event' ? `축제, ${p.when}` : '' }] }));
      const days = cities.length > 2 ? [{ label: '1일차', date: '', cities: cities.slice(0, 2) }, { label: '2일차', date: '', cities: cities.slice(2) }] : [{ label: '1일차', date: '', cities }];
      const p0 = picks[0], air = (D.AIRPORTS || []).map((k) => [k, Math.hypot(CITY[k].lat - p0.lat, CITY[k].lon - p0.lon)]).sort((a, b) => a[1] - b[1])[0]; // 해외: 첫 장소에서 가까운 공항으로 비행
      const fly = air && /^인천에서 비행/.test(p0.trip || '') ? p0.trip.replace('비행 ', '') : null;
      if (!c) { c = { id: 'picks', name: '새 코스', status: 'draft', dates: '', people: [], days, air: air ? air[0] : null, flyNote: fly }; S.courses.splice(S.courses.filter((x) => x.status === 'upcoming').length, 0, c); }
      else Object.assign(c, { days, air: air ? air[0] : null, flyNote: fly });
      S.stack = ['explore', 'mine']; openCourse(c.id);
    }
    function del(id) {
      const c = S.courses.find((x) => x.id === id); if (!c) return;
      const list = S.courses.filter((x) => x.status === c.status);
      if (S.undo) clearTimeout(S.undo.timer);
      S.undo = { course: c, at: S.courses.indexOf(c), index: list.indexOf(c), status: c.status, timer: setTimeout(() => { S.undo = null; if (S.view === 'mine') render(false); }, 5000) };
      S.courses.splice(S.courses.indexOf(c), 1);
      if (S.hoverCourse === id) S.hoverCourse = null;
      S.menu = null; render(false);
    }
    function copyLink(tag) {
      const t = `${location.origin}${location.pathname}?course=${encodeURIComponent(tag)}`;
      try { navigator.clipboard && navigator.clipboard.writeText(t); } catch (e) { /* 복사가 막혀 있어도 표시는 그대로 */ }
      S.copied = tag; render(false); setTimeout(() => { if (S.copied === tag) { S.copied = null; render(false); } }, 2200);
    }
    function act(a, el) {
      const id = el && el.dataset.id;
      switch (a) {
        case 'go-explore': if (S.view !== 'explore') { S.stack = []; S.view = 'explore'; render(true); } break;
        case 'go-mine': S.stack = ['explore']; S.view = 'mine'; S.alertMode = false; render(true); break;
        case 'back': back_(); break;
        case 'new-menu': S.newMenu = !S.newMenu; S.menu = null; render(false); break;
        case 'new-direct': S.stack = []; S.view = 'explore'; render(true); break;
        case 'new-ai': go('ai-start'); break;
        case 'menu': S.menu = S.menu === id ? null : id; S.newMenu = false; render(false); { const m = left.querySelector('.cx-menu .cx-mi'); if (m) m.focus(); } break;
        case 'rename': S.renaming = id; S.menu = null; render(false); { const inp = root.querySelector('.cx-rename'); if (inp) { inp.focus(); inp.select(); } } break;
        case 'dup': { const c = S.courses.find((x) => x.id === id); const n = clone(c); n.id = 'c' + Date.now(); n.name = c.name + '의 복사본'; n.alert = null; n.shared = null; S.courses.splice(S.courses.indexOf(c) + 1, 0, n); S.menu = null; S.renaming = n.id; render(false); { const inp = root.querySelector('.cx-rename'); if (inp) { inp.focus(); inp.select(); } } break; }
        case 'share': if (ctx.openCompanion) { S.menu = null; render(false); ctx.openCompanion({ course: S.courses.find((x) => x.id === id), tab: 'invite' }); } else copyLink(id); break;
        case 'share-bar': if (ctx.openCompanion && cur()) ctx.openCompanion({ course: cur(), tab: 'invite' }); else copyLink('bar'); break;
        case 'crew': if (ctx.openCompanion) ctx.openCompanion({ course: S.courses.find((x) => x.id === id), tab: 'home' }); break;
        case 'crew-invite': if (ctx.openCompanion) ctx.openCompanion({ course: S.courses.find((x) => x.id === id), tab: 'invite' }); break;
        case 'ping': S.pinged = S.pinged || {}; S.pinged[cur().id + id] = true; buildFloat(); break;
        case 'del': del(id); break;
        case 'undo': if (S.undo) { clearTimeout(S.undo.timer); S.courses.splice(Math.min(S.undo.at, S.courses.length), 0, S.undo.course); S.undo = null; render(false); } break;
        case 'open': openCourse(id); break;
        case 'card': { S.openCard = S.openCard === id ? null : id; S.hoverCourse = id; render(false); const el2 = left.querySelector(`[data-course="${id}"]`); if (el2 && S.openCard) el2.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); break; }
        case 'card-city': S.curId = id; S.stack = ['explore', 'mine', 'edit']; openCity(FL.key, 'edit'); break;
        case 'alert': { const c = S.courses.find((x) => x.id === id); if (c && c.alert && c.alert.kind === 'check') { S.checkFlash = true; openCourse(id); setTimeout(() => { S.checkFlash = false; }, 1200); } else openCourse(id, true); break; }
        case 'check': { const c = cur(); const x = c && c.check[+el.dataset.i]; if (x) { x.done = !x.done; const left = c.check.filter((y) => !y.done).length; if (c.alert && c.alert.kind === 'check') c.alert = left ? { ...c.alert, text: `출발 전 확인 ${left}개 남았어요` } : null; buildFloat(); } break; }
        case 'check-remind': S.reminded = true; buildFloat(); break;
        case 'other-mode': if (ctx.switchMode && TX.other) ctx.switchMode(TX.other.mode); break;
        case 'past': S.pastOpen = !S.pastOpen; render(false); break;
        case 'again': { const p = S.past[+el.dataset.i]; const n = { id: 'c' + Date.now(), name: p.name, status: 'draft', dates: '', people: [], days: [{ label: '1일차', date: '', cities: [{ key: FL.key, move: '', stops: [{ t: '', name: p.name, note: '지난번 코스 그대로' }] }] }] }; S.courses.push(n); S.pastOpen = false; S.renaming = null; openCourse(n.id); break; }
        case 'starter': { const s = D.STARTERS[+el.dataset.i]; const n = { id: 'c' + Date.now(), name: s.name, status: 'draft', dates: '', people: [], days: [{ label: '1일차', date: '', cities: [{ key: s.spot, move: TX.starterMove(CITY[s.spot].name), stops: s.spot === FL.key ? clone(FL.stops).map((x) => ({ t: x.t, name: x.name, note: x.hot ? FL.event : '', hot: x.hot })) : [{ t: '', name: s.spotLabel, note: s.when }] }] }], air: s.air || null, flyNote: s.flyNote || null }; S.courses.unshift(n); openCourse(n.id); break; }
        case 'ai-cond': { const inp = root.querySelector('.cx-ai-in input'); if (inp) { inp.value = (inp.value ? inp.value + ', ' : '') + el.dataset.v; inp.focus(); } break; }
        case 'day': S.day = el.dataset.k === 'all' ? 'all' : +el.dataset.k; if (S.alertMode) S.alertMode = S.day === 'all' ? S.alertMode : S.alertMode; render(false); break;
        case 'fold': { const d = cur().days[+el.dataset.d]; d.fold = !d.fold; render(false); break; }
        case 'add-day': { const c = cur(); c.days.push({ label: `${c.days.length + 1}일차`, date: '', cities: [] }); S.day = c.days.length - 1; render(false); break; }
        case 'city-detail': { const ct = cur().days[+el.dataset.d].cities[+el.dataset.c]; openCity(ct.key || FL.key, 'edit'); break; }
        case 'alert-apply': { const c = cur(); for (const ch of c.alert.changes) for (const d of c.days) for (const ct of d.cities) for (const s of ct.stops) if (s.name === ch.name) s.t = ch.to; for (const ch of c.alert.changes) if (ch.end) for (const d of c.days) if (d.end) d.end = { ...d.end, text: ch.to }; c.alert = null; S.alertMode = false; render(false); break; }
        case 'alert-keep': { const c = cur(); c.alert = null; S.alertMode = false; render(false); break; }
        case 'edit-done': S.stack = ['explore']; S.view = 'mine'; S.alertMode = false; render(true); break;
        case 'ai-refine': S.ai.request = `${cur() ? cur().name : '지금 코스'}를 더 여유롭게 다듬어 줘`; startAi(); break;
        case 'ai-from-picks': S.ai.request = `${AT().course().map((p) => p.name).join(', ')}를 넣어서 1박 2일로`; startAi(); break;
        case 'edit-picks': picksToCourse(); break;
        case 'ai-stop': clearInterval(S.ai.timer); S.ai.timer = 0; go('ai-start'); break;
        case 'prop': S.ai.sel = +el.dataset.i; S.ai.stops = null; render(false); break;
        case 'ai-again': startAi(); break;
        case 'ai-refine-chip': S.ai.request = `${S.ai.request} ${el.dataset.v}.`; startAi(); break;
        case 'ai-city': { const k = el.dataset.k; if (S.view === 'ai-city') { S.cityKey = k; S.sel = null; S.ai.swap = null; S.view = 'ai-city'; render(true); } else openCity(k, 'ai'); break; }
        case 'ai-start-course': aiToCourse(); break;
        case 'ai-city-regen': S.ai.regen = true; render(false); setTimeout(() => { S.ai.regen = false; S.ai.stops = clone(FL.aiStops || FL.stops); S.ai.swap = null; render(false); }, reduce ? 0 : 900); break;
        case 'swap': { const i = +el.dataset.i; S.ai.swap = S.ai.swap === i ? null : i; if (!S.ai.stops[i].alts) S.ai.stops[i].alts = altsNear(S.ai.stops[i]); render(false); break; }
        case 'alt': { const s = S.ai.stops[+el.dataset.i], a = s.alts[+el.dataset.k]; s.alts = s.alts.map((x) => (x === a ? { name: s.name, sub: '원래 자리', x: s.x, y: s.y } : x)); Object.assign(s, { name: a.name, x: a.x, y: a.y, why: '' }); S.ai.swap = null; render(false); break; }
        case 'go-add': go('add'); break;
        case 'pick-place': { const p = placeById(id); if (!p) break; S.sel = id; S.photo = 0; S.slotPick = false; S.hoverPoi = null; render(false); revealSel(); break; }
        case 'close-card': S.sel = null; S.slotPick = false; render(false); break;
        case 'save': S.saved = S.saved || {}; S.saved[id] = !S.saved[id]; { const b = floatEl.querySelector('.cx-save'); if (b) { b.classList.toggle('is-on', S.saved[id]); b.setAttribute('aria-pressed', S.saved[id]); } } break;
        case 'insert': { const p = placeById(id); addPlace(p, insertAt(p)); S.sel = null; render(false); break; }
        case 'remove-place': { const st = cityStops(); const k = st.findIndex((s) => s.name === placeById(id).name); if (k >= 0) st.splice(k, 1); syncCity(); render(false); break; }
        case 'slot-pick': S.slotPick = !S.slotPick; render(false); break;
        case 'slot': { addPlace(placeById(S.sel), +el.dataset.i); S.sel = null; S.slotPick = false; render(false); break; }
        case 'photo': { const p = placeById(S.sel); S.photo = (S.photo + +el.dataset.d + p.photos.length) % p.photos.length; showPhoto(p); break; }
        case 'photo-i': S.photo = +el.dataset.i; showPhoto(placeById(S.sel)); break;
        case 'zin': zoomAt(1.3, vw() * 0.6, vh() / 2, true); break;
        case 'zout': zoomAt(1 / 1.3, vw() * 0.6, vh() / 2, true); break;
        case 'area': S.moved = false; S.moreDots = true; buildWorld(); buildFloat(); break;
        case 'cluster': zoomAt(1.7, ...toScreen(+el.dataset.x, +el.dataset.y), true); break;
        case 'add-place': { const p = placeById(id); if (!p) break; const st = cityStops(); const k = st.findIndex((s) => s.name === p.name); if (k >= 0) { st.splice(k, 1); syncCity(); render(false); } else addPlace(p); break; }
        case 'add-poi': { const p = poiPlace(+el.dataset.i); const st = cityStops(); const k = st.findIndex((s) => s.name === p.name); if (k >= 0) { st.splice(k, 1); syncCity(); render(false); } else addPlace(p); break; }
        case 'q-set': S.query = el.dataset.v; render(false); break;
        case 'q-clear': S.query = ''; render(false); { const q = root.querySelector('.cx-search input'); if (q) q.focus(); } break;
        case 'cat': S.cat = el.dataset.v; render(false); break;
        case 'stop-pin': break;
        case 'move-pick': el.classList.toggle('is-open'); break;
        default: break;
      }
    }
    function showPhoto(p) { // 카드는 그대로 두고 사진만 바꿔 끼움 (카드가 다시 튀어나오지 않게)
      const g = floatEl.querySelector('.cx-gal'); if (!g || !p.photos) return;
      const img = g.querySelector('img'), nimg = img.cloneNode(); nimg.src = `assets/course/${p.photos[S.photo]}`; nimg.alt = `${p.name} 사진 ${S.photo + 1}`; img.replaceWith(nimg);
      g.querySelector('.cx-gal-n').textContent = `${S.photo + 1} / ${p.photos.length}`;
      floatEl.querySelectorAll('.cx-thumbs button').forEach((b, i) => b.classList.toggle('is-on', i === S.photo));
    }
    function altsNear(s) { // 바꾸기: 그 장소 둘레의 다른 이름 있는 장소 두 곳
      return (FL.places || []).filter((p) => p.name !== s.name).map((p) => ({ p, d: Math.hypot(p.x - s.x, p.y - s.y) })).sort((a, b) => a.d - b.d).slice(0, 2).map(({ p, d }) => ({ name: p.name, sub: tripTxt(d), x: p.x, y: p.y }));
    }
    function addPlace(p, at) {
      const st = cityStops(); if (!p || st.some((s) => s.name === p.name)) return;
      const k = at == null ? insertAt(p) : at;
      const prev = st[k - 1], base = prev ? tm(prev.t) : null;
      const t = base == null ? '' : fmt(base + (prev.hot ? 130 : 60));
      st.splice(k, 0, { id: p.id, t, name: p.name, note: p.kind === '공원' ? '40분 머묾' : p.kind || '', x: p.x, y: p.y, move: '도보 10분' });
      for (let i = k + 1; i < st.length; i++) { const m = tm(st[i].t); if (m != null) st[i].t = fmt(m + 50); } // 뒤 일정은 그만큼 밀림
      syncCity(); render(false);
    }
    function revealSel() { // 고른 장소가 왼쪽 칸 뒤나 화면 끝이면, 카드가 옆에 붙을 자리가 생기게 지도를 살짝 밀어 줌
      const p = placeById(S.sel); if (!p) return;
      const [sx, sy] = toScreen(p.x, p.y), lx = left.getBoundingClientRect().right + 60;
      if (sx >= lx && sx <= vw() - 60 && sy >= 120 && sy <= vh() - 160) return;
      panTo(p.x, p.y, Math.max(lx + 40, vw() * 0.5), vh() * 0.45);
    }
    function back_() {
      if (S.menu || S.newMenu) { S.menu = null; S.newMenu = false; render(false); return true; }
      if ((S.view === 'city' || S.view === 'add') && S.sel) { S.sel = null; S.slotPick = false; render(false); return true; }
      if (S.view === 'explore') return false;
      if (S.view === 'add') { go('city', { back: true }); return true; }
      if (S.view === 'city') { if (cur()) { S.view = 'edit'; S.stack.pop(); render(true); } else go('mine', { back: true }); return true; }
      if (S.view === 'ai-city') { S.view = 'ai'; S.stack.pop(); render(true); return true; }
      if (['ai', 'ai-gen', 'ai-start'].includes(S.view)) { S.stack = ['explore']; S.view = 'mine'; render(true); return true; }
      if (S.view === 'edit') { S.stack = ['explore']; S.view = 'mine'; S.alertMode = false; render(true); return true; }
      S.view = 'explore'; S.stack = []; render(true); return true;
    }

    // ---------- 이벤트 ----------
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) { if ((S.menu || S.newMenu) && !e.target.closest('.cx-menu')) { S.menu = null; S.newMenu = false; render(false); } return; }
      if (b.closest('.cx-world') && W.dragged) return; // 끌기를 마친 손가락은 누르기가 아님
      if ((S.menu || S.newMenu) && !b.closest('.cx-menu') && !['menu', 'new-menu'].includes(b.dataset.act)) { S.menu = null; S.newMenu = false; }
      act(b.dataset.act, b);
    });
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target, q = (f.elements.q && f.elements.q.value || '').trim();
      if (f.dataset.form === 'ai') { if (q) { S.ai.request = q; S.ai.chips = [...new Set([HOME.start, '도시마다 세부 코스까지', ...q.split(/,\s*/).filter((x) => TX.aiConds.includes(x))])]; } startAi(); }
      if (f.dataset.form === 'say' && q) { S.ai.request = `${S.ai.request} ${q}`; startAi(); }
      if (f.dataset.form === 'search') { S.query = q; render(false); }
    });
    root.addEventListener('input', (e) => { if (e.target.closest('.cx-search')) { S.query = e.target.value; clearTimeout(S.qT); S.qT = setTimeout(() => { const pos = e.target.selectionStart; render(false); const q = root.querySelector('.cx-search input'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 180); } });
    root.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('cx-rename')) { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { S.renaming = null; render(false); } return; }
      if (e.key === 'Escape') { if (back_()) e.stopPropagation(); }
    });
    root.addEventListener('focusout', (e) => { if (e.target.classList.contains('cx-rename')) { const c = S.courses.find((x) => x.id === e.target.dataset.id); const v = e.target.value.trim(); if (c && v) c.name = v; S.renaming = null; setTimeout(() => render(false), 0); } });
    root.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.cx-course'); if (card && S.view === 'mine' && S.hoverCourse !== card.dataset.course) { S.hoverCourse = card.dataset.course; for (const c of left.querySelectorAll('.cx-course')) { const on = c.dataset.course === S.hoverCourse; c.classList.toggle('is-hot', on); const ch = c.querySelector('.cx-chain'); if (ch) ch.classList.toggle('is-on', on); } buildNat(); }
      const st = e.target.closest('.cx-starter'); if (st && +st.dataset.starter !== S.hoverStarter) { S.hoverStarter = +st.dataset.starter; for (const x of left.querySelectorAll('.cx-starter')) { const on = +x.dataset.starter === S.hoverStarter; x.classList.toggle('is-hot', on); const b = x.querySelector('.cx-btn'); b.classList.toggle('cx-btn--ink', on); b.classList.toggle('cx-btn--soft', !on); } buildNat(); }
      const poi = e.target.closest('.cx-poi'); if (poi && S.view === 'add' && S.hoverPoi !== +poi.dataset.poi) { S.hoverPoi = +poi.dataset.poi; buildFloat(); }
    });
    root.addEventListener('mouseout', (e) => { const poi = e.target.closest('.cx-poi'); if (poi && !(e.relatedTarget && e.relatedTarget.closest && (e.relatedTarget.closest('.cx-prev') || e.relatedTarget.closest('.cx-poi')))) { clearTimeout(S.pT); S.pT = setTimeout(() => { if (!floatEl.querySelector('.cx-prev:hover')) { S.hoverPoi = null; buildFloat(); } }, 260); } });
    root.addEventListener('mouseleave', () => {}, true);
    // 점을 누르면 미리보기 고정 (터치 화면: 한 번은 미리보기, 다시 누르면 큰 카드)
    wdots.addEventListener('click', (e) => { const poi = e.target.closest('.cx-poi'); if (!poi || W.dragged) return; const i = +poi.dataset.poi; S.sel = 'poi:' + i; S.photo = 0; S.hoverPoi = null; render(false); });
    // 끌어 옮기기, 휠로 확대
    cityEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button:not(.cx-poi):not(.cx-cluster)')) return;
      W.drag = { x: e.clientX, y: e.clientY, tx: W.tx, ty: W.ty, id: e.pointerId, bg: !e.target.closest('button') }; W.dragged = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!W.drag || e.pointerId !== W.drag.id) return;
      const dx = e.clientX - W.drag.x, dy = e.clientY - W.drag.y;
      if (!W.dragged && Math.hypot(dx, dy) < 5) return;
      if (!W.dragged) { W.dragged = true; cityEl.classList.add('is-drag'); try { cityEl.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } }
      W.tx = W.drag.tx + dx; W.ty = W.drag.ty + dy; applyW(false);
    });
    window.addEventListener('pointerup', () => {
      if (!W.drag) return;
      const was = W.dragged, bg = W.drag.bg; W.drag = null; cityEl.classList.remove('is-drag');
      if (!was && bg && S.sel && (S.view === 'city' || S.view === 'add')) { S.sel = null; S.slotPick = false; render(false); } // 빈 지도를 누르면 카드를 닫음
      if (was) { if (S.view === 'city' && !S.moved) { S.moved = true; buildFloat(); } setTimeout(() => { W.dragged = false; }, 0); }
    });
    cityEl.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY, false); }, { passive: false });
    // 도시 카드, 장소 줄: 끌어서 순서 바꾸기
    left.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.cx-citycard, .cx-stop[draggable="true"]'); if (!card) return;
      S.dragCity = card.classList.contains('cx-citycard') ? { d: +card.dataset.d, c: +card.dataset.c } : { stop: +card.dataset.i };
      card.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'x'); } catch (er) { /* 무시 */ }
    });
    left.addEventListener('dragover', (e) => { if (S.dragCity) { e.preventDefault(); const t = e.target.closest('.cx-citycard, .cx-stop[draggable="true"]'); for (const x of left.querySelectorAll('.is-over')) x.classList.remove('is-over'); if (t) t.classList.add('is-over'); } });
    left.addEventListener('drop', (e) => {
      const g = S.dragCity; S.dragCity = null; if (!g) return; e.preventDefault();
      const t = e.target.closest('.cx-citycard, .cx-stop[draggable="true"]'); if (!t) { render(false); return; }
      if (g.stop != null && t.dataset.i != null) { const st = cityStops(); const [m] = st.splice(g.stop, 1); st.splice(+t.dataset.i, 0, m); syncCity(); }
      else if (g.d != null && t.dataset.d != null) { const c = cur(); const [m] = c.days[g.d].cities.splice(g.c, 1); c.days[+t.dataset.d].cities.splice(+t.dataset.c, 0, m); }
      render(false);
    });
    left.addEventListener('dragend', () => { S.dragCity = null; for (const x of left.querySelectorAll('.is-over, .is-dragging')) x.classList.remove('is-over', 'is-dragging'); });
    window.addEventListener('resize', () => { if (flatOn) fitWorld(false); natPos(); });

    // 전국 화면은 카메라가 움직이는 동안 매 프레임 핀 자리를 다시 잡음
    function loop() { if (S.on) { natPos(); requestAnimationFrame(loop); } }

    return {
      enter(view) { S.on = true; root.hidden = false; poseKey = 'explore'; S.view = 'explore'; S.stack = []; if (view && view !== 'explore') { S.stack = ['explore']; if (view === 'empty') { S.courses = []; view = 'mine'; } if (view === 'alert') { openCourse(DEMO.alert, true); } else if (view === 'edit') openCourse(DEMO.course); else if (view === 'city') { S.curId = DEMO.course; S.stack.push('edit'); openCity(FL.key, 'edit'); } else if (view === 'add') { S.curId = DEMO.course; openCity(FL.key, 'edit'); go('add'); } else if (view === 'ai-gen') startAi(); else if (view === 'ai') { S.ai.step = 5; go('ai'); } else if (view === 'ai-city') { S.ai.step = 5; S.view = 'ai'; openCity(FL.key, 'ai'); } else go(view); } else render(true); requestAnimationFrame(loop); },
      refresh() { if (S.on) { natSig = ''; render(false); } }, // 동반자 앱을 닫은 뒤 (투표 반영, 새 소식)
      applyVote(id, spec, name) { return applyVote(S.courses, id, spec, name, { key: FL.key, stops: FL.stops }); }, // 동반자 투표 결과를 이 코스 목록에
      onAtlas() { poseKey = ''; natSig = ''; if (S.on && !CITY_VIEWS.includes(S.view)) render(false); }, // 세계 지도와 일본 지도가 바뀌어 끼워졌을 때
      exit() { S.on = false; root.hidden = true; clearInterval(S.ai.timer); S.view = 'explore'; S.stack = []; flatOn = false; cityEl.classList.remove('is-on'); document.body.classList.remove('is-course', 'is-course-city'); poseKey = ''; },
      back: back_,
      ownsMap: () => S.on && S.view !== 'explore',
      onPicks() { if (S.on) render(false); },
    };
  };
})();

// eodi 모바일: 여행 중에 빠르게 바꾸는 앱 (기획 06-3). 여행 전에는 내 코스, 동행 투표, 대략 코스만.
// 확인용: ?trip=1 여행 중(오늘 화면), ?time=21:30 그 시각의 하늘, ?rain=1 계획이 깨질 때 시트, ?tab=course|crew|money, ?flow=1 대략 코스
(function () {
  const D = window.EODI_M, MI = window.EODI_MI;
  const app = document.getElementById('app'), $ = (s) => app.querySelector(s);
  const over = $('#over'), sheet = $('#sheet'), sum = $('#sum'), composer = $('#composer'), flow = $('#flow'), modal = $('#modal'), toastEl = $('#toast');
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icon = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${MI[k]}"/></svg>`;
  app.querySelectorAll('path[data-i]').forEach((p) => p.setAttribute('d', MI[p.dataset.i]));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const won = (n) => n.toLocaleString('ko-KR') + '원';
  const manWon = (n) => { const m = Math.floor(n / 10000), r = Math.round((n % 10000) / 100) * 100; return (m ? m + '만 ' : '') + (r ? r.toLocaleString('ko-KR') : '') + '원'; };
  const hm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ' ' + (m % 60) + '분' : ''}` : `${m}분`);
  const av = (id, size = '') => { const p = D.people[id], lite = id === 'me' && app.dataset.ui === 'night'; /* 밤에는 '나'를 밝게 (남색 하늘에 묻히지 않게) */ return `<i class="av ${size}" style="background:${lite ? '#E6E9FF' : p.color};color:${lite ? '#0E112A' : p.ink}">${p.name}</i>`; };

  // ---------- 상태 (이 기기 안에만 저장) ----------
  const KEY = 'eodi-m-v1';
  // 저장하지 않음: 새로고침하면 처음 상태로 (예전에 남은 저장 내용도 지움)
  try { localStorage.removeItem(KEY); localStorage.removeItem('eodi-m-recent'); } catch (e) { /* 저장소를 못 써도 그대로 */ }
  const saved = {};
  const stopsById = Object.fromEntries([...D.stops, ...Object.values(D.alts).flat()].map((s) => [s.id, s]));
  const S = {
    tab: params.get('tab') || 'home',
    trip: params.has('trip') ? params.get('trip') !== '0' : !!saved.trip,
    order: saved.order || D.stops.map((s) => s.id),
    base: D.stops.map((s) => s.id), // 처음 순서 (줄어든 이동 시간 비교용)
    skip: new Set(saved.skip || []),
    drafts: saved.drafts || D.drafts.slice(),
    props: saved.props || D.proposals.map((p) => ({ ...p, yes: p.yes.slice(), wait: p.wait.slice() })),
    decided: saved.decided || D.decided.slice(),
    chat: D.chat.map((m) => ({ ...m })), reply: null, tray: false, // 채팅은 저장하지 않음: 새로고침하면 처음 대화로
    spent: saved.spent || { ...D.spent },
    alert: params.has('rain') ? 'open' : (saved.alert || 'on'), // on: 종에 점, open: 시트, done
    amount: '', cat: '식비', payer: 'me',
    swipe: null,
  };
  const persist = () => {}; // 새로고침하면 초기화되도록 저장하지 않음

  // ---------- 시간대: 웹 히어로와 같은 다섯 단계 하늘 ----------
  const SKY = { dawn: ['#3A5C9E', '#8DA2D2', '#F3C1B0', '#FFE2CF'], day: ['#1A81BD', '#4799CC', '#9CCBEA', '#DCEBF4'], sunset: ['#24508F', '#7A93CC', '#FFB98A', '#FFD7AE'], dusk: ['#0D1E50', '#22417F', '#5A79BC', '#94AEDD'], night: ['#050B24', '#0A1940', '#162E66', '#26437C'] };
  function sunTimes(d) { // 해 뜨고 지는 시각(분), 서울 위도
    const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5), decl = 23.44 * Math.sin((2 * Math.PI * (284 + n)) / 365) * Math.PI / 180, lat = 37.57 * Math.PI / 180;
    const h = Math.acos(Math.max(-1, Math.min(1, (Math.sin(-0.833 * Math.PI / 180) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl))))) * 180 / Math.PI / 15;
    return [(12.4 - h) * 60, (12.4 + h) * 60];
  }
  let forcedSky = null; // PC 설명 칸의 낮·노을·밤 토글로 고정한 하늘
  function phase() {
    if (forcedSky) return forcedSky;
    const now = new Date(), t = params.get('time');
    const m = t && /^(\d{1,2}):(\d{2})$/.test(t) ? +t.split(':')[0] * 60 + +t.split(':')[1] : now.getHours() * 60 + now.getMinutes();
    const [rise, set] = sunTimes(now);
    if (m < rise - 70 || m >= set + 70) return 'night';
    if (m < rise + 30) return 'dawn';
    if (m < set - 50) return 'day';
    if (m < set + 10) return 'sunset';
    return 'dusk';
  }
  function applySky() {
    const p = phase(), c = SKY[p];
    c.forEach((v, i) => app.style.setProperty('--s' + i, v));
    const dark = p === 'night' || p === 'dusk';
    app.dataset.ui = dark ? 'night' : 'day'; app.dataset.sky = dark ? 'night' : 'day'; app.dataset.phase = p;
    document.querySelector('meta[name="theme-color"]').content = c[0];
  }

  // ---------- 일정 계산: 순서, 머무는 시간, 이동 시간으로 시각과 비용을 다시 계산 ----------
  function plan(order = S.order, skip = S.skip) {
    const list = order.map((id) => stopsById[id]).filter((s) => !skip.has(s.id));
    let t = 630; const rows = []; let move = 0, cost = 0;
    list.forEach((s, i) => {
      if (i) { const mv = D.moves[list[i - 1].id + '>' + s.id] || D.moves[s.id + '>' + list[i - 1].id] || [20, 'bus']; t += mv[0]; move += mv[0]; rows[i - 1].next = mv; }
      if (s.fixed) t = +s.fixed.split(':')[0] * 60 + +s.fixed.split(':')[1];
      rows.push({ s, at: t }); t += s.stay; cost += s.cost;
    });
    return { rows, move, cost };
  }
  // 예시 시각: 낮에는 13:40, 밤에는 18:15 (Figma 오늘 화면과 같은 장면)
  const nowMin = () => (app.dataset.ui === 'night' ? 18 * 60 + 15 : 13 * 60 + 40);

  // ---------- 화면: 하늘 위 + 시트 ----------
  const ST = { home: 316, today: 334, course: 170, crew: 182, money: 176 };
  function render(o = {}) {
    const key = S.tab === 'home' ? (S.trip ? 'today' : 'home') : S.tab;
    app.dataset.tab = S.tab; app.classList.toggle('is-trip', S.trip);
    app.style.setProperty('--st', ST[key] + 'px');
    const r = VIEWS[key]();
    over.innerHTML = r.over; sheet.innerHTML = r.sheet;
    sum.hidden = key !== 'course'; if (key === 'course') renderSum();
    composer.hidden = key !== 'crew'; if (key === 'crew') { renderComposer(); requestAnimationFrame(() => { sheet.scrollTop = sheet.scrollHeight; }); chatDemo(); }
    if (o.enter && !reduce) { for (const el of [over, sheet, sum, composer]) { el.classList.remove('is-enter'); void el.offsetWidth; el.classList.add('is-enter'); } clearTimeout(render.t); render.t = setTimeout(() => [over, sheet, sum, composer].forEach((el) => el.classList.remove('is-enter')), 900); }
    tabs();
  }
  const goTab = (t) => { if (t === S.tab) { sheet.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; } S.tab = t; sheet.scrollTop = 0; render({ enter: true }); };
  const VIEWS = {
    home() { // 여행 전: 내 코스
      const tr = D.trip, days = Math.max(0, Math.round((new Date(tr.start) - new Date(new Date().toDateString())) / 864e5));
      const vote = S.props.find((p) => !p.mine);
      return {
        over: `<div class="over-top"><span></span><button class="av s34" data-act="me" aria-label="내 정보" style="width:34px;height:34px;border-radius:50%;background:${app.dataset.ui === 'night' ? '#FF6B57' : '#0E2F47'};color:${app.dataset.ui === 'night' ? '#0E112A' : '#fff'};font-weight:600">나</button></div>
          <div class="over-stack" style="margin-top:22px;gap:2px"><span class="label" style="font-size:18px;font-weight:600;opacity:.85">부산까지</span><span class="big">${days ? days + '일' : '오늘 출발'}</span><span class="lead" style="font-size:16px">11월 27일 금, ${esc(tr.fromNote)}</span></div>`,
        sheet: `<h2>내 코스</h2><div class="stack">
          <button class="course" data-act="start-trip"><img src="${tr.photo}" alt=""><span><b>${esc(tr.title)}</b><span class="route">${tr.route.join(' > ')}</span><span class="meta">11월 27일부터, 지 민과 함께</span></span></button>
          ${S.drafts.map((d) => `<button class="course" data-act="draft"><img src="${d.photo || ''}" alt=""${d.photo ? '' : ' style="visibility:hidden"'}><span><b>${esc(d.title)} <i class="chip-s">초안</i></b><span class="route">${d.route.join(' > ')}</span><span class="meta">${esc(d.when)}</span></span></button>`).join('')}
          ${vote ? `<button class="notice" data-act="tab" data-tab="crew">${icon('bell')}<div><b>${D.people[vote.by].name}${vote.by === 'min' ? '이' : '가'} 순서를 바꾸자고 했어요</b><span>찬성하면 바로 바뀌어요</span></div>${icon('caret-right')}</button>` : ''}
          <button class="btn" data-act="flow">${icon('plus')}대략 코스 만들기</button></div>`,
      };
    },
    today() { // 여행 중: 오늘
      const night = app.dataset.ui === 'night', { rows } = plan(), now = nowMin();
      let cur = rows.findIndex((r) => r.at >= now); if (cur < 0) cur = rows.length - 1;
      const next = rows[cur], prev = rows[cur - 1];
      const how = prev && prev.next ? prev.next : [18, 'bus'], wait = Math.max(1, next.at - how[0] - now);
      return {
        over: `<div class="over-top"><span class="sub">1일차${night ? ' 밤' : ''}, 11월 27일 금</span><button class="icon-btn ${S.alert === 'on' && !night ? 'has-dot' : ''}" data-act="alert" aria-label="알림">${icon('bell')}</button></div>
          <div class="over-stack"><span class="label">다음 장소</span><span class="place">${esc(next.s.name.replace(' 도착', ''))}</span>
          <span class="count"><span class="big">${wait}분</span><span>뒤에 출발해요</span></span>
          <span class="glass">${icon(how[1])}${prev ? esc(prev.s.name.replace(' 도착', '').replace(' 점심', '')) + '에서 ' : ''}${how[1] === 'train' ? '지하철' : '버스'}, ${how[0]}분</span>
          ${night ? '<span class="lead" style="opacity:.8">광안대교 불빛은 20:00에 켜져요</span>' : ''}</div>`,
        sheet: `<div class="sec"><h3 style="font-size:20px">오늘 일정</h3><span class="muted" style="font-size:15px">${rows.length}곳 중 ${cur}곳 다녀왔어요</span></div>
          <div class="tl">${rows.map((r, i) => `<div class="tl-row ${i < cur ? 'is-done' : i === cur ? 'is-now' : ''}"><span class="tl-time">${hm(r.at)}</span><i class="tl-dot">${i < cur ? icon('check') : ''}</i>
            <div class="tl-body"><div><b>${esc(r.s.name)}</b><span>${esc(r.s.note)}</span></div>${i === cur ? (r.s.photo ? `<img src="${r.s.photo}" alt="">` : `<i class="ph">${icon('map-pin')}</i>`) : ''}</div></div>`).join('')}</div>`,
      };
    },
    course() { // 빠른 코스 수정
      const { rows } = plan(S.order.filter((id) => true));
      const all = S.order.map((id) => stopsById[id]);
      let rowsHtml = '';
      all.forEach((s, i) => {
        const r = rows.find((x) => x.s.id === s.id), skip = S.skip.has(s.id);
        rowsHtml += `<div class="stop-wrap ${skip ? 'is-skip' : ''}" data-id="${s.id}"><div class="stop-acts"><button data-act="skip" data-id="${s.id}">${icon('skip-forward')}${skip ? '되살리기' : '건너뛰기'}</button><button class="is-acc" data-act="replace" data-id="${s.id}"${D.alts[s.id] ? '' : ' disabled style="opacity:.4"'}>${icon('arrows-clockwise')}바꾸기</button></div>
          <div class="stop"><span class="grip" aria-label="길게 눌러 옮기기">${icon('dots-six-vertical')}</span>${s.photo ? `<img src="${s.photo}" alt="">` : `<i class="ph">${icon('map-pin')}</i>`}<div><b><em>${r ? hm(r.at) : '--:--'}</em>${esc(s.name)}</b><span>${skip ? '건너뛰어요' : esc(s.note)}</span></div></div></div>`;
        const nx = all[i + 1];
        if (nx && r && r.next && !skip) rowsHtml += `<div class="move">${icon(r.next[1])}${r.next[1] === 'train' ? '지하철' : '버스'} ${r.next[0]}분</div>`;
        else if (nx) rowsHtml += '<div class="move"></div>';
      });
      return {
        over: `<h1 style="margin-top:2px">코스 고치기</h1><p class="lead" style="margin:2px 0 0">길게 눌러 옮기고, 옆으로 밀어 건너뛰어요</p>
          <div class="days">${['1일차 금', '2일차 토', '3일차 일'].map((d, i) => `<button class="${i ? '' : 'is-on'}" data-act="day" data-i="${i}">${d}</button>`).join('')}</div>`,
        sheet: `<div class="edit" id="edit">${rowsHtml}</div>`,
      };
    },
    crew() { // 동행: 변경 제안과 찬성
      const ppl = ['me', 'ji', 'min', 'ha'];
      return {
        over: `<h1 style="margin-top:2px">동행</h1><p class="lead" style="margin:2px 0 0">가을 부산, 나 포함 ${ppl.length}명</p>
          <div class="people">${ppl.map((p) => av(p, 's36')).join('')}<button class="glass" data-act="invite">${icon('user-plus')}초대</button></div>`,
        sheet: `${pinBar()}<div class="chat" id="chat">${S.chat.map((m, i) => msgHtml(m, i)).join('')}</div>`,
      };
    },
    money() { // 지출 빠른 기록
      const n = S.amount ? +S.amount : 0, per = Math.round(n / S.spent.people / 100) * 100;
      return {
        over: `<span class="label" style="opacity:.85">지금까지 쓴 돈</span><div class="place" style="margin-top:2px">${manWon(S.spent.total)}</div><p class="lead" style="margin:2px 0 0">1인 ${manWon(Math.round(S.spent.total / S.spent.people / 100) * 100)}</p>
          <button class="close" data-act="clear" aria-label="지우기">${icon('x')}</button>`,
        sheet: `<span class="muted" style="font-size:16px;font-weight:500">얼마 썼어요?</span><div class="amt ${n ? '' : 'is-empty'}">${n ? n.toLocaleString('ko-KR') : '0'}원</div>
          <div class="split">${n ? `${S.spent.people}명이 나눠서 1인 ${per.toLocaleString('ko-KR')}원` : '숫자판으로 금액을 넣어요'}</div>
          <div class="field"><span>어디에 썼어요?</span><div class="chips">${['식비', '교통', '입장료', '숙소', '기타'].map((c) => `<button class="chip ${S.cat === c ? 'is-on' : ''}" data-act="cat" data-v="${c}">${c}</button>`).join('')}</div></div>
          <div class="field"><span>누가 냈어요?</span><div class="chips">${['me', 'ji', 'min'].map((p) => `<button class="chip has-av ${S.payer === p ? 'is-on' : ''}" data-act="payer" data-v="${p}">${av(p, 's24')}${p === 'me' ? '내가 냈어요' : D.people[p].name}</button>`).join('')}</div></div>
          <div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => `<button class="key" data-act="key" data-v="${k}" aria-label="${k === 'del' ? '지우기' : k}">${k === 'del' ? icon('backspace') : k}</button>`).join('')}</div>
          <button class="btn" data-act="record"${n ? '' : ' disabled'}>기록하기</button>`,
      };
    },
  };
  // ---------- 동행 채팅 ----------
  const nm = (id) => (id === 'me' ? '나' : D.people[id].full || D.people[id].name);
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? a : b); }; // 이/가, 은/는
  function pinBar() {
    const p = S.props.find((x) => !x.mine && !isStale(x)); if (!p) return '';
    return `<button class="chat-pin" data-act="pin" data-id="${p.id}">${icon('list-checks')}<b>찬성을 기다려요</b><span>${nm(p.by)}의 순서 바꾸기</span>${icon('caret-right')}</button>`;
  }
  const isStale = (p) => p.swap && !p.swap.every((id) => S.order.includes(id) && !S.skip.has(id));
  const groupable = (m) => m && ['msg', 'exp', 'place', 'vote', 'prop'].includes(m.t);
  function msgHtml(m, i, isNew) {
    if (m.t === 'day') return `<p class="c-day">${esc(m.text)}</p>`;
    if (m.t === 'sys') return `<p class="c-sys${isNew ? ' is-new' : ''}"><span>${icon(m.icon || 'check')}${esc(m.text)}</span></p>`;
    const inner = msgInner(m), prev = S.chat[i - 1], cont = groupable(prev) && prev.by === m.by;
    if (m.by === 'me') return `<div class="c-me${isNew ? ' is-new' : ''}" data-i="${i}">${inner}</div>`;
    return `<div class="c-row${cont ? ' is-cont' : ''}${isNew ? ' is-new' : ''}" data-i="${i}">${cont ? '<i class="c-sp"></i>' : av(m.by, 's28')}<div class="c-col">${cont ? '' : `<span class="c-name">${nm(m.by)}</span>`}${inner}</div></div>`;
  }
  function msgInner(m) {
    const me = m.by === 'me';
    if (m.t === 'msg') return `<div class="bub${me ? ' is-me' : ''}">${m.quote ? `<span class="c-quote">${icon('arrow-bend-up-left')}${esc(m.quote)}</span>` : ''}${esc(m.text)}</div>`;
    if (m.t === 'exp') { const per = Math.round(m.amount / S.spent.people / 100) * 100; return `<div class="c-card c-exp"><i>${icon('wallet')}</i><div><b>${esc(m.title)}</b><span>${won(m.amount)}, 1인 ${won(per)}</span></div></div>`; }
    if (m.t === 'place') { const st = stopsById[m.stop]; return `<div class="c-card c-place">${st.photo ? `<img src="${st.photo}" alt="">` : `<i class="ph">${icon('map-pin')}</i>`}<div><b>${esc(st.name)}</b><span>${esc(st.note)}</span></div></div>`; }
    if (m.t === 'vote') return `<div class="c-card c-vote" data-vote="${m.id}"><b>${esc(m.q)}</b>${m.options.map((o, k) => `<button class="c-opt${o.votes.includes('me') ? ' is-on' : ''}" data-act="vote-pick" data-id="${m.id}" data-i="${k}"><span>${esc(o.name)}</span><em>${o.votes.map((v) => av(v, 's24')).join('')}${o.votes.length}표</em></button>`).join('')}</div>`;
    if (m.t === 'prop') return chatProp(m.pid, m.by);
    return '';
  }
  function chatProp(pid, by) {
    const p = S.props.find((x) => x.id === pid);
    if (!p) return `<div class="c-card c-done">${icon('check')}<span>${by === 'me' ? '코스 고치기, 모두 찬성해서 정해졌어요' : '순서 바꾸기, 모두 찬성해서 바뀌었어요'}</span></div>`;
    const stale = isStale(p), swapped = p.swap && !stale ? swapOrder(S.order, p.swap) : null;
    let lines = '';
    if (swapped) { const a = plan(), b = plan(swapped); lines = p.swap.map((id) => { const x = a.rows.find((r) => r.s.id === id), y = b.rows.find((r) => r.s.id === id); return x && y ? `<div><span>${esc(x.s.name)}</span><em>${hm(x.at)} > ${hm(y.at)}</em></div>` : ''; }).join(''); }
    const yes = p.yes.map(nm).join(', '), wait = p.wait.map(nm).join(', ');
    return `<div class="c-card c-prop${S.reply === p.id ? ' is-quoted' : ''}" data-pid="${p.id}"><span class="c-sub">${p.mine ? '코스를 고치자고 했어요' : '순서를 바꾸자고 했어요'}</span>
      ${stale ? '<span class="c-sub">그사이 코스가 바뀌어서 다시 맞춰야 해요</span>' : lines ? `<div class="c-lines">${lines}</div>` : ''}
      <span class="c-sub">${yes ? yes + ' 찬성' : '아직 찬성 없음'}${wait ? ', ' + wait + ' 기다리는 중' : ''}</span>
      ${p.mine ? '' : `<div class="prop-btns"><button data-act="no" data-id="${p.id}">다른 의견</button><button class="is-acc" data-act="yes" data-id="${p.id}"${stale || p.yes.includes('me') ? ' disabled' : ''}>${icon('check')}${p.yes.includes('me') ? '찬성했어요' : '찬성'}</button></div>`}</div>`;
  }
  function chatEl() { return S.tab === 'crew' ? sheet.querySelector('#chat') : null; }
  function toBottom(smooth = true) { requestAnimationFrame(() => sheet.scrollTo({ top: sheet.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' })); }
  function say(m) { // 대화에 한 줄 더함 (동행 탭이 열려 있으면 그 줄만 튕기며 나타남)
    S.chat.push(m); persist(); const c = chatEl(); if (!c) return;
    c.insertAdjacentHTML('beforeend', msgHtml(m, S.chat.length - 1, true)); toBottom();
  }
  function refreshChat() { const c = chatEl(); if (!c) return; c.innerHTML = S.chat.map((m, i) => msgHtml(m, i)).join(''); const pb = sheet.querySelector('.chat-pin'), np = pinBar(); if (pb && !np) pb.remove(); else if (!pb && np) sheet.insertAdjacentHTML('afterbegin', np); }
  // 답장 연출: 잠깐 뒤 '입력 중'이 뜨고, 글자 수에 맞춰 기다렸다가 답이 옴. 차례로 이어지도록 줄을 세움
  let queue = Promise.resolve();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function bot(by, text, after) {
    queue = queue.then(async () => {
      await wait(reduce ? 200 : 650);
      const c = chatEl(); let tp = null;
      if (c) { c.insertAdjacentHTML('beforeend', `<div class="c-row is-typing is-new">${av(by, 's28')}<div class="c-col"><div class="bub c-dots" aria-label="${josa(nm(by), '이', '가')} 입력 중"><i></i><i></i><i></i></div><span class="c-name">${josa(nm(by), '이', '가')} 입력 중</span></div></div>`); tp = c.lastElementChild; toBottom(); }
      await wait(reduce ? 300 : Math.min(2300, 900 + text.length * 55));
      if (tp) { tp.classList.add('is-out'); await wait(140); tp.remove(); }
      if (text) say({ t: 'msg', by, text });
      if (after) after();
    });
  }
  function replyTo(text) {
    const r = D.replies.find(([re]) => re.test(text));
    if (r) return bot(r[1], r[2]);
    const [by, t] = D.chatty[(S.chat.length + text.length) % D.chatty.length]; bot(by, t);
  }
  let demoDone = false;
  function chatDemo() { if (demoDone || params.has('nodemo')) return; demoDone = true; bot('min', '케이블카는 낮에 타야 바다가 잘 보여'); }
  function send(text) {
    text = text.trim(); if (!text) return;
    const q = S.reply ? S.props.find((x) => x.id === S.reply) : null;
    say({ t: 'msg', by: 'me', text, quote: q ? `${nm(q.by)}의 제안에 답글` : '' });
    S.reply = null; S.tray = false; renderComposer(); refreshQuoted();
    if (q) bot(q.by, /비|우산/.test(text) ? '그럼 흰여울 먼저 가고, 케이블카는 해 질 때 타자' : '알겠어, 그럼 그대로 갈게');
    else replyTo(text);
  }
  function refreshQuoted() { sheet.querySelectorAll('.c-prop').forEach((c) => c.classList.toggle('is-quoted', c.dataset.pid === S.reply)); }
  function renderComposer() {
    const q = S.reply ? S.props.find((x) => x.id === S.reply) : null, keep = composer.querySelector('#msg'), val = keep ? keep.value : '';
    composer.innerHTML = `${S.tray ? `<div class="tray" role="menu">${[['map-pin', '장소 보내기', '코스나 지도에서 골라요', 'tray-place'], ['list-checks', '투표 만들기', '후보 2~3곳, 마감 시간', 'tray-vote'], ['wallet', '지출 나누기', '금액과 낸 사람만', 'tray-money'], ['clock', '내 도착 예정', '다음 장소까지 남은 시간', 'tray-eta']].map(([ic, a, b, act]) => `<button role="menuitem" data-act="${act}"><i>${icon(ic)}</i><b>${a}</b><span>${b}</span></button>`).join('')}</div>` : ''}
      ${q ? `<div class="c-quoting">${icon('arrow-bend-up-left')}<div><b>${nm(q.by)}의 제안에 답글</b><span>순서 바꾸기</span></div><button data-act="reply-close" aria-label="답글 그만두기">${icon('x')}</button></div>` : !S.tray ? `<div class="qr">${['좋아요', '10분 늦어요', '먼저 가 있을게요'].map((t) => `<button class="chip" data-act="qr" data-v="${t}">${t}</button>`).join('')}</div>` : ''}
      <form class="cbar" data-act="none"><button type="button" class="plus${S.tray ? ' is-on' : ''}" data-act="plus" aria-label="빠른 동작" aria-expanded="${S.tray}">${icon('plus')}</button>
        <label class="inp"><input id="msg" type="text" enterkeyhint="send" autocomplete="off" placeholder="${q ? '답글 보내기' : '메시지 보내기'}" aria-label="메시지"><button type="submit" class="send" aria-label="보내기"${val.trim() ? '' : ' disabled'}>${icon('paper-plane-right')}</button></label></form>`;
    const inp = composer.querySelector('#msg'); inp.value = val;
  }
  composer.addEventListener('submit', (e) => { e.preventDefault(); const i = composer.querySelector('#msg'); const v = i.value; i.value = ''; send(v); composer.querySelector('.send').disabled = true; i.focus(); });
  composer.addEventListener('input', (e) => { if (e.target.id === 'msg') composer.querySelector('.send').disabled = !e.target.value.trim(); });
  composer.addEventListener('focusin', (e) => { if (e.target.id === 'msg') { app.classList.add('is-typing'); if (S.tray) { S.tray = false; renderComposer(); composer.querySelector('#msg').focus(); } } });
  composer.addEventListener('focusout', () => setTimeout(() => { if (!composer.contains(document.activeElement)) app.classList.remove('is-typing'); }, 120));

  function propCard(p) {
    const stale = p.swap && !p.swap.every((id) => S.order.includes(id) && !S.skip.has(id)); // 그사이 코스가 바뀌어 맞지 않는 제안
    const swapped = p.swap && !stale ? swapOrder(S.order, p.swap) : null;
    let lines = '', eff = stale ? '그사이 코스가 바뀌어서 이 제안은 다시 맞춰야 해요' : p.effect || '';
    if (swapped) {
      const a = plan(), b = plan(swapped);
      lines = p.swap.map((id) => { const x = a.rows.find((r) => r.s.id === id), y = b.rows.find((r) => r.s.id === id); return x && y ? `<div><span>${esc(x.s.name)}</span><em>${hm(x.at)} > ${hm(y.at)}</em></div>` : ''; }).join('');
      const d = a.move - b.move; eff = (d > 0 ? `이동이 ${d}분 줄고, ` : d < 0 ? `이동이 ${-d}분 늘고, ` : '') + eff;
    }
    const yes = p.yes.map((id) => D.people[id].name).join(', '), wait = p.wait.map((id) => D.people[id].full || D.people[id].name).join(', ');
    return `<div class="prop ${p.mine ? 'is-mine' : ''}" data-id="${p.id}"><div class="prop-who">${av(p.by)}<div><b>${esc(p.text)}</b><span>${esc(p.when)}</span></div></div>
      ${lines ? `<div class="prop-lines">${lines}</div>` : ''}${eff ? `<span class="muted" style="font-size:15px">${esc(eff)}</span>` : ''}
      <div class="prop-votes">${p.yes.map((id) => av(id, 's24')).join('')}<span>${yes ? yes + ' 찬성' : '아직 찬성 없음'}${wait ? ', ' + wait + ' 기다리는 중' : ''}</span></div>
      <div class="prop-btns"><button data-act="no" data-id="${p.id}">다른 의견</button><button class="is-acc" data-act="yes" data-id="${p.id}"${stale ? ' disabled style="opacity:.4"' : ''}>${icon('check')}찬성</button></div></div>`;
  }
  const swapOrder = (order, [a, b]) => { const o = order.slice(), i = o.indexOf(a), j = o.indexOf(b); if (i < 0 || j < 0) return o; [o[i], o[j]] = [o[j], o[i]]; return o; };
  function updateAmount(up) { // 숫자판: 금액과 나눔만 바꾸고 숫자가 톡 올라옴
    const n = S.amount ? +S.amount : 0, el = sheet.querySelector('.amt'), sp = sheet.querySelector('.split'), bt = sheet.querySelector('[data-act="record"]');
    if (!el) return render();
    el.textContent = (n ? n.toLocaleString('ko-KR') : '0') + '원'; el.classList.toggle('is-empty', !n);
    sp.textContent = n ? `${S.spent.people}명이 나눠서 1인 ${(Math.round(n / S.spent.people / 100) * 100).toLocaleString('ko-KR')}원` : '숫자판으로 금액을 넣어요';
    bt.disabled = !n;
    if (!reduce && el.animate) el.animate(up ? [{ transform: 'translateY(6px) scale(0.98)', opacity: 0.55 }, { transform: 'none', opacity: 1 }] : [{ transform: 'translateX(-4px)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
  }
  function countUp(el, a, b) { // 합계가 새 값까지 빠르게 올라감
    if (!el || reduce) return; const t0 = performance.now(), d = 700;
    const step = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = manWon(Math.round((a + (b - a) * e) / 100) * 100); if (k < 1) requestAnimationFrame(step); else el.textContent = manWon(b); };
    requestAnimationFrame(step);
  }
  function renderSum() {
    const a = plan(S.base.filter((id) => stopsById[id]), new Set()), b = plan(), d = a.move - b.move, changed = S.order.join() !== S.base.join() || S.skip.size;
    sum.innerHTML = `<div><b>이동 ${dur(b.move)}${changed && d ? `, ${Math.abs(d)}분 ${d > 0 ? '줄어요' : '늘어요'}` : ''}</b><span>1인 예상 ${manWon(Math.round((b.cost + 21000) / 1000) * 1000)}</span></div><button class="pill" data-act="propose"${changed ? '' : ' disabled style="opacity:.45"'}>동행에게 제안</button>`;
  }

  // ---------- 아래 메뉴: 알약 하나가 고른 탭으로 미끄러짐 ----------
  const ind = $('.tab-ind');
  function tabs() {
    const btns = [...app.querySelectorAll('.tab')];
    btns.forEach((b) => { const on = b.dataset.tab === S.tab; b.classList.toggle('is-on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
    const on = btns.find((b) => b.classList.contains('is-on'));
    requestAnimationFrame(() => {
      const x = on.offsetLeft, w = on.offsetWidth, p = tabs.prev;
      ind.style.width = w + 'px'; ind.style.transform = `translateX(${x}px)`;
      if (p && p.x !== x && !reduce && ind.animate) {
        const l = Math.min(p.x, x), r = Math.max(p.x + p.w, x + w);
        ind.animate([{ transform: `translateX(${p.x}px)`, width: p.w + 'px' }, { transform: `translateX(${l}px)`, width: (r - l) * 0.86 + 'px', offset: 0.42 }, { transform: `translateX(${x}px)`, width: w + 'px' }],
          { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }
      tabs.prev = { x, w };
    });
  }

  // ---------- 알림 ----------
  let toastT = 0;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200); }

  // ---------- 계획이 깨질 때: 대체 장소 두 곳과 30초 투표 ----------
  let timerT = 0, left = 0, pick = 0;
  function openAlert() {
    S.alert = 'open'; app.classList.add('is-rain'); left = D.rain.seconds; pick = 0;
    const body = modal.querySelector('.modal-sheet');
    const draw = () => {
      body.innerHTML = `<i class="handle"></i><div class="alert-head"><i>${icon('cloud-rain')}</i><div><b>${esc(D.rain.title)}</b><span>${esc(D.rain.why)}</span></div></div>
        <div class="sec" style="margin:4px 0 0"><h3>대신 갈 곳</h3><span class="timer">${icon('hourglass-medium')}투표 0:${String(left).padStart(2, '0')} 남음</span></div>
        ${D.rain.options.map((o, i) => `<button class="opt ${pick === i ? 'is-on' : ''}" data-act="opt" data-i="${i}"><img src="${o.photo}" alt=""><div><b>${esc(o.name)}</b><span>${esc(o.sub)}</span><span class="votes">${(pick === i ? ['me', ...o.votes.filter((v) => v !== 'me')] : o.votes.filter((v) => v !== 'me')).map((v) => av(v, 's24')).join('') || '아직 아무도 안 골랐어요'}</span></div><i class="ck">${icon('check')}</i></button>`).join('')}
        <span class="muted" style="font-size:15px">3명 중 2명이 골랐어요. 끝나면 많이 고른 곳으로 바뀌어요</span>
        <div class="modal-btns"><button class="btn is-soft" data-act="keep">그대로 가기</button><button class="btn" data-act="apply-rain">지금 바로 바꾸기</button></div>`;
    };
    draw(); modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
    clearInterval(timerT); timerT = setInterval(() => { left = Math.max(0, left - 1); const t = body.querySelector('.timer'); if (t) t.innerHTML = `${icon('hourglass-medium')}투표 0:${String(left).padStart(2, '0')} 남음`; if (!left) { clearInterval(timerT); applyRain(); } }, 1000);
    modal._draw = draw; render();
  }
  function closeModal() { clearInterval(timerT); modal.classList.remove('is-open', 'is-region'); modal.setAttribute('aria-hidden', 'true'); app.classList.remove('is-rain'); if (S.alert === 'open') S.alert = 'on'; render(); }
  function applyRain() {
    const o = D.rain.options[pick], i = S.order.indexOf(D.rain.target);
    if (i >= 0) S.order[i] = o.id;
    S.alert = 'done'; closeModal(); S.alert = 'done'; persist(); render();
    toast(`흰여울문화마을 대신 ${o.name}(으)로 바꿨어요`);
  }
  function openReplace(id) {
    const body = modal.querySelector('.modal-sheet'), list = D.alts[id] || [];
    body.innerHTML = `<i class="handle"></i><h3>${esc(stopsById[id].name)} 대신</h3>${list.map((o) => `<button class="opt" data-act="pick-alt" data-from="${id}" data-to="${o.id}"><img src="${o.photo}" alt=""><div><b>${esc(o.name)}</b><span>${esc(o.note)}</span></div><i class="ck">${icon('check')}</i></button>`).join('')}
      <div class="modal-btns"><button class="btn is-soft" data-act="modal-close">닫기</button></div>`;
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); modal._draw = null;
  }

  // ---------- 대략 코스: 지역 고르기, 날짜와 사람 ----------
  const F = { mode: 'domestic', a: null, b: null, d1: null, d2: null, who: new Set(['me', 'ji', 'min']), step: 1, z: 1, tx: 0, ty: 0 };
  // 최근 선택한 곳: 이번에 고른 출발과 도착 + 내 코스 초안의 경로
  let recentMem = []; // 새로고침하면 비워짐
  function recents() {
    const saved = recentMem;
    const pts = D.regions[F.mode].pts, seen = new Set(), out = [];
    for (const [a, b] of [...saved.filter((r) => r[0] === F.mode).map((r) => [r[1], r[2]]), ...S.drafts.map((d) => d.route || [])]) {
      if (!a || !b || !pts[a] || !pts[b] || seen.has(a + '>' + b)) continue; seen.add(a + '>' + b); out.push([a, b]);
    }
    return out.slice(0, 4);
  }
  function remember() { recentMem = [[F.mode, F.a, F.b], ...recentMem.filter((r) => !(r[0] === F.mode && r[1] === F.a && r[2] === F.b))].slice(0, 8); }
  function openFlow() {
    Object.assign(F, { mode: 'domestic', a: null, b: null, d1: null, d2: null, step: 1, z: 1, tx: 0, ty: 0 });
    if (params.has('flow')) Object.assign(F, { a: '경기도', b: '부산' });
    flow.classList.add('is-open'); flow.setAttribute('aria-hidden', 'false'); drawFlow();
  }
  function closeFlow() { flow.classList.remove('is-open'); flow.setAttribute('aria-hidden', 'true'); }

  // 지도 확대: 두 손가락 벌리기, 휠, + - 버튼. 확대하면 끌어서 옮김. 핀과 이름표는 같은 크기로 남음
  const ZMAX = 3.5, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mapEls = () => { const m = flow.querySelector('.map'); return [m, m && m.querySelector('.map-in')]; };
  function applyZoom(anim) {
    const [m, inn] = mapEls(); if (!inn) return;
    const mx = Math.max(0, (F.z * inn.offsetWidth - m.clientWidth) / 2), my = Math.max(0, (F.z * inn.offsetHeight - m.clientHeight) / 2);
    F.tx = clamp(F.tx, -mx, mx); F.ty = clamp(F.ty, -my, my);
    inn.classList.toggle('is-anim', !!anim);
    inn.style.setProperty('--z', F.z.toFixed(4)); inn.style.setProperty('--tx', F.tx.toFixed(1) + 'px'); inn.style.setProperty('--ty', F.ty.toFixed(1) + 'px');
    m.classList.toggle('is-zoomed', F.z > 1.01);
    m.querySelector('[data-v="in"]').disabled = F.z >= ZMAX - 0.01; m.querySelector('[data-v="out"]').disabled = F.z <= 1.01;
  }
  // 화면의 점 p(지도 가운데 기준)를 고정한 채 배율을 z로
  function zoomAt(z, px, py, anim) { const z0 = F.z; z = clamp(z, 1, ZMAX); F.tx = px - (px - F.tx) * (z / z0); F.ty = py - (py - F.ty) * (z / z0); F.z = z; applyZoom(anim); }
  // 화면의 점 p를 가운데로 데려오며 배율을 z로
  function zoomTo(z, px, py) { const z0 = F.z; z = clamp(z, 1, ZMAX); F.tx = -(px - F.tx) * (z / z0); F.ty = -(py - F.ty) * (z / z0); F.z = z; applyZoom(true); }
  // 고른 핀(둘이면 가운데)의 화면 위치, 지도 가운데 기준
  function pinsCenter() {
    const [m] = mapEls(), pins = m ? [...m.querySelectorAll('.pin')] : []; if (!pins.length) return null;
    const r = m.getBoundingClientRect(); let x = 0, y = 0;
    pins.forEach((p) => { const q = p.getBoundingClientRect(); x += q.left + q.width / 2; y += q.bottom; });
    return [x / pins.length - r.left - r.width / 2, y / pins.length - r.top - r.height / 2];
  }
  function zoomBtn(v) {
    if (v === 'reset') { F.z = 1; F.tx = F.ty = 0; applyZoom(true); return; }
    const c = v === 'in' && F.z <= 1.01 ? pinsCenter() : null;
    if (c) zoomTo(F.z * 1.7, c[0], c[1]); else zoomAt(v === 'in' ? F.z * 1.7 : F.z / 1.7, 0, 0, true);
  }

  // 지역 고르기 창: 출발·도착 칸을 누르면 아래에서 올라옴
  function openRegionSheet(k) {
    const R = D.regions[F.mode], body = modal.querySelector('.modal-sheet');
    body.innerHTML = `<i class="handle"></i><div class="rs-head"><h3>${k === 'a' ? '어디서 출발해요?' : '어디로 가요?'}</h3>${k === 'b' && F.a ? `<span>${F.a}에서 출발</span>` : ''}</div>
      ${R.groups.map(([g, list]) => `<div class="rs-group"><span>${g}</span><div class="rs-grid">${list.map((n) => {
        const soon = R.open && !R.open.includes(n), same = k === 'b' && n === F.a, on = F[k] === n;
        return `<button class="rs-opt ${on ? 'is-on' : ''}" data-act="region-pick" data-k="${k}" data-v="${n}"${soon || same ? ' disabled' : ''}>${n}${on ? icon('check') : ''}</button>`;
      }).join('')}</div></div>`).join('')}
      <div class="modal-btns"><button class="btn is-soft" data-act="modal-close">닫기</button></div>`;
    modal._draw = null; modal.classList.add('is-open', 'is-region'); modal.setAttribute('aria-hidden', 'false');
  }
  function drawFlow() {
    const R = D.regions[F.mode], night = app.dataset.ui === 'night', [cx, cy, cw, ch] = R.crop;
    const pos = (n) => { const [x, y] = R.pts[n]; return [((x - cx) / cw) * 100, ((y - cy) / ch) * 100]; };
    const next = !F.a ? 'a' : !F.b ? 'b' : null;
    let pins = '', glow = '', route = '';
    // 이름표는 두 핀이 서로 반대쪽에: 왼쪽 핀은 왼쪽에, 오른쪽 핀은 오른쪽에 (하나만 있으면 화면 안쪽으로)
    const xa = F.a ? pos(F.a)[0] : 0, xb = F.b ? pos(F.b)[0] : 0;
    for (const [k, lab] of [['a', '출발'], ['b', '도착']]) {
      if (!F[k]) continue; const [x, y] = pos(F[k]);
      const left = F.a && F.b ? (k === 'a' ? xa <= xb : xb < xa) : x > 55;
      glow += `<i class="map-glow" style="left:${x}%;top:${y}%"></i>`;
      pins += `<div class="pin" style="left:${x}%;top:${y}%"><i></i><u></u></div><div class="pin-tag" style="${left ? `right:calc(${100 - x}% + 16px / var(--z, 1));transform-origin:100% 0` : `left:calc(${x}% + 16px / var(--z, 1));transform-origin:0 0`};top:calc(${y}% - 66px / var(--z, 1))"><span>${lab}</span><b>${F[k]}</b></div>`;
    }
    if (F.a && F.b) { const [x1, y1] = pos(F.a), [x2, y2] = pos(F.b); route = `<svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none"><path vector-effect="non-scaling-stroke" d="M${x1} ${y1 - 4}Q${(x1 + x2) / 2 + 14} ${Math.min(y1, y2) - 12} ${x2} ${y2 - 4}"/></svg>`; }
    const pts = Object.keys(R.pts).map((n) => { const [x, y] = pos(n), soon = R.open && !R.open.includes(n); return `<button class="map-pt ${soon ? 'is-soon' : ''} ${n === F.a || n === F.b ? 'is-sel' : ''}" style="left:${x}%;top:${y}%" data-act="region" data-v="${n}" aria-label="${n}"></button>`; }).join('');
    const days = F.d1 ? (F.d2 ? Math.round((F.d2 - F.d1) / 864e5) + 1 : 1) : 0, rec = recents();
    flow.innerHTML = `<div class="flow-head"><button data-act="${F.step === 1 ? 'flow-close' : 'flow-back'}" aria-label="뒤로">${icon('caret-left')}</button><b>대략 코스 만들기</b></div>
      <div class="flow-step" ${F.step === 1 ? '' : 'hidden'}>
        <div class="seg" role="tablist"><button class="${F.mode === 'domestic' ? 'is-on' : ''}" data-act="mode" data-v="domestic">국내</button><button class="${F.mode === 'overseas' ? 'is-on' : ''}" data-act="mode" data-v="overseas">해외</button></div>
        <p class="hint">${R.hint}</p>
        <div class="map ${F.z > 1.01 ? 'is-zoomed' : ''}"><div class="map-in" style="--z:${F.z};--tx:${F.tx}px;--ty:${F.ty}px"><img src="assets/${R.img}-${night ? 'night' : 'day'}.jpg" alt="" decoding="async">${glow}<div style="position:absolute;inset:0">${route}</div>${pts}${pins}</div>
          <div class="zoom"><button data-act="zoom" data-v="in" aria-label="지도 크게 보기"${F.z >= ZMAX - 0.01 ? ' disabled' : ''}>${icon('plus')}</button><button data-act="zoom" data-v="out" aria-label="지도 작게 보기"${F.z <= 1.01 ? ' disabled' : ''}>${icon('minus')}</button></div>
          <button class="zoom-reset" data-act="zoom" data-v="reset">전체 보기</button></div>
        <div class="flow-sheet"><div class="slots"><button class="slot ${next === 'a' ? 'is-next' : ''}" data-act="region-sheet" data-v="a" aria-haspopup="dialog"><span>출발</span><b class="${F.a ? '' : 'is-empty'}">${F.a || '골라요'}</b>${icon('caret-down')}</button>${icon('caret-right')}<button class="slot ${next === 'b' ? 'is-next' : ''}" data-act="region-sheet" data-v="b" aria-haspopup="dialog"><span>도착</span><b class="${F.b ? '' : 'is-empty'}">${F.b || '골라요'}</b>${icon('caret-down')}</button></div>
          ${rec.length ? `<div class="quick"><span>최근 선택한 곳</span><div class="chips">${rec.map(([a, b]) => `<button class="chip is-recent" data-act="recent" data-v="${a}|${b}">${icon('clock-counter-clockwise')}${a} > ${b}</button>`).join('')}</div></div>` : ''}
          <div class="quick"><span>요즘 많이 가는 곳</span><div class="chips">${R.quick.map(([t, r]) => `<button class="chip" data-act="quick" data-v="${r}">${t}</button>`).join('')}</div></div>
          <button class="btn" data-act="flow-next"${F.a && F.b ? '' : ' disabled'}>날짜와 사람 고르기</button></div></div>
      <div class="flow-step" ${F.step === 2 ? '' : 'hidden'}>
        <div class="route-big"><b>${F.a || ''} > ${F.b || ''}</b><span>${R.via(F.a)}</span></div>
        <div class="flow-sheet">${calendar()}<div class="cal-sum">${days ? `${days > 1 ? days - 1 + '박 ' : '당일, '}${days}일, ${fmtD(F.d1)}${F.d2 ? '부터 ' + fmtD(F.d2) + '까지' : ''}` : '가는 날과 오는 날을 차례로 눌러요'}</div>
          <h3 style="margin-top:6px">누구와 가요?</h3><div class="who">${['me', 'ji', 'min'].map((p) => `<button class="${F.who.has(p) ? '' : 'is-off'}" data-act="who" data-v="${p}" aria-pressed="${F.who.has(p)}" ${p === 'me' ? 'disabled' : ''}>${av(p, 's44')}</button>`).join('')}<button class="add" data-act="invite" aria-label="초대 링크 복사">${icon('user-plus')}</button></div>
          <span class="muted" style="font-size:15px">링크를 받은 사람은 앱 없이도 바로 들어와요</span>
          <div style="flex:1"></div><div class="note">저장하면 내 코스에 초안으로 들어가요<span>자세한 일정은 PC에서 이어서 짜요</span></div>
          <button class="btn" data-act="save-draft">초안으로 저장</button></div></div>`;
    const fm = flow.querySelector('.map'); if (fm && fm.offsetParent) fm.style.setProperty('--above', fm.offsetTop + 'px'); // 지도 칸 위(국내·해외, 안내 문구) 높이: 덮개가 제목까지 닿게
  }
  const fmtD = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}`;
  let calM = null;
  function calendar() {
    const today = new Date(new Date().toDateString()); if (!calM) calM = new Date(today.getFullYear(), today.getMonth(), 1);
    const y = calM.getFullYear(), m = calM.getMonth(), first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
    let cells = '일월화수목금토'.split('').map((w) => `<span class="wd">${w}</span>`).join('') + '<span></span>'.repeat(first);
    for (let d = 1; d <= n; d++) {
      const dt = new Date(y, m, d), t = +dt, a = F.d1 && t === +F.d1, b = F.d2 && t === +F.d2, inn = F.d1 && F.d2 && t >= +F.d1 && t <= +F.d2;
      cells += `<button class="${dt < today ? 'is-past' : ''} ${inn ? 'is-in' : ''} ${a && F.d2 ? 'is-a' : a ? 'is-a is-b' : ''} ${b ? 'is-b' : ''}" data-act="date" data-v="${t}"><span>${d}</span></button>`;
    }
    return `<div class="cal-head"><h3>언제 가요?</h3><div><button data-act="cal" data-v="-1" aria-label="이전 달">${icon('caret-left')}</button>${y}년 ${m + 1}월<button data-act="cal" data-v="1" aria-label="다음 달">${icon('caret-right')}</button></div></div><div class="cal">${cells}</div>`;
  }

  // ---------- 누르기 ----------
  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], .tab'); if (!t || t.disabled) return;
    if (t.classList.contains('tab')) { goTab(t.dataset.tab); return; }
    const a = t.dataset.act, v = t.dataset.v, id = t.dataset.id;
    if (Date.now() < blockClick) return;
    switch (a) {
      case 'tab': goTab(t.dataset.tab); break;
      case 'flow': openFlow(); break;
      case 'flow-close': closeFlow(); break;
      case 'flow-back': F.step = 1; drawFlow(); flow.querySelectorAll('.flow-step')[0].classList.add('is-back'); break;
      case 'mode': F.mode = v; F.a = F.b = null; F.z = 1; F.tx = F.ty = 0; drawFlow(); break;
      case 'region': {
        const R = D.regions[F.mode]; if (R.open && !R.open.includes(v)) { toast(`${v}은 곧 열려요. 지금은 일본까지 고를 수 있어요`); break; }
        if (!F.a || (F.a && F.b)) { F.a = v; F.b = null; } else if (v !== F.a) F.b = v; drawFlow(); break; }
      case 'region-sheet': openRegionSheet(v); break;
      case 'region-pick': {
        const k = t.dataset.k; F[k] = v; if (k === 'a' && F.b === v) F.b = null;
        closeModal(); drawFlow();
        if (F.z > 1.01) { const c = pinsCenter(); if (c) zoomTo(F.z, c[0], c[1]); }
        if (k === 'a' && !F.b) setTimeout(() => openRegionSheet('b'), 420); // 출발을 고르면 이어서 도착
        break; }
      case 'recent': { const [a, b] = v.split('|'); F.a = a; F.b = b; drawFlow(); break; }
      case 'zoom': zoomBtn(v); break;
      case 'quick': if (!F.a) F.a = F.mode === 'domestic' ? '경기도' : '한국'; F.b = v; drawFlow(); break;
      case 'flow-next': remember(); F.step = 2; drawFlow(); flow.querySelectorAll('.flow-step')[1].classList.add('is-in'); break;
      case 'cal': calM = new Date(calM.getFullYear(), calM.getMonth() + +v, 1); drawFlow(); break;
      case 'date': { const d = new Date(+v); if (!F.d1 || F.d2 || d < F.d1) { F.d1 = d; F.d2 = null; } else F.d2 = d; drawFlow(); const b = flow.querySelector(`.cal [data-v="${v}"]`); if (b) b.classList.add('pop'); break; }
      case 'who': F.who.has(v) ? F.who.delete(v) : F.who.add(v); drawFlow(); break;
      case 'save-draft': {
        const when = F.d1 ? fmtD(F.d1) + (F.d2 ? '부터' : '') : '날짜는 아직';
        S.drafts.unshift({ id: 'd' + Date.now(), title: `${F.b} 여행`, route: [F.a, F.b], when: `${when}, 자세한 일정은 PC에서`, draft: true });
        persist(); closeFlow(); S.tab = 'home'; S.trip = false; render(); toast('내 코스에 초안으로 저장했어요'); break; }
      case 'invite': (navigator.clipboard ? navigator.clipboard.writeText(location.origin + location.pathname + '?invite=busan').catch(() => {}) : 0); toast('초대 링크를 복사했어요'); break;
      case 'start-trip': S.trip = true; persist(); render(); toast('여행 중 화면으로 바꿨어요. 내 정보에서 되돌릴 수 있어요'); break;
      case 'me': S.trip = !S.trip; persist(); render(); toast(S.trip ? '여행 중 화면으로 바꿨어요' : '여행 전 화면으로 바꿨어요'); break;
      case 'draft': toast('자세한 일정은 PC에서 이어서 짜요'); break;
      case 'alert': if (S.alert === 'done' || app.dataset.ui === 'night') toast('새 알림이 없어요'); else openAlert(); break;
      case 'opt': pick = +t.dataset.i; modal._draw && modal._draw(); break;
      case 'keep': S.alert = 'done'; persist(); closeModal(); S.alert = 'done'; render(); toast('그대로 가요. 우산을 챙겨요'); break;
      case 'apply-rain': applyRain(); break;
      case 'modal-close': closeModal(); break;
      case 'skip': S.skip.has(id) ? S.skip.delete(id) : S.skip.add(id); S.swipe = null; persist(); flip(() => render()); break;
      case 'replace': openReplace(id); break;
      case 'pick-alt': { const i = S.order.indexOf(t.dataset.from); if (i >= 0) S.order[i] = t.dataset.to; persist(); closeModal(); toast(`${stopsById[t.dataset.to].name}(으)로 바꿨어요`); break; }
      case 'propose': {
        const np = { id: 'm' + Date.now(), by: 'me', mine: true, when: '방금', text: '내가 코스를 고치자고 했어요', yes: [], wait: ['ji', 'min'], effect: '' };
        S.props.unshift(np); S.base = S.order.slice(); persist(); render(); say({ t: 'prop', by: 'me', pid: np.id }); toast('동행에게 제안했어요. 동행 탭에서 답을 볼 수 있어요');
        const ok = (w) => () => { np.wait = np.wait.filter((x) => x !== w); np.yes.push(w); if (!np.wait.length) { S.props = S.props.filter((x) => x !== np); say({ t: 'sys', icon: 'check', text: '모두 찬성해서 코스가 정해졌어요' }); } persist(); refreshChat(); };
        bot('ji', '좋아, 바꾸자', ok('ji')); bot('min', '나도 찬성', ok('min')); break; }
      case 'yes': { const p = S.props.find((x) => x.id === id); if (!p || p.yes.includes('me')) break; p.yes.push('me'); persist(); refreshChat();
        say({ t: 'sys', icon: 'check', text: '내가 순서 바꾸기에 찬성했어요' });
        const finish = () => { if (p.wait.length) return; if (p.swap) S.order = swapOrder(S.order, p.swap); S.props = S.props.filter((x) => x !== p); S.decided.unshift('순서 바꾸기, 모두 찬성으로 정했어요'); persist(); refreshChat(); say({ t: 'sys', icon: 'check', text: '모두 찬성해서 순서를 바꿨어요' }); toast('모두 찬성해서 코스를 바꿨어요'); };
        if (!p.wait.length) finish();
        else p.wait.slice().forEach((w) => bot(w, '나도 찬성!', () => { p.wait = p.wait.filter((x) => x !== w); if (!p.yes.includes(w)) p.yes.push(w); persist(); refreshChat(); finish(); }));
        break; }
      case 'no': S.reply = id; S.tray = false; refreshQuoted(); renderComposer(); composer.querySelector('#msg').focus(); break;
      case 'reply-close': S.reply = null; refreshQuoted(); renderComposer(); break;
      case 'pin': { const c = sheet.querySelector(`.c-prop[data-pid="${id}"]`); if (c) { c.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); c.classList.remove('is-flash'); void c.offsetWidth; c.classList.add('is-flash'); } break; }
      case 'qr': send(v); break;
      case 'plus': S.tray = !S.tray; renderComposer(); break;
      case 'tray-place': { const r = plan().rows.find((x) => x.at >= nowMin()) || plan().rows[0]; S.tray = false; renderComposer(); say({ t: 'place', by: 'me', stop: r.s.id }); bot('min', '여기 사진 잘 나오더라'); break; }
      case 'tray-vote': { S.tray = false; renderComposer(); const m = { t: 'vote', by: 'me', id: 'v' + Date.now(), q: '저녁 어디서 먹을까?', options: [{ name: '광안리 조개구이', votes: ['me'] }, { name: '민락수변 회센터', votes: [] }] }; say(m);
        bot('ji', '조개구이 콜', () => { m.options[0].votes.push('ji'); persist(); refreshChat(); }); bot('min', '난 회센터!', () => { m.options[1].votes.push('min'); persist(); refreshChat(); }); break; }
      case 'tray-money': S.tray = false; goTab('money'); break;
      case 'tray-eta': { const r = plan().rows.find((x) => x.at >= nowMin()) || plan().rows[0]; S.tray = false; renderComposer(); say({ t: 'msg', by: 'me', text: `${r.s.name.replace(' 도착', '')}에 ${hm(r.at)}쯤 도착해요` }); bot('ji', '거기서 보자'); break; }
      case 'vote-pick': { const m = S.chat.find((x) => x.id === id); if (!m) break; m.options.forEach((o, k) => { o.votes = o.votes.filter((x) => x !== 'me'); if (k === +t.dataset.i) o.votes.push('me'); }); persist(); refreshChat(); break; }
      case 'day': if (+t.dataset.i) toast('2일차부터는 예시가 아직 없어요'); break;
      case 'cat': case 'payer': S[a] = v; t.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-on', c === t)); break;
      case 'key': { const before = S.amount; if (v === 'del') S.amount = S.amount.slice(0, -1); else if (S.amount.length < 8 && !(S.amount === '' && v.startsWith('0'))) S.amount += v; if (S.amount !== before) updateAmount(v !== 'del'); break; }
      case 'clear': S.amount = ''; render(); break;
      case 'record': { const n = +S.amount, from = S.spent.total; S.spent.total += n; S.amount = ''; persist(); render(); countUp(over.querySelector('.place'), from, S.spent.total); S.chat.push({ t: 'exp', by: S.payer, title: S.cat, amount: n }); persist(); toast(`${S.cat} ${won(n)}을 기록했어요`); break; }
    }
  });

  // 대략 코스 지도: 한 손가락은 옮기기(확대했을 때), 두 손가락은 벌려 확대, 휠도 확대
  const G = { pts: new Map() }; let noTap = 0;
  const outside = (m, e) => e.clientY < m.getBoundingClientRect().top; // 지도 칸 위로 넘친 배경 부분
  const mapPoint = (m, x, y) => { const r = m.getBoundingClientRect(); return [x - r.left - r.width / 2, y - r.top - r.height / 2]; };
  flow.addEventListener('pointerdown', (e) => {
    const m = e.target.closest('.map'); if (!m || e.target.closest('.zoom, .zoom-reset') || outside(m, e)) return;
    G.m = m; G.pts.set(e.pointerId, [e.clientX, e.clientY]); G.moved = false; startGesture();
  });
  function startGesture() {
    const v = [...G.pts.values()];
    if (v.length === 1) G.one = { x: v[0][0], y: v[0][1], tx: F.tx, ty: F.ty };
    if (v.length >= 2) { const mid = mapPoint(G.m, (v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2); G.two = { d: Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]) || 1, z: F.z, q: [(mid[0] - F.tx) / F.z, (mid[1] - F.ty) / F.z] }; }
  }
  addEventListener('pointermove', (e) => {
    if (!G.pts.has(e.pointerId)) return; G.pts.set(e.pointerId, [e.clientX, e.clientY]);
    const v = [...G.pts.values()];
    if (v.length >= 2) {
      const d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]), mid = mapPoint(G.m, (v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2);
      F.z = clamp(G.two.z * d / G.two.d, 1, ZMAX); F.tx = mid[0] - F.z * G.two.q[0]; F.ty = mid[1] - F.z * G.two.q[1]; G.moved = true; applyZoom(false);
    } else if (G.one) {
      const dx = e.clientX - G.one.x, dy = e.clientY - G.one.y;
      if (!G.moved && Math.hypot(dx, dy) > 6) G.moved = true;
      if (G.moved) { F.tx = G.one.tx + dx; F.ty = G.one.ty + dy; applyZoom(false); }
    }
  });
  const endGesture = (e) => { if (!G.pts.delete(e.pointerId)) return; if (G.moved) noTap = Date.now() + 250; G.one = null; if (G.pts.size) startGesture(); };
  addEventListener('pointerup', endGesture); addEventListener('pointercancel', endGesture);
  flow.addEventListener('wheel', (e) => { const m = e.target.closest('.map'); if (!m || outside(m, e)) return; e.preventDefault(); const [x, y] = mapPoint(m, e.clientX, e.clientY); zoomAt(F.z * Math.exp(-e.deltaY * 0.0022), x, y, false); }, { passive: false });

  // 대략 코스 지도: 누른 곳과 가장 가까운 지역을 고름 (점이 촘촘해서 손가락으로 하나씩 누르기 어려움)
  flow.addEventListener('click', (e) => {
    if (Date.now() < noTap) return; // 끌거나 벌린 직후에는 누름으로 치지 않음
    const box = e.target.closest('.map-in'); if (!box || e.target.closest('[data-act]') || outside(box.parentElement, e)) return;
    const r = box.getBoundingClientRect(); let best = null, bd = 1e9;
    box.querySelectorAll('.map-pt').forEach((p) => { const q = p.getBoundingClientRect(), d = Math.hypot(q.left + q.width / 2 - e.clientX, q.top + q.height / 2 - e.clientY); if (d < bd) { bd = d; best = p; } });
    if (best && bd < Math.max(48, r.width * 0.12)) best.click();
  });

  // ---------- 코스 고치기: 길게 눌러 옮기기, 옆으로 밀어 건너뛰기·바꾸기 ----------
  let drag = null, blockClick = 0;
  sheet.addEventListener('pointerdown', (e) => {
    const wrap = e.target.closest('.stop-wrap'); if (!wrap || e.target.closest('.stop-acts')) return;
    const stop = wrap.querySelector('.stop');
    drag = { wrap, stop, id: wrap.dataset.id, x0: e.clientX, y0: e.clientY, mode: null, pid: e.pointerId, open: S.swipe === wrap.dataset.id };
    const grip = !!e.target.closest('.grip');
    drag.timer = setTimeout(() => { if (drag && !drag.mode) startLift(); }, grip ? 120 : 380);
  });
  function startLift() {
    const d = drag; d.mode = 'lift'; closeSwipe();
    try { d.stop.setPointerCapture(d.pid); } catch (e) { /* 이미 끝난 손가락 */ }
    const wraps = [...sheet.querySelectorAll('.stop-wrap')], box = sheet.querySelector('#edit').getBoundingClientRect();
    d.slots = wraps.map((w) => w.getBoundingClientRect().top - box.top); d.wraps = wraps; d.idx = wraps.indexOf(d.wrap); d.to = d.idx;
    d.wrap.classList.add('is-lift'); if (navigator.vibrate) navigator.vibrate(8);
  }
  sheet.addEventListener('pointermove', (e) => {
    const d = drag; if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.mode) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { clearTimeout(d.timer); d.mode = 'swipe'; try { d.stop.setPointerCapture(d.pid); } catch (er) { /* 무시 */ } }
      else if (Math.abs(dy) > 10) { clearTimeout(d.timer); drag = null; return; }
    }
    if (d.mode === 'swipe') { d.wrap.classList.add('is-swipe'); const base = d.open ? -176 : 0; let x = base + dx; if (x < -176) x = -176 - Math.pow(-176 - x, 0.8); if (x > 0) x = Math.pow(x, 0.7); d.stop.style.transition = 'none'; d.stop.style.transform = `translateX(${x}px)`; d.vx = dx - (d.lx || 0); d.lx = dx; }
    if (d.mode === 'lift') {
      e.preventDefault();
      d.wrap.style.transform = `translateY(${dy}px)`;
      const y = d.slots[d.idx] + dy; let to = d.idx;
      d.slots.forEach((s, i) => { if (i > d.idx && y > s - 36) to = i; if (i < d.idx && y < s + 36 && to === d.idx) to = i; });
      if (to !== d.to) { d.to = to; d.wraps.forEach((w, i) => { if (w === d.wrap) return; let shift = 0; if (d.idx < to && i > d.idx && i <= to) shift = -1; if (d.idx > to && i >= to && i < d.idx) shift = 1; w.style.transform = shift ? `translateY(${shift * (d.slots[1] - d.slots[0])}px)` : ''; }); }
    }
  }, { passive: false });
  function endDrag() {
    const d = drag; if (!d) return; clearTimeout(d.timer); drag = null;
    if (d.mode === 'swipe') { blockClick = Date.now() + 250; const m = new DOMMatrix(getComputedStyle(d.stop).transform).m41; d.stop.style.transition = ''; const open = (d.vx || 0) < -6 ? true : (d.vx || 0) > 6 ? false : m < -80; /* 빠르게 튕기면 거리와 상관없이 */ d.stop.style.transform = open ? 'translateX(-176px)' : ''; S.swipe = open ? d.id : null; if (!open) setTimeout(() => d.wrap.classList.remove('is-swipe'), 300); if (open) sheet.querySelectorAll('.stop-wrap').forEach((w) => { if (w !== d.wrap) w.querySelector('.stop').style.transform = ''; }); }
    if (d.mode === 'lift') { blockClick = Date.now() + 250; if (d.to !== d.idx) { const o = S.order.slice(); o.splice(d.to, 0, o.splice(d.idx, 1)[0]); S.order = o; persist(); } flip(() => render(), d.id); }
  }
  function flip(fn, lifted) { // 다시 그리기 전후 자리를 재서, 줄들이 새 자리로 미끄러져 들어가게
    const before = {}; sheet.querySelectorAll('.stop-wrap').forEach((w) => (before[w.dataset.id] = w.getBoundingClientRect().top));
    fn(); if (reduce) return;
    sheet.querySelectorAll('.stop-wrap').forEach((w) => {
      const b = before[w.dataset.id], me = w.dataset.id === lifted; if (b == null) return;
      const dy = b - w.getBoundingClientRect().top; if (!dy && !me) return;
      if (me) w.style.zIndex = 5;
      const an = w.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: me ? 520 : 420, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
      if (me) { an.onfinish = () => (w.style.zIndex = ''); w.querySelector('.stop').animate([{ scale: 1.03, rotate: '-1.5deg', boxShadow: '0 14px 30px rgb(11 42 68 / 0.2)' }, { scale: 1, rotate: '0deg', boxShadow: '0 0 0 rgb(11 42 68 / 0)' }], { duration: 420, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' }); }
    });
  }
  sheet.addEventListener('pointerup', endDrag); sheet.addEventListener('pointercancel', endDrag);
  const closeSwipe = () => { S.swipe = null; sheet.querySelectorAll('.stop').forEach((s) => (s.style.transform = '')); setTimeout(() => sheet.querySelectorAll('.stop-wrap').forEach((w) => w.classList.remove('is-swipe')), 300); };

  const msheet = modal.querySelector('.modal-sheet'); let md = null;
  msheet.addEventListener('pointerdown', (e) => { if (msheet.scrollTop > 0 || e.target.closest('button')) return; md = { y0: e.clientY, t0: performance.now(), pid: e.pointerId, dy: 0 }; });
  msheet.addEventListener('pointermove', (e) => {
    if (!md) return; let dy = e.clientY - md.y0; if (!md.on && Math.abs(dy) < 6) return;
    if (!md.on) { md.on = true; try { msheet.setPointerCapture(md.pid); } catch (er) { /* 무시 */ } msheet.style.transition = 'none'; }
    if (dy < 0) dy = -Math.pow(-dy, 0.6); /* 위로는 버티듯이 */
    md.dy = dy; msheet.style.transform = `translateY(${dy}px)`;
  });
  const mEnd = () => { if (!md) return; const m = md; md = null; if (!m.on) return; msheet.style.transition = ''; msheet.style.transform = '';
    const v = m.dy / Math.max(1, performance.now() - m.t0); if (m.dy > 140 || v > 0.5) { blockClick = Date.now() + 250; closeModal(); } };
  msheet.addEventListener('pointerup', mEnd); msheet.addEventListener('pointercancel', mEnd);

  // 키보드: 시트와 대략 코스는 Esc로 닫기
  addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (S.tab === 'crew' && (S.tray || S.reply)) { S.tray = false; S.reply = null; refreshQuoted(); renderComposer(); return; } if (modal.classList.contains('is-open')) closeModal(); else if (flow.classList.contains('is-open')) (F.step === 2 ? (F.step = 1, drawFlow()) : closeFlow()); });

  // ---------- 시작: 하늘이 열림 ----------
  applySky(); setInterval(() => { applySky(); }, 60000);
  // 낮·노을·밤 바꾸기 (설명 칸 토글용): 하늘, 시트 색, 예시 시각, 열려 있는 대략 코스 지도까지 다시 그림
  window.EODI_M_SKY = (p) => { forcedSky = SKY[p] ? p : 'day'; applySky(); render(); if (flow.classList.contains('is-open')) drawFlow(); };
  render();
  const logo = $('.logo');
  function placeLaunchLogo() { const w = app.clientWidth, h = app.clientHeight, lh = (58 * 97 / 238) * 2.55; app.style.setProperty('--lx', (w - 148) / 2 + 'px'); app.style.setProperty('--ly', h * 0.42 - lh / 2 - logo.offsetTop + 'px'); }
  placeLaunchLogo();
  const t0 = performance.now();
  const slow = setTimeout(() => app.classList.add('is-slow'), 1600);
  const ready = Promise.all([document.fonts ? document.fonts.ready : 0, new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })))]);
  ready.then(() => {
    clearTimeout(slow); app.classList.remove('is-slow');
    setTimeout(() => { app.classList.remove('is-launch'); setTimeout(() => { app.classList.add('is-ready'); tabs(); }, 1300); }, reduce ? 0 : Math.max(0, 900 - (performance.now() - t0))); /* 로고를 0.9초 보여 준 뒤 천천히 열림 */
    if (S.alert === 'open') setTimeout(openAlert, 900);
    if (params.has('flow')) setTimeout(() => { openFlow(); if (params.get('flow') === '2') { F.step = 2; drawFlow(); } }, 900);
  });
  addEventListener('resize', () => { placeLaunchLogo(); tabs(); });
})();

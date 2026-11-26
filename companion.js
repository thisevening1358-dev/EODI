// 좌석의 휴대폰을 누르면 들려 올라오는 동반자 앱 (국내·해외 같은 짜임, 데이터만 다름: companion-data.js)
// 3D 휴대폰이 있던 자리에서 HTML 휴대폰이 화면 오른쪽으로 떠오름. 탭: 동반자, 투표, 정산, 합류. 머리의 사람 더하기로 초대
// 여러 사람이 실제로 함께 쓰려면 서버가 필요함. 지금은 이 기기 안에서만 바뀜 (예시 시안)
(function () {
  window.EODI_COMPANION = function (ctx) {
    const reduce = ctx.reduce;
    const DATA = window.EODI_COMPANION_DATA, PP = DATA.people;
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const W0 = 390, H0 = 844; // 휴대폰 한 장의 설계 크기 (CSS px), 화면에 맞춰 줄임

    const I = {
      people: '<svg class="ic" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 18C3 14.9 5.3 13 8 13S13 14.9 13.5 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="15.5" cy="7.5" r="2.6" stroke="currentColor" stroke-width="1.6"/><path d="M15 12.2C17.4 12.2 19.1 13.9 19.5 16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      vote: '<svg class="ic" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><rect x="3" y="4" width="16" height="14" rx="3.5" stroke="currentColor" stroke-width="1.7"/><path d="M7 11.2L9.6 13.6L15 8.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      money: '<svg class="ic" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><rect x="2.5" y="5" width="17" height="12" rx="3" stroke="currentColor" stroke-width="1.7"/><circle cx="11" cy="11" r="2.6" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 8.5V13.5M16.5 8.5V13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      meet: '<svg class="ic" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 19.5C11 19.5 17 14 17 9.2C17 5.8 14.3 3 11 3S5 5.8 5 9.2C5 14 11 19.5 11 19.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="11" cy="9.2" r="2.3" stroke="currentColor" stroke-width="1.6"/></svg>',
      add: '<svg class="ic" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3.3" stroke="currentColor" stroke-width="1.7"/><path d="M3 18.5C3.4 15.3 5.9 13.2 9 13.2S14.6 15.3 15 18.5M17.5 7.5V12.5M15 10H20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      back: '<svg class="ic" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 4.5L7 10L12.5 15.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      chev: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5.5 3L9.5 7L5.5 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      check: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.4L6.5 11.2L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      copy: '<svg class="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M11 3V2.5C11 2.2 10.8 2 10.5 2H2.5C2.2 2 2 2.2 2 2.5V10.5C2 10.8 2.2 11 2.5 11H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      plus: '<svg class="ic" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      bell: '<svg class="ic" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 11.5V7.5C4 5.3 5.8 3.5 8 3.5C10.2 3.5 12 5.3 12 7.5V11.5L13 12.5H3L4 11.5Z" fill="currentColor"/><path d="M6.6 14H9.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      swap: '<svg class="ic" width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 5H11L8.5 2.5M11.5 9H3L5.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    const TABS = [['home', '동반자', I.people], ['vote', '투표', I.vote], ['money', '정산', I.money], ['meet', '합류', I.meet]];

    // ---------- 상태 (국내·해외 따로, 이 기기 안에서만) ----------
    // ---------- 상태: 여행(코스 id)마다 한 벌, 이 기기 안에서만 ----------
    const ST = {};
    const extra = () => ({ myVote: null, applied: false, asked: {}, perm: 'edit', copied: false, resent: {}, adding: false, meetOpen: false, nudged: {} });
    function fromCourse(c, m) { // 동반자 데이터가 없는 코스: 코스의 사람과 이름으로 빈 앱
      const ids = (c.people || []).filter((k) => PP[k]);
      return { id: c.id, mode: m, trip: c.name, when: c.dday || '날짜 미정', dates: c.dates || '',
        lead: ids.length ? `${ids.map((k) => PP[k].name).join(', ')}와 함께 가요. 투표와 돈 정리, 만날 곳을 여기서 맞춰요.` : '아직 혼자예요. 함께 갈 사람을 초대해 보세요.',
        crew: ids.map((k, i) => ({ id: k, status: c.shared ? (i === 0 ? '이 코스를 공유했어요' : '함께 고치는 중') : '함께 가요', chip: c.shared && i === 0 ? '공유함' : '' })),
        activity: c.shared && ids[0] ? [[ids[0], '코스를 공유했어요', '어제']] : [],
        vote: null, money: { unit: m === 'overseas' ? '엔' : '원', rate: m === 'overseas' ? 9 : null, items: [], note: '' },
        meet: null, meetAlts: m === 'overseas' ? ['인천공항 1터미널 3층', '인천공항 2터미널 3층', '공항철도 내리는 곳'] : ['서울역 2층 맞이방', '서울역 1번 출구 앞', '열차 타는 곳 앞'],
        invite: { link: `eodi.app/t/${c.id}`, pending: [] }, crewCheck: {},
        days0: c.days && c.days[0] ? c.days[0].cities.flatMap((ct) => ct.stops) : [], clock: '' };
    }
    function tripOf(id, course, m) { if (!ST[id]) ST[id] = Object.assign(DATA.trips[id] ? clone(DATA.trips[id]) : fromCourse(course, m), extra()); return ST[id]; }
    let mode = 'domestic', S = tripOf(DATA.defaults.domestic), tab = 'home', sub = null, isOpen = false, busy = false;

    // ---------- 바탕 DOM ----------
    const root = document.createElement('div'); root.className = 'cp'; root.hidden = true;
    root.innerHTML = `<div class="cp-veil" data-act="close"></div>
      <section class="cp-stage" aria-label="동반자 큰 화면"></section><p class="cp-stage-h">휴대폰 바깥을 누르거나 Esc를 누르면 내려놓아요</p>
      <div class="cp-phone" role="dialog" aria-modal="true" aria-label="동반자" tabindex="-1"><div class="cp-screen">
        <div class="cp-status"><b class="cp-time"></b><span class="cp-bat" aria-hidden="true"><i></i></span></div>
        <div class="cp-view"></div>
        <nav class="cp-tabs" aria-label="동반자 메뉴"></nav><i class="cp-homebar" aria-hidden="true"></i>
      </div></div>`;
    document.body.appendChild(root);
    const stageEl = root.querySelector('.cp-stage'), phone = root.querySelector('.cp-phone'), screen = root.querySelector('.cp-screen'), view = root.querySelector('.cp-view'), tabsEl = root.querySelector('.cp-tabs');

    // ---------- 계산 ----------
    const jong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c < 0 || c > 11171 ? 0 : c % 28; }; // 받침
    const ro = (w) => w + (jong(w) && jong(w) !== 8 ? '으로' : '로'), eul = (w) => w + (jong(w) ? '을' : '를');
    const av = (id, size = '') => `<span class="cp-av${size}" style="--c:${PP[id].color}">${esc(PP[id].name)}</span>`;
    const name = (id) => PP[id].name;
    const unitFmt = (n) => (S.money.unit === '엔' ? `${Math.round(n).toLocaleString('ko-KR')}엔` : `${Math.round(n).toLocaleString('ko-KR')}원`);
    const wonHint = (n) => (S.money.rate ? `약 ${(Math.round((n * S.money.rate) / 100) * 100).toLocaleString('ko-KR')}원` : '');
    function ledger() { // 나와 각 사람 사이에 주고받을 돈 (+면 내가 받음)
      const net = {};
      for (const it of S.money.items) {
        const each = it.amount / it.split.length;
        if (it.by === 'me') for (const p of it.split) { if (p !== 'me') net[p] = (net[p] || 0) + each; }
        else if (it.split.includes('me')) net[it.by] = (net[it.by] || 0) - each;
      }
      return net;
    }
    const total = () => S.money.items.reduce((n, it) => n + it.amount, 0);
    const myShare = () => S.money.items.reduce((n, it) => n + (it.split.includes('me') ? it.amount / it.split.length : 0), 0);
    const crewN = () => S.crew.length + 1; // 나 포함
    const voted = () => (S.vote ? S.vote.options.reduce((n, o) => n + o.votes.length, 0) : 0);
    const winner = () => { const o = S.vote.options.slice().sort((a, b) => b.votes.length - a.votes.length); return voted() >= crewN() && o[0].votes.length > o[1].votes.length ? o[0] : null; };
    const moneyOpen = () => Object.entries(ledger()).filter(([id, v]) => Math.abs(v) > 1 && !S.asked[id]).length;

    // ---------- 화면 ----------
    // 흰 바탕에 브랜드 블루 하나. 위계는 글자 크기와 여백으로, 상자는 꼭 필요한 곳(사진, 블루 면)에만
    const stack = (ids, cls = '') => `<span class="cp-stack${cls}">${ids.map((id) => av(id)).join('')}</span>`;
    const crewNames = () => S.crew.map((c) => name(c.id)).join(', ');
    const top = (title, opts = {}) => `<header class="cp-top">${opts.back ? `<button type="button" class="cp-back" data-act="back" aria-label="뒤로">${I.back}</button>` : ''}
      <p class="cp-top-trip">${esc(S.trip)}</p><h3 class="cp-top-t">${esc(title)}</h3></header>`;
    function todoList() { // 홈의 '지금 할 일' (좌석 3D 휴대폰 화면도 같은 목록을 그림)
      const lg = ledger(), owe = Object.values(lg).some((v) => v < -1), late = S.meet ? S.meet.eta.filter((e) => e.state === 'late') : [];
      const todo = [
        S.vote && !S.myVote ? ['vote', '투표', S.vote.q, `${S.vote.due}, 내 차례`] : null,
        moneyOpen() ? ['money', '정산', owe ? '보낼 돈과 받을 돈이 있어요' : '받을 돈이 있어요', `${moneyOpen()}명과 정리할 차례`] : null,
        S.meet ? ['meet', '합류', `${S.meet.time} ${S.meet.title}`, late.length ? late.map((e) => `${name(e.id)} ${e.text}`).join(', ') : '모두 제시간에 와요'] : ['meet', '합류', '만날 곳을 아직 정하지 않았어요', '눌러서 정해요'],
      ].filter(Boolean);
      return todo;
    }
    function home() {
      const todo = todoList();
      return `<section class="cp-hero">
          <p class="cp-hero-k">${esc(S.when)}</p><h2 class="cp-hero-t">${esc(S.trip)}</h2><p class="cp-hero-d">${esc(S.dates || '')}</p>
          <div class="cp-hero-crew">${stack(['me'].concat(S.crew.map((c) => c.id)), ' is-hero')}<span>${S.crew.length ? `${esc(crewNames())}와 함께` : '아직 혼자예요'}</span>
            <button type="button" class="cp-hero-add" data-act="invite">${I.plus}초대</button></div>
        </section>
        <section class="cp-sheet">
          <h4 class="cp-h">지금 할 일</h4>
          <div class="cp-todo">${todo.map(([t, k, a, b]) => `<button type="button" class="cp-todo-i" data-act="tab" data-t="${t}"><span class="cp-todo-k">${k}</span><b>${esc(a)}</b><span class="cp-todo-m">${esc(b)}</span></button>`).join('')}</div>
          <h4 class="cp-h">함께 가는 사람<span>${S.crew.length}</span></h4>
          ${S.crew.length ? `<ul class="cp-ppl">${S.crew.map((c) => `<li>${av(c.id, ' is-l')}<span class="cp-ppl-b"><b>${esc(name(c.id))}</b><span>${esc(c.status)}</span></span>${c.chip ? `<em class="${c.sky ? 'is-blue' : ''}">${esc(c.chip)}</em>` : ''}</li>`).join('')}</ul>`
            : `<div class="cp-blank"><p>링크를 보내면 코스를 함께 고치고, 투표와 정산을 같이 해요.</p><button type="button" class="cp-pill is-blue" data-act="invite">동반자 초대</button></div>`}
          <h4 class="cp-h">새 소식</h4>
          ${S.activity.length ? `<ol class="cp-feed">${S.activity.map(([id, t, when]) => `<li><time>${esc(when)}</time><span>${av(id)}<span><b>${id === 'me' ? '내가' : `${esc(name(id))}가`}</b> ${esc(t)}</span></span></li>`).join('')}</ol>`
            : '<p class="cp-muted">아직 소식이 없어요. 누가 코스를 고치거나 투표를 열면 여기에 떠요.</p>'}
        </section>`;
    }
    function vote() {
      if (!S.vote) return `${top('투표')}<div class="cp-blank"><p>열린 투표가 없어요. 동반자가 장소나 시간을 두고 투표를 열면 여기에 떠요. 정해진 곳은 코스에 바로 들어가요.</p></div>`;
      const V = S.vote, w = winner(), n = voted(), N = crewN();
      return `${top('투표')}
        <p class="cp-asker">${av(V.by)}<span>${esc(name(V.by))}가 물어요</span><time>${esc(V.due)}</time></p>
        <h2 class="cp-q">${esc(V.q)}</h2><p class="cp-muted">${esc(V.fit)}</p>
        <div class="cp-vopts" role="radiogroup" aria-label="${esc(V.q)}">${V.options.map((o) => { const mine = S.myVote === o.id, pct = Math.round((o.votes.length / N) * 100);
          return `<button type="button" class="cp-vopt${mine ? ' is-mine' : ''}${w && w.id === o.id ? ' is-win' : ''}" role="radio" aria-checked="${mine}" data-act="pick" data-id="${o.id}">
            <span class="cp-vimg">${o.photo ? `<img src="assets/course/${o.photo}" alt="">` : `<span class="cp-vnoimg">${esc(o.name.slice(0, 1))}</span>`}${mine ? `<span class="cp-vmine">${I.check}내 선택</span>` : ''}</span>
            <span class="cp-vb"><b>${esc(o.name)}</b><span>${esc(o.sub)}</span></span>
            <span class="cp-vf">${o.votes.length ? stack(o.votes, ' is-s') : ''}<span class="cp-vn">${o.votes.length}표</span><span class="cp-vbar"><i style="width:${pct}%"></i></span></span></button>`; }).join('')}</div>
        ${w ? `<section class="cp-result"><p>${w.votes.length}명이 골랐어요</p><h3>${esc(ro(w.name))} 정했어요</h3>${S.applied ? '<p>코스에 넣었어요. 코스 편집에서 하늘색으로 보여요.</p>' : '<button type="button" class="cp-pill is-white" data-act="apply">코스에 넣기</button>'}</section>`
          : `<p class="cp-muted cp-gap">${!S.myVote ? '하나를 누르면 내 표가 들어가요. 마감 전까지 바꿀 수 있어요.' : n >= N ? `표가 같아요. 마감 전까지 바꿀 수 있고, 그대로면 ${esc(name(V.by))}가 정해요.` : `남은 사람 ${N - n}명을 기다려요`}</p>`}
        ${V.done.length ? `<h4 class="cp-h">지난 투표</h4><ul class="cp-done">${V.done.map((d) => `<li><span>${esc(d.q)}</span><b>${esc(d.a)}</b></li>`).join('')}</ul>` : ''}`;
    }
    function money() {
      const lg = ledger(), rows = Object.entries(lg).filter(([, v]) => Math.abs(v) > 1).sort((a, b) => b[1] - a[1]);
      return `${top('정산')}
        <p class="cp-k">함께 쓴 돈</p><p class="cp-num">${unitFmt(total())}</p>
        <p class="cp-sub">${S.money.rate ? `${wonHint(total())}, ` : ''}내 몫 <b>${unitFmt(myShare())}</b>${S.money.rate ? ` (${wonHint(myShare())})` : ''}</p>
        ${rows.length ? `<ul class="cp-settle">${rows.map(([id, v]) => { const get = v > 0, done = S.asked[id];
          return `<li>${av(id, ' is-l')}<span class="cp-ppl-b"><span>${get ? `${esc(name(id))}에게 받을 돈` : `${esc(name(id))}에게 보낼 돈`}</span><b class="${get ? 'is-blue' : ''}">${unitFmt(Math.abs(v))}</b>${S.money.rate ? `<span>${wonHint(Math.abs(v))}</span>` : ''}</span>
            <button type="button" class="cp-pill ${done ? 'is-done' : get ? 'is-soft' : 'is-blue'}" data-act="settle" data-id="${id}" aria-pressed="${!!done}">${done ? `${I.check}${get ? '요청함' : '보냄'}` : get ? '요청' : '보내기'}</button></li>`; }).join('')}</ul>` : ''}
        <h4 class="cp-h">쓴 돈<span>${S.money.items.length}</span>${S.money.note ? `<em>${esc(S.money.note)}</em>` : ''}</h4>
        ${S.money.items.length ? `<ul class="cp-items">${S.money.items.map((it) => `<li><span class="cp-ppl-b"><b>${esc(it.name)}</b><span>${esc(name(it.by))}가 냄, ${it.split.length}명이 나눔</span></span><b class="cp-amt">${unitFmt(it.amount)}</b></li>`).join('')}</ul>`
          : '<p class="cp-muted">아직 쓴 돈이 없어요. 넣으면 누가 누구에게 얼마를 보낼지 바로 계산해요.</p>'}
        ${S.adding ? `<form class="cp-add" data-form="add"><input name="n" placeholder="어디에 썼나요" aria-label="쓴 곳" required><input name="a" inputmode="numeric" placeholder="금액 (${esc(S.money.unit)})" aria-label="금액" required>
            <div class="cp-add-b"><button type="button" class="cp-pill is-soft" data-act="add-cancel">취소</button><button type="submit" class="cp-pill is-blue">넣기, ${crewN()}명이 나눔</button></div></form>`
          : `<button type="button" class="cp-wide is-soft" data-act="add">${I.plus}내가 쓴 돈 넣기</button>`}`;
    }
    function meet() {
      if (!S.meet) return `${top('합류')}<p class="cp-k">만날 곳</p><h2 class="cp-q">아직 정하지 않았어요</h2><p class="cp-muted">고르면 동반자 모두에게 알려요.</p>
        <ul class="cp-pick">${S.meetAlts.map((a) => `<li><button type="button" data-act="meet-new" data-v="${esc(a)}"><span>${esc(a)}</span>${I.chev}</button></li>`).join('')}</ul>`;
      const M = S.meet, me = M.eta.find((e) => e.id === 'me');
      return `${top('합류')}
        <p class="cp-k">만날 곳</p><p class="cp-num">${esc(M.time)}</p><h2 class="cp-place">${esc(M.title)}</h2><p class="cp-muted">${esc(M.sub)}</p>
        <button type="button" class="cp-link" data-act="meet-alt" aria-expanded="${S.meetOpen}">${I.swap}만날 곳 바꾸기</button>
        ${S.meetOpen ? `<ul class="cp-pick">${M.alts.map((a) => `<li><button type="button" class="${a === M.title ? 'is-on' : ''}" data-act="meet-set" data-v="${esc(a)}"><span>${esc(a)}</span>${a === M.title ? I.check : I.chev}</button></li>`).join('')}</ul>` : ''}
        <h4 class="cp-h">지금 어디쯤</h4>
        <ol class="cp-road">${M.eta.map((e) => `<li class="is-${e.state}">${av(e.id, ' is-l')}<span class="cp-ppl-b"><b>${esc(name(e.id))}${e.at ? `<time>${esc(e.at)}</time>` : ''}</b><span>${esc(e.text)}</span>${e.state === 'here' ? '' : `<span class="cp-vbar"><i style="width:${Math.round((e.p || 0) * 100)}%"></i></span>`}</span>
          ${e.state === 'late' && e.id !== 'me' ? `<button type="button" class="cp-pill ${S.nudged[e.id] ? 'is-done' : 'is-soft'}" data-act="nudge" data-id="${e.id}">${S.nudged[e.id] ? `${I.check}보냄` : '괜찮아요'}</button>` : e.state === 'here' ? `<em>${I.check}도착</em>` : ''}</li>`).join('')}</ol>
        ${me && me.state !== 'here' ? '<button type="button" class="cp-wide is-blue" data-act="arrived">도착했어요</button>' : ''}`;
    }
    function invite() {
      return `<header class="cp-top is-on-blue"><button type="button" class="cp-back" data-act="back" aria-label="뒤로">${I.back}</button><p class="cp-top-trip">${esc(S.trip)}</p><h3 class="cp-top-t">동반자 초대</h3></header>
        <p class="cp-inv-lead">QR을 보여 주거나 링크를 보내면 바로 함께해요.</p>
        <div class="cp-qrcard"><canvas class="cp-qr" width="300" height="300" aria-label="초대 QR"></canvas><p>${esc(S.invite.link)}</p></div>
        <button type="button" class="cp-wide is-white" data-act="copy">${S.copied ? `${I.check}링크를 복사했어요` : `${I.copy}초대 링크 복사`}</button>
        <h4 class="cp-h">들어오면 할 수 있는 것</h4>
        <div class="cp-seg" role="radiogroup" aria-label="권한">${[['edit', '함께 고치기'], ['view', '보기만']].map(([k, t]) => `<button type="button" role="radio" aria-checked="${S.perm === k}" class="${S.perm === k ? 'is-on' : ''}" data-act="perm" data-v="${k}">${t}</button>`).join('')}</div>
        <p class="cp-inv-note">${S.perm === 'edit' ? '코스를 고치고 투표와 정산에 함께해요.' : '코스와 합류 위치만 볼 수 있어요.'}</p>
        ${S.invite.pending.length ? `<h4 class="cp-h">수락을 기다리는 사람</h4><ul class="cp-ppl">${S.invite.pending.map((p, i) => `<li><span class="cp-av is-l is-ghost">${esc(p.name[0])}</span><span class="cp-ppl-b"><b>${esc(p.name)}</b><span>${esc(p.note)}</span></span><button type="button" class="cp-pill ${S.resent[i] ? 'is-done' : 'is-white'}" data-act="resend" data-i="${i}">${S.resent[i] ? `${I.check}보냄` : '다시 보내기'}</button></li>`).join('')}</ul>` : ''}`;
    }
    // ---------- 왼쪽 큰 화면: 휴대폰에서 고른 탭을 크게 펼쳐 봄 (손에 든 화면 + 두 번째 화면) ----------
    const mins = (t) => { const m = /^(\d+):(\d+)$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
    const peopleAll = () => ['me'].concat(S.crew.map((c) => c.id));
    function todayOf() { // 동반자 데이터에 그날 일정이 없으면 (코스로 만든 빈 앱) 코스의 첫날에서
      if (S.today) return S.today;
      const items = (S.days0 || []).filter((s) => s.t).slice(0, 5).map((s) => [s.t, s.name]);
      return { label: '1일차', items };
    }
    function stageHome() {
      const T = todayOf(), now = mins(S.clock), isToday = S.when === '오늘 출발';
      const next = isToday ? T.items.find(([t]) => mins(t) >= now) : T.items[0];
      const left = isToday && next ? mins(next[0]) - now : null;
      const big = isToday ? (next ? `${left < 60 ? `${left}분 뒤` : `${Math.floor(left / 60)}시간 ${left % 60}분 뒤`}` : '오늘 일정 끝') : /^D-(\d+)$/.test(S.when) ? `출발까지 ${S.when.slice(2)}일` : S.when;
      return `<p class="cp-st-k">${isToday ? '오늘의 다음 순서' : '다가오는 여행'}</p>
        <h2 class="cp-st-h">${esc(big)}</h2>${next ? `<p class="cp-st-sub"><b>${esc(next[0])}</b> ${esc(next[1])}</p>` : ''}
        ${T.items.length ? `<p class="cp-st-k cp-st-gap">${esc(T.label)}</p><ol class="cp-st-tl">${T.items.map(([t, w]) => { const past = isToday && mins(t) < now, isNext = next && t === next[0];
          return `<li class="${past ? 'is-past' : ''}${isNext ? ' is-next' : ''}"><time>${esc(t)}</time><i></i><span>${esc(w)}</span></li>`; }).join('')}</ol>` : '<p class="cp-st-sub">아직 시간이 정해진 일정이 없어요.</p>'}`;
    }
    function stageVote() {
      const V = S.vote;
      if (!V || !V.map) return `<p class="cp-st-k">투표</p><h2 class="cp-st-h">열린 투표가 없어요</h2><p class="cp-st-sub">동반자가 투표를 열면 후보 장소가 여기 지도에 떠요.</p>`;
      const [x0, y0, x1, y1] = V.map.crop, H = V.map.home, w = winner(), lead = V.options.slice().sort((a, b) => b.votes.length - a.votes.length)[0];
      const k = (x1 - x0) / 640; // 지도 1px이 화면에서 몇 배인지 (글자 크기를 화면 기준으로 맞춤)
      const pin = (o) => { const on = S.myVote === o.id || (w && w.id === o.id), lab = `${o.name} ${o.votes.length}표`, tw = (lab.length * 15 + 30) * k, th = 34 * k;
        return `<g class="cp-mp${on ? ' is-on' : ''}${!w && lead.votes.length && lead.id === o.id ? ' is-lead' : ''}"><path d="M${H.x} ${H.y} L${o.x} ${o.y}" class="cp-mp-ln" style="stroke-width:${2 * k}px;stroke-dasharray:${2 * k} ${7 * k}"/>
          <circle cx="${o.x}" cy="${o.y}" r="${11 * k}" class="cp-mp-dot"/><g transform="translate(${o.lab === 'b' ? o.x - tw / 2 : o.x + 18 * k} ${o.lab === 'b' ? o.y + 18 * k : o.y - th / 2})"><rect width="${tw}" height="${th}" rx="${th / 2}" class="cp-mp-tag"/><text x="${14 * k}" y="${th * 0.68}" style="font-size:${15 * k}px">${esc(lab)}</text></g></g>`; };
      return `<p class="cp-st-k">투표 중인 후보 ${V.options.length}곳</p><h2 class="cp-st-h cp-st-h--s">${esc(V.q)}</h2>
        <figure class="cp-st-map"><svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" role="img" aria-label="후보 장소 지도"><image href="${V.map.img}" x="0" y="0" width="1920" height="1080"/>
          ${V.options.filter((o) => o.x != null).map(pin).join('')}
          <circle cx="${H.x}" cy="${H.y}" r="${13 * k}" class="cp-mp-home"/><circle cx="${H.x}" cy="${H.y}" r="${5 * k}" class="cp-mp-dot"/><text x="${H.x + 16 * k}" y="${H.y + 6 * k}" class="cp-mp-homet" style="font-size:${15 * k}px">${esc(H.name)}</text></svg></figure>
        <p class="cp-st-sub">${w ? `${esc(ro(w.name))} 정했어요. ${S.applied ? '코스에 들어갔어요.' : '휴대폰에서 코스에 넣을 수 있어요.'}` : S.myVote ? `${voted()}명이 골랐어요. ${crewN() - voted() > 0 ? `남은 사람 ${crewN() - voted()}명` : '표가 같아요'}` : '휴대폰에서 하나를 고르면 내 표가 지도에 바로 보여요.'}</p>`;
    }
    function stageMoney() {
      const ids = peopleAll(), paid = {}, share = {};
      for (const id of ids) { paid[id] = 0; share[id] = 0; }
      for (const it of S.money.items) { paid[it.by] = (paid[it.by] || 0) + it.amount; for (const p of it.split) share[p] = (share[p] || 0) + it.amount / it.split.length; }
      const max = Math.max(1, ...ids.map((id) => Math.max(paid[id], share[id])));
      if (!S.money.items.length) return `<p class="cp-st-k">정산</p><h2 class="cp-st-h">아직 쓴 돈이 없어요</h2><p class="cp-st-sub">휴대폰에서 쓴 돈을 넣으면 누가 얼마를 냈는지 여기서 한눈에 비교해요.</p>`;
      return `<p class="cp-st-k">누가 얼마를 냈나</p><h2 class="cp-st-h cp-st-h--s">${unitFmt(total())}을 ${ids.length}명이 나눠요</h2>
        <ul class="cp-st-bars">${ids.map((id, i) => { const net = paid[id] - share[id];
          return `<li style="--i:${i}">${av(id, ' is-l')}<span class="cp-st-bn"><b>${esc(name(id))}</b><span>${unitFmt(paid[id])} 냄</span></span>
            <span class="cp-st-bt"><i class="is-paid" style="width:${(paid[id] / max) * 100}%"></i><i class="is-share" style="width:${(share[id] / max) * 100}%"></i></span>
            <span class="cp-st-net${net > 1 ? ' is-get' : ''}">${Math.abs(net) < 1 ? '정리 끝' : `${net > 0 ? '받을 돈' : '보낼 돈'} ${unitFmt(Math.abs(net))}`}</span></li>`; }).join('')}</ul>
        <p class="cp-st-legend"><i class="is-paid"></i>낸 돈<i class="is-share"></i>내 몫(쓴 만큼)</p>`;
    }
    function stageMeet() {
      const M = S.meet;
      if (!M) return `<p class="cp-st-k">합류</p><h2 class="cp-st-h">만날 곳을 정해요</h2><p class="cp-st-sub">휴대폰에서 고르면 동반자가 여기로 모여드는 모습이 보여요.</p>`;
      const now = mins(S.clock), left = S.when === '오늘 출발' && mins(M.time) != null ? mins(M.time) - now : null;
      return `<p class="cp-st-k">만날 곳까지${left != null && left > 0 ? `, ${left}분 남음` : ''}</p><h2 class="cp-st-h cp-st-h--s"><b>${esc(M.time)}</b> ${esc(M.title)}</h2>
        <ul class="cp-st-road">${M.eta.map((e, i) => { const p = e.state === 'here' ? 1 : e.p || 0;
          return `<li class="is-${e.state}" style="--i:${i}"><span class="cp-st-rn"><b>${esc(name(e.id))}</b><span>${esc(e.state === 'here' ? '도착' : e.at ? `${e.at} 도착 예정` : '')}</span></span>
            <span class="cp-st-rt"><i class="cp-st-rf" style="width:${p * 100}%"></i><span class="cp-st-ra" style="left:${p * 100}%">${av(e.id)}</span><i class="cp-st-end"></i></span>
            <span class="cp-st-rs">${esc(e.state === 'late' ? e.text : e.state === 'here' ? '' : e.state === 'later' ? e.text : '')}</span></li>`; }).join('')}</ul>`;
    }
    function stageInvite() {
      return `<p class="cp-st-k">동반자 초대</p><h2 class="cp-st-h">링크 하나로<br>함께 짜요</h2>
        <ol class="cp-st-steps"><li><b>1</b><span>QR을 보여 주거나 링크를 보내요</span></li><li><b>2</b><span>들어오면 이 코스를 ${S.perm === 'edit' ? '함께 고쳐요' : '볼 수 있어요'}</span></li><li><b>3</b><span>투표, 정산, 합류가 모두에게 같이 보여요</span></li></ol>`;
    }
    function renderStage(enter, d) {
      const v = sub || tab, html = { home: stageHome, vote: stageVote, money: stageMoney, meet: stageMeet, invite: stageInvite }[v]();
      stageEl.innerHTML = `<div class="cp-st${enter ? ' is-enter' : ''}${enter && d ? (d > 0 ? ' from-r' : ' from-l') : ''}" data-v="${v}">${html}</div>`;
    }
    function drawQR() { // 모양만 QR처럼 (예시): 링크 글자로 칸을 정해 늘 같은 무늬
      const cv = view.querySelector('.cp-qr'); if (!cv) return;
      const c = cv.getContext('2d'), N = 29, k = 300 / N, ink = '#0B2A44';
      c.clearRect(0, 0, 300, 300); c.fillStyle = ink;
      let h = 0; for (const ch of S.invite.link) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
      const finder = (x, y) => x < 8 && y < 8 || x > N - 9 && y < 8 || x < 8 && y > N - 9;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.52) c.fillRect(x * k, y * k, k + 0.4, k + 0.4);
      for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) { c.fillRect(fx * k, fy * k, 7 * k, 7 * k); c.clearRect((fx + 1) * k, (fy + 1) * k, 5 * k, 5 * k); c.fillRect((fx + 2) * k, (fy + 2) * k, 3 * k, 3 * k); }
    }

    // ---------- 아래 메뉴: 블루 알약 하나가 고른 탭으로 용수철처럼 미끄러져 가고, 탭은 그 사이 늘었다 줄어듦 ----------
    let dir = 0, indAt = null;
    tabsEl.innerHTML = `<i class="cp-ind" aria-hidden="true"></i>` + TABS.map(([k, t, ic]) => `<button type="button" class="cp-tab" data-act="tab" data-t="${k}" aria-label="${t}">${ic}<span>${t}</span><i class="cp-badge" hidden></i></button>`).join('');
    const ind = tabsEl.querySelector('.cp-ind'), tabBtns = [...tabsEl.querySelectorAll('.cp-tab')];
    const GROW = 2.1, GAP = 4, PAD = 6; // CSS .cp-tab.is-on flex-grow, .cp-tabs gap·padding과 같은 값
    function indTarget(idx) { // 늘어나는 중간이 아니라 '다 늘어난 뒤' 자리를 계산해서 알약과 탭이 함께 도착
      const W = tabsEl.clientWidth - PAD * 2, unit = (W - GAP * (TABS.length - 1)) / (GROW + TABS.length - 1);
      return { x: PAD + idx * (unit + GAP), w: unit * GROW };
    }
    function updTabs() {
      const on = sub ? -1 : TABS.findIndex(([k]) => k === tab);
      tabBtns.forEach((b, i) => {
        const was = b.classList.contains('is-on'), now = i === on;
        b.classList.toggle('is-on', now); b.setAttribute('aria-current', now ? 'page' : 'false');
        if (now && !was && !reduce) { b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); } // 아이콘이 살짝 튐
        const k = TABS[i][0], n = k === 'vote' ? (S.vote && !S.myVote ? 1 : 0) : k === 'money' ? moneyOpen() : 0, bd = b.querySelector('.cp-badge');
        if (String(n) !== bd.textContent) { bd.textContent = n || ''; bd.hidden = !n; if (n && !reduce) { bd.classList.remove('is-pop'); void bd.offsetWidth; bd.classList.add('is-pop'); } }
        bd.setAttribute('aria-label', n ? `${n}건` : '');
      });
      ind.style.opacity = on < 0 ? 0 : 1;
      if (on < 0) return;
      const t = indTarget(on), first = !indAt;
      if (first || reduce) { ind.style.transition = 'none'; ind.style.transform = `translateX(${t.x}px)`; ind.style.width = t.w + 'px'; void ind.offsetWidth; ind.style.transition = ''; }
      else { ind.style.transform = `translateX(${t.x}px)`; ind.style.width = t.w + 'px'; }
      indAt = t;
    }
    function render(enter) {
      const v = sub || tab;
      const html = { home, vote, money, meet, invite }[v]();
      const y = view.scrollTop;
      renderStage(enter, dir);
      view.innerHTML = `<div class="cp-page${enter ? ' is-enter' : ''}${enter && dir ? (dir > 0 ? ' from-r' : ' from-l') : ''}" data-v="${v}">${html}</div>`; dir = 0;
      screen.classList.toggle('is-hero', v === 'home'); screen.classList.toggle('is-blue', v === 'invite'); screen.classList.toggle('is-scrolled', view.scrollTop > 230); // 위 상태줄 글자를 흰색으로
      if (!enter) view.scrollTop = y; else view.scrollTop = 0;
      updTabs();
      if (v === 'invite') drawQR();
      root.querySelector('.cp-time').textContent = new Date().toTimeString().slice(0, 5);
    }

    // ---------- 동작 ----------
    function act(a, el) {
      switch (a) {
        case 'close': close(); break;
        case 'tab': { const to = el.dataset.t; if (to === tab && !sub) { view.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); break; } // 같은 탭을 다시 누르면 맨 위로
          dir = TABS.findIndex(([k]) => k === to) - TABS.findIndex(([k]) => k === tab); tab = to; sub = null; render(true); break; }
        case 'invite': sub = 'invite'; render(true); break;
        case 'back': sub = null; render(true); break;
        case 'pick': {
          const id = el.dataset.id; if (S.myVote === id) break;
          for (const o of S.vote.options) o.votes = o.votes.filter((p) => p !== 'me');
          S.vote.options.find((o) => o.id === id).votes.push('me'); S.myVote = id; render(false);
          const L = S.vote.last; if (!S.vote.options.some((o) => o.votes.includes(L))) setTimeout(() => { if (S.vote.options.some((o) => o.votes.includes(L))) return; S.vote.options.find((o) => o.id === S.vote.lastPick).votes.push(L); S.activity.unshift([L, '마지막으로 투표했어요', '방금']); if (isOpen) render(false); }, reduce ? 0 : 1300); // 예시: 마지막 한 명이 이어서 고름
          break;
        }
        case 'apply': { const w = winner(); if (!w) break; S.applied = true; if (ctx.onApply) ctx.onApply(S.id, S.mode, w); /* 코스 편집에 실제로 들어감 */ S.vote.done.unshift({ q: S.vote.q, a: `${w.name}, 코스에 넣음` }); S.activity.unshift(['me', `${eul(w.name)} 코스에 넣었어요`, '방금']); render(false); break; }
        case 'settle': { const id = el.dataset.id; S.asked[id] = !S.asked[id]; render(false); break; }
        case 'add': S.adding = true; render(false); { const i = view.querySelector('.cp-add input'); if (i) i.focus(); } break;
        case 'add-cancel': S.adding = false; render(false); break;
        case 'meet-alt': S.meetOpen = !S.meetOpen; render(false); break;
        case 'meet-set': S.meet.title = el.dataset.v; S.meetOpen = false; S.activity.unshift(['me', `만날 곳을 ${ro(el.dataset.v)} 바꿨어요`, '방금']); render(false); break;
        case 'meet-new': S.meet = { title: el.dataset.v, time: '출발 20분 전', sub: '출발 날 아침에 시간을 다시 알려 드려요', alts: S.meetAlts, eta: [{ id: 'me', text: '출발 날 위치를 보여요', at: '', state: 'later', p: 0 }].concat(S.crew.map((c) => ({ id: c.id, text: '출발 날 위치를 보여요', at: '', state: 'later', p: 0 }))) }; S.activity.unshift(['me', `만날 곳을 ${ro(el.dataset.v)} 정했어요`, '방금']); render(false); break;
        case 'nudge': S.nudged[el.dataset.id] = true; render(false); break;
        case 'arrived': { const e = S.meet.eta.find((x) => x.id === 'me'); Object.assign(e, { state: 'here', text: '도착했어요', at: new Date().toTimeString().slice(0, 5) }); render(false); break; }
        case 'copy': try { navigator.clipboard && navigator.clipboard.writeText('https://' + S.invite.link); } catch (er) { /* 복사가 막혀도 표시는 그대로 */ } S.copied = true; render(false); setTimeout(() => { S.copied = false; if (isOpen && sub === 'invite') render(false); }, 2200); break;
        case 'perm': S.perm = el.dataset.v; render(false); break;
        case 'resend': S.resent[+el.dataset.i] = true; render(false); break;
        default: break;
      }
    }
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && root.contains(b)) act(b.dataset.act, b); });
    root.addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target; if (f.dataset.form !== 'add') return;
      const n = f.elements.n.value.trim(), a = Math.round(+String(f.elements.a.value).replace(/[^\d.]/g, ''));
      if (!n || !a) return;
      S.money.items.unshift({ name: n, by: 'me', amount: a, split: ['me', ...S.crew.map((c) => c.id)] }); S.adding = false; S.activity.unshift(['me', `${n} ${unitFmt(a)}을 넣었어요`, '방금']); render(false);
    });
    // 키보드: Esc로 내려놓기, Tab은 휴대폰 안에서만 돎 (뒤 화면 버튼으로 빠져나가지 않게)
    let lastFocus = null, lastKey = null;
    function refocus() { // 닫은 뒤 앱을 연 버튼으로. 뒤 화면이 다시 그려졌으면 같은 버튼을 다시 찾음
      let el = lastFocus && lastFocus.isConnected ? lastFocus : null;
      if (!el && lastKey) el = document.querySelector(lastKey);
      if (el && el.focus) el.focus({ preventScroll: true });
      lastFocus = null; lastKey = null;
    }
    const focusables = () => [...phone.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && !el.hidden && el.getClientRects().length);
    window.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) { e.preventDefault(); phone.focus(); return; }
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }, true);
    root.addEventListener('focusin', (e) => { if (isOpen && !phone.contains(e.target)) phone.focus({ preventScroll: true }); }); // 바깥(덮개)에 포커스가 가면 휴대폰으로

    // ---------- 들어 올리기 / 내려놓기: 3D 휴대폰 자리에서 화면 오른쪽으로 ----------
    function layout() { // 최종 자리와 크기
      const vw = window.innerWidth, vh = window.innerHeight, narrow = vw <= 860;
      const s = Math.max(0.55, Math.min(1, (vh * 0.9) / H0, narrow ? (vw * 0.92) / W0 : 1));
      const cx = narrow ? vw / 2 : vw - Math.max(56, vw * 0.1) - (W0 * s) / 2, cy = vh / 2;
      return { s, cx, cy };
    }
    function place(L) {
      phone.style.left = (L.cx - W0 / 2).toFixed(1) + 'px'; phone.style.top = (L.cy - H0 / 2).toFixed(1) + 'px'; phone.style.transform = `scale(${L.s.toFixed(4)})`;
      // 왼쪽 큰 화면: 화면 왼쪽 여백부터 휴대폰 앞까지. 좁으면 글자까지 함께 줄임 (720 기준)
      const x = Math.max(48, window.innerWidth * 0.07), w = Math.min(760, L.cx - (W0 * L.s) / 2 - 80 - x), k = Math.max(0.68, Math.min(1, w / 720));
      stageEl.style.zoom = k.toFixed(4); stageEl.style.left = (x / k).toFixed(1) + 'px'; stageEl.style.width = (Math.max(0, w) / k).toFixed(1) + 'px';
      stageEl.hidden = w < 320; // 휴대폰 옆에 자리가 없으면 숨김
    }
    window.addEventListener('resize', () => { if (isOpen && !busy) place(layout()); });
    view.addEventListener('scroll', () => { screen.classList.toggle('is-scrolled', view.scrollTop > 230); }, { passive: true }); // 홈: 블루 면을 지나면 상태줄도 흰 바탕
    function fromTf(L) { // 3D 휴대폰 화면 자리 (scene.js가 화면 좌표로 넘김)
      const r = ctx.phoneRect && ctx.phoneRect();
      if (!r) return `translate(0px, ${window.innerHeight}px) scale(${L.s})`;
      return `translate(${(r.cx - L.cx).toFixed(1)}px, ${(r.cy - L.cy).toFixed(1)}px) scale(${(r.h / H0).toFixed(4)}) rotate(${r.angle.toFixed(2)}deg)`;
    }
    function open(m, opts = {}) {
      if (isOpen || busy) return;
      lastFocus = document.activeElement; // 닫으면 앱을 연 버튼으로 돌아감
      lastKey = lastFocus && lastFocus.dataset && lastFocus.dataset.act ? `${lastFocus.classList[0] ? '.' + lastFocus.classList[0] : ''}[data-act="${lastFocus.dataset.act}"]${lastFocus.dataset.id ? `[data-id="${lastFocus.dataset.id}"]` : ''}` : null;
      mode = m === 'overseas' ? 'overseas' : 'domestic';
      S = tripOf(opts.course ? opts.course.id : DATA.defaults[mode], opts.course, mode); // 코스 화면에서 열면 그 코스, 좌석에서는 모드의 기본 여행
      tab = ['vote', 'money', 'meet'].includes(opts.tab) ? opts.tab : 'home'; sub = opts.tab === 'invite' ? 'invite' : null;
      root.classList.toggle('is-overseas', mode === 'overseas');
      root.hidden = false; isOpen = true; busy = true; document.body.classList.add('is-phone'); indAt = null; render(true);
      for (const el of document.body.children) if (el !== root && el.tagName !== 'SCRIPT' && !el.hasAttribute('inert')) { el.setAttribute('inert', ''); el.dataset.cpInert = '1'; } // 뒤 화면은 누르기·Tab·화면 낭독에서 빠짐
      const L = layout(); place(L);
      requestAnimationFrame(() => root.classList.add('is-on'));
      phone.focus({ preventScroll: true }); // 키보드는 휴대폰 안에서 (테두리 없이)
      if (reduce) { busy = false; return; }
      const an = phone.animate([{ transform: fromTf(L), borderRadius: '30px' }, { transform: `scale(${L.s})` }], { duration: 820, easing: getComputedStyle(document.documentElement).getPropertyValue('--spring-soft').trim() || 'cubic-bezier(0.2, 0.9, 0.3, 1)' });
      an.onfinish = () => { busy = false; };
    }
    function close() {
      if (!isOpen || busy) return;
      busy = true; root.classList.remove('is-on');
      for (const el of document.querySelectorAll('[data-cp-inert]')) { el.removeAttribute('inert'); delete el.dataset.cpInert; }
      const L = layout(), done = () => { root.hidden = true; isOpen = false; busy = false;  document.body.classList.remove('is-phone'); if (ctx.onClose) ctx.onClose(); refocus(); };
      if (reduce) { done(); return; }
      const an = phone.animate([{ transform: `scale(${L.s})` }, { transform: fromTf(L) }], { duration: 520, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'forwards' });
      an.onfinish = () => { done(); an.cancel(); };
    }
    // 코스 화면이 쓰는 요약: 함께 가는 사람, 가장 최근 소식, 열린 투표, 사람별 남은 준비
    function info(id) {
      const T = ST[id] || DATA.trips[id]; if (!T) return null;
      return { crew: T.crew.map((c) => c.id), latest: T.activity[0] || null, vote: T.vote && !(ST[id] && ST[id].myVote) ? T.vote.q : null, crewCheck: T.crewCheck || {} };
    }
    // 좌석의 3D 휴대폰 화면용 요약 (props.js가 앱 홈과 같은 모습으로 그림)
    function seat(m) {
      const keep = S; S = tripOf(DATA.defaults[m === 'overseas' ? 'overseas' : 'domestic']);
      const r = { trip: S.trip, when: S.when, dates: S.dates || '', me: PP.me, crew: S.crew.map((c) => PP[c.id]), todo: todoList().map(([, k, a, b]) => [k, a, b]), badges: { vote: S.vote && !S.myVote ? 1 : 0, money: moneyOpen() } };
      S = keep; return r;
    }
    return { open, close, info, seat, isOpen: () => isOpen, busy: () => busy };
  };
})();

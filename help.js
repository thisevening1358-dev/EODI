// PC 웹 설명: 오른쪽 아래 ? 원을 누르거나 ? 키를 누르면 열리고, Esc나 X로 닫힘
// 화면 버튼을 누르면 설명과 가는 법만 바뀜(뒤 장면은 그대로). 열 때는 지금 보고 있는 화면 설명부터 보여 줌
(function () {
  const ICON = {
    q: 'M140,192a12,12,0,1,1-12-12A12,12,0,0,1,140,192ZM128,56c-26.47,0-48,19.74-48,44v4a8,8,0,0,0,16,0v-4c0-15.44,14.36-28,32-28s32,12.56,32,28-14.36,28-32,28a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c22.79-3.36,40-21.15,40-43.28C176,75.74,154.47,56,128,56Z',
    x: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
  }; // Phosphor Icons (MIT)
  const svg = (k) => `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
  // [제목, 설명, 가는 법, 흐름(선택): [단계들, 지금 단계]]
  const MAPF = ['입체 지도', '장소 담기', '코스 편집', '세부 코스'];
  const DESC = {
    hero: ['첫 화면 · 역과 공항', '승강장과 건물, 레일이 땅에서 솟아 지어지고 KTX가 들어와 서요. 해외는 공항이 지어지고 비행기가 내려앉아요. 하늘과 조명은 지금 시각을 따라 바뀌어요.', '처음 열면 나와요. 오른쪽 위 다이얼로 국내와 해외를 바꿔요.'],
    pov: ['승강장 · 터미널 시점', '역 안 승강장(공항은 터미널)에 서서 눈높이로 열차와 비행기를 봐요. 승강장 전광판에는 지금 진행 중인 축제와 이벤트 광고 포스터가 차례로 넘어가요. 입체 지도에서 추천하는 축제와 같은 곳이고, 밤에도 켜져 있어요.', '열차가 선 뒤 역이나 공항을 누르거나, 아래 승강장으로 이동 버튼을 눌러요.'],
    seat: ['좌석 시점', '내 좌석에 앉은 눈높이예요. 왼쪽 아래에 종이 지도, 오른쪽 아래에 휴대폰을 손에 든 것처럼 보여요. 지도를 누르면 입체 지도가, 휴대폰을 누르면 동반자 앱이 열려요.', 'KTX나 비행기를 눌러요. 공항 터미널에서는 탑승구를 눌러도 돼요.'],
    atlas: ['입체 지도 · 둘러보기', '실제 고도로 만든 한반도 부조 위에 장소가 땅에서 솟은 빛기둥으로 서 있어요. 지역을 누르면 그 지역으로 다가가고, 위의 경로(전국 > 지역)를 누르면 돌아가요. 취향 버튼(전체, 바다, 자연, 미식, 역사)을 고르면 맞는 곳일수록 빛기둥이 높이 솟고 해안이나 산지가 밝아져요. 왼쪽 추천 목록은 이번 시즌 축제를 먼저 보여 줘요.', '좌석 시점에서 왼쪽 아래 종이 지도를 누르면, 지도가 들려 올라와 입체 지도로 바뀌어요.', [MAPF, 0]],
    place: ['장소 카드와 담기', '장소를 고르면 사진과 한 줄 설명, 운영 정보가 담긴 카드가 지도 위 그 장소 옆에 붙어요. 지도를 돌리거나 다가가도 카드가 따라다녀요. 코스에 담기를 누르면 아래 코스 바에 번호가 하나씩 쌓이고, 빈 종이를 누르면 카드가 닫혀요.', '입체 지도에서 장소 빛기둥이나 왼쪽 추천 목록의 줄을 눌러요.', [MAPF, 1]],
    world: ['해외 지도', '세계 지도에서 시작해요. 일본(또는 일본 장소)을 누르면 일본으로 다가간 뒤 일본 지도로 넘어가고, 일본 전체에서 뒤로 가면 세계 지도로 돌아와요. 지금은 일본만 코스를 만들 수 있어서 다른 나라는 곧 열려요 안내만 떠요. 세계 지도에서 담은 장소는 일본 지도로 그대로 이어져요.', '오른쪽 위 다이얼을 해외로 두고, 비행기 좌석에서 종이 지도를 눌러요. 처음 열 때 지도 자료를 받는 동안 진행 막대가 떠요.', [['세계 지도', '일본 지도', '장소 담기', '코스 편집'], 0]],
    course: ['코스 편집', '담은 장소가 일차별 도시 카드로 정리돼요. 카드를 끌어 순서를 바꾸고, 도시 사이 이동 칩(국내 KTX, 해외 비행·JR·렌터카)과 숙소 줄을 정해요. 위의 동반자 줄로 함께 가는 사람을 보고, 해외는 오른쪽 출발 전 확인에서 여권, 입국, 환전 같은 남은 준비를 챙겨요.', '입체 지도 아래 코스 바의 코스 편집을 누르거나, 내 코스에서 카드를 펼쳐 코스 편집을 눌러요.', [MAPF, 2]],
    mine: ['내 코스', '다가오는 여행, 만드는 중, 다녀온 여행으로 나뉘어요. 카드를 누르면 그 자리에서 일차별 일정이 펼쳐지고, 축제 시간이나 비행편이 바뀌면 카드에 알림이 떠요. 새 코스에서 지도에서 직접 만들거나 AI로 만들 수 있어요.', '입체 지도 왼쪽 위의 탐색 / 내 코스에서 내 코스를 눌러요.', [['내 코스', '카드 펼치기', '코스 편집', '세부 코스'], 0]],
    city: ['세부 코스', '부산과 삿포로는 평면 지도 위에서 하루 동선을 짜요. 끌어서 옮기고 휠로 확대해요. 장소를 누르면 사진과 운영 정보 카드가 그 옆에 붙고, 지도에서 장소 추가로 검색해 넣어요. 다른 도시는 입체 지도로 보여 줘요.', '코스 편집의 도시 카드에서 세부 코스를 눌러요.', [MAPF, 3]],
    ai: ['AI 코스', '가고 싶은 여행을 한 문장으로 말하면, 만드는 중 화면에서 단계와 지도가 차례로 채워지고 제안 3개가 나와요. 하나를 고르면 도시별 AI 세부 코스로 이어지고, 아래 입력창에 바꾸고 싶은 점을 말해 다시 짜요.', '내 코스의 새 코스에서 AI로 만들기를 눌러요.', [['한 문장 요청', '만드는 중', '제안 3개', '세부 코스'], 0]],
    phone: ['동반자 앱', '함께 가는 사람, 할 일, 투표, 정산, 합류를 한곳에서 봐요. 왼쪽 큰 화면에 고른 탭이 크게 펼쳐져요.', '좌석의 휴대폰을 누르거나, 코스 화면의 동반자 줄이나 동행에게 공유를 눌러요.'],
    night: ['밤 화면', '해가 지면 남색 하늘에 별과 달빛이 뜨고, 가로등과 건물 창이 하늘색으로 켜져요. 활주로 등과 승강장 가장자리만 다홍빛이에요. 입체 지도와 코스 화면도 어두운 판과 코랄 강조색으로 바뀌어요.', '해가 지고 70분쯤 지나면 저절로 바뀌어요. 위의 낮·노을·밤 토글로 바로 바꿔 볼 수 있어요.'],
  };
  const GROUPS = [['장면', ['hero', 'pov', 'seat', 'night']], ['지도와 코스', ['atlas', 'place', 'world', 'course', 'mine', 'city', 'ai']], ['함께', ['phone']]];
  const B = document.body;
  const current = () => {
    const c = B.classList;
    if (c.contains('is-phone')) return 'phone';
    if (c.contains('is-course-city')) return 'city';
    if (c.contains('is-course')) return 'course';
    if (c.contains('is-atlas')) { const pc = document.getElementById('atlas-place'); if (pc && pc.getAttribute('aria-hidden') === 'false') return 'place'; return c.contains('is-overseas') ? 'world' : 'atlas'; }
    if (c.contains('is-seat')) return 'seat';
    if (c.contains('is-pov')) return 'pov';
    return 'hero';
  };

  const fab = document.createElement('button');
  fab.className = 'help-fab'; fab.type = 'button'; fab.setAttribute('aria-label', '설명 보기'); fab.setAttribute('aria-haspopup', 'dialog'); fab.innerHTML = svg('q');
  const box = document.createElement('div');
  box.className = 'help'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'eodi 설명'); box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<div class="help-close"><span>Esc로 닫기</span><button class="help-x" type="button" aria-label="설명 닫기">${svg('x')}</button></div>
    <div class="help-in">
      <section>
        <div class="help-top"><h2>eodi</h2><div class="help-tod" role="group" aria-label="시간대 바꾸기"><i aria-hidden="true"></i><button type="button" data-t="day" aria-pressed="true">낮</button><button type="button" data-t="sunset" aria-pressed="false">노을</button><button type="button" data-t="night" aria-pressed="false">밤</button></div></div>
        <p class="help-lead">어디로 갈지 고르는 순간부터 함께 떠나는 날까지 이어지는 여행 서비스예요. PC에서는 입체 지도 위에서 코스를 자세히 짜고, 휴대폰에서는 여행 중에 빠르게 바꾸고, 워치로는 걸으면서 길을 봐요.</p>
        <div class="help-acts">${GROUPS.map(([g, ks]) => `<div class="help-group"><span>${g}</span><div>${ks.map((k) => `<button type="button" data-k="${k}">${DESC[k][0]}</button>`).join('')}</div></div>`).join('')}</div>
        <div class="help-links"><span>다른 기기</span><a href="m/">모바일</a><a href="w/">워치</a></div>
      </section>
      <section>
        <div class="help-desc" aria-live="polite"><b></b><p></p><ol class="help-flow" aria-label="흐름"></ol><div class="help-how"><em>가는 법</em><span></span></div></div>
      </section>
    </div>`;
  B.append(fab, box);
  const desc = box.querySelector('.help-desc'), acts = box.querySelector('.help-acts');
  function pick(k) {
    acts.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.k === k));
    if (desc.dataset.k === k) return;
    desc.dataset.k = k; desc.querySelector('b').textContent = DESC[k][0]; desc.querySelector('p').textContent = DESC[k][1]; desc.querySelector('.help-how span').textContent = DESC[k][2];
    const fl = desc.querySelector('.help-flow'), f = DESC[k][3];
    fl.hidden = !f; fl.innerHTML = f ? f[0].map((t, i) => `<li class="${i === f[1] ? 'is-on' : i < f[1] ? 'is-done' : ''}"${i === f[1] ? ' aria-current="step"' : ''}>${t}</li>`).join('') : '';
    desc.classList.remove('is-in'); void desc.offsetWidth; desc.classList.add('is-in');
  }
  let back = null;
  const isOpen = () => box.classList.contains('is-on');
  function open() {
    if (isOpen()) return; back = document.activeElement; pick(current());
    box.classList.add('is-on'); box.setAttribute('aria-hidden', 'false'); B.classList.add('is-help');
    setTimeout(() => (acts.querySelector('.is-on') || acts.firstElementChild).focus({ preventScroll: true }), 60);
  }
  function close() {
    if (!isOpen()) return; box.classList.remove('is-on'); box.setAttribute('aria-hidden', 'true'); B.classList.remove('is-help');
    (back && back.isConnected ? back : fab).focus({ preventScroll: true });
  }
  // 낮·노을·밤 토글: 뒤 장면의 시간대를 바꾸고, 장면의 시간대를 따라 표시도 맞춤 (새벽은 노을, 블루 아워는 밤 칸)
  const tod = box.querySelector('.help-tod');
  const syncTod = () => { const n = B.dataset.tod, t = n === 'day' ? 'day' : n === 'dawn' || n === 'sunset' ? 'sunset' : 'night'; tod.dataset.on = t; tod.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === t))); };
  tod.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b && window.__setTod) { tod.dataset.on = b.dataset.t; window.__setTod(b.dataset.t); } });
  new MutationObserver(syncTod).observe(B, { attributes: true, attributeFilter: ['data-tod'] }); syncTod();
  fab.addEventListener('click', open);
  box.querySelector('.help-x').addEventListener('click', close);
  acts.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) pick(b.dataset.k); });
  box.addEventListener('click', (e) => { if (e.target === box) close(); }); // 빈 블러를 누르면 닫힘
  // 먼저 받아서: 설명이 열려 있을 때 Esc는 설명만 닫고 뒤 장면에는 전하지 않음
  addEventListener('keydown', (e) => {
    if (isOpen()) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
      if (e.key === 'Tab') { // 설명 안에서만 돌기
        const f = [...box.querySelectorAll('button, a')]; const i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
      return;
    }
    if (e.key === '?' && !e.target.closest('input, textarea, [contenteditable="true"]')) { e.preventDefault(); open(); }
  }, true);
})();

// 넓은 화면(PC)에서 앱 오른쪽에 붙는 설명 칸. 앱 동작은 건드리지 않고 화면 상태만 읽음
// 버튼을 누르면 설명과 가는 법만 바뀜(앱 화면은 그대로). 앱 안에서 화면을 옮기면 그 화면 설명으로 따라감
(function () {
  const panel = document.getElementById('panel'); if (!panel) return;
  const app = document.getElementById('app'), flow = document.getElementById('flow'), modal = document.getElementById('modal');
  const acts = panel.querySelector('.acts'), desc = panel.querySelector('.desc');
  const DESC = {
    launch: ['시작 화면', '그 시각의 하늘 위에 로고가 떠 있다가, 하늘이 위로 접히며 로고가 머리글 자리로 가고 시트가 올라와요. 밤에는 별 하늘이 보여요.', '새로고침하면 처음에 나와요.'],
    home: ['오늘 · 여행 전', '여행을 떠나기 전 첫 화면이에요. 내 코스 초안을 보고, 대략 코스 만들기를 시작해요.', '아래 메뉴의 해 아이콘(오늘). 여행 중 화면이면 오른쪽 위 내 정보 동그라미를 눌러 여행 전으로 바꿔요.'],
    flow: ['대략 코스 만들기', '입체 지도 위에서 출발과 도착 지역을 고르고(국내는 시·도, 해외는 나라), 날짜와 사람을 정해 초안으로 저장해요. 자세한 일정은 PC에서 짜요.', '오늘 · 여행 전 화면에서 대략 코스 만들기 버튼을 눌러요.'],
    today: ['오늘 · 여행 중', '다음 장소와 출발까지 남은 시간, 그날 일정을 한눈에 보여 줘요.', '오늘 · 여행 전 화면에서 내 코스 카드(가을 부산)를 눌러요.'],
    course: ['코스', '길게 눌러 순서를 바꾸고, 옆으로 밀어 건너뛰거나 다른 곳으로 바꿔요. 시각, 이동 시간, 1인 예상 비용을 바로 다시 계산해요.', '아래 메뉴의 길 아이콘(코스)을 눌러요.'],
    rain: ['계획이 깨질 때', '비 소식 같은 알림이 오면 대체 장소 두 곳을 보여 주고, 남은 시간 안에 동행과 투표로 정해요.', '오늘 · 여행 중 화면 오른쪽 위 종 버튼을 눌러요. 낮 화면에서만 알림이 와요.'],
    crew: ['동행 채팅', '말풍선 사이에 순서 바꾸기 제안, 지출, 장소, 투표 카드가 섞여요. 빠른 답장과 + 버튼으로 장소 보내기, 투표 만들기, 지출 나누기를 해요.', '아래 메뉴의 사람 아이콘(동행)을 눌러요.'],
    money: ['지출', '금액, 쓴 곳, 낸 사람만 넣어 기록해요. 기록하면 동행 채팅에도 카드로 올라가요.', '아래 메뉴의 지갑 아이콘(지출)을 눌러요.'],
    night: ['밤 화면', '노을 뒤 블루 아워부터 밤까지는 어두운 시트와 카드, 루미너스 코랄 강조색으로 바뀌어요. 웹의 밤 화면과 같은 색이에요.', '해가 지고 10분쯤 지나면 저절로 바뀌어요. 위의 낮·노을·밤 토글로 바로 바꿔 볼 수 있어요.'],
  };
  function pick(k) {
    if (!DESC[k]) return;
    acts.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.k === k));
    if (desc.dataset.k === k) return;
    desc.dataset.k = k; desc.querySelector('b').textContent = DESC[k][0]; desc.querySelector('p').textContent = DESC[k][1]; desc.querySelector('.how span').textContent = DESC[k][2];
    desc.classList.remove('is-in'); void desc.offsetWidth; desc.classList.add('is-in');
  }
  // 앱이 지금 보여 주는 화면
  function current() {
    if (app.classList.contains('is-launch')) return 'launch';
    if (flow.classList.contains('is-open')) return 'flow';
    if (modal.classList.contains('is-open') && modal.querySelector('.alert-head')) return 'rain';
    const tab = app.dataset.tab;
    if (tab === 'home') return app.classList.contains('is-trip') ? 'today' : 'home';
    return tab;
  }
  let last = '';
  const follow = () => { const k = current(); if (k !== last) { last = k; pick(k); } };
  // 낮·노을·밤 토글: 앱 하늘을 바꾸고, 앱의 시간대를 따라 토글도 맞춤 (새벽은 노을, 블루 아워는 밤 칸에 표시)
  const dn = panel.querySelector('.daynight');
  const syncDN = () => { const ph = app.dataset.phase, ui = ph === 'dawn' || ph === 'sunset' ? 'sunset' : ph === 'day' ? 'day' : 'night'; dn.dataset.on = ui; dn.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ui === ui))); };
  dn.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && window.EODI_M_SKY) { window.EODI_M_SKY(b.dataset.ui); syncDN(); } });
  new MutationObserver(syncDN).observe(app, { attributes: true, attributeFilter: ['data-phase'] }); syncDN();
  acts.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) pick(b.dataset.k); });
  const mo = new MutationObserver(follow);
  [app, flow, modal].forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['class', 'data-tab'] }));
  follow();
})();

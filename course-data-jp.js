// 해외(일본) 코스 만들기·내 코스 화면의 예시 데이터 (Figma '해외 2-2 ~ 해외 5'와 같은 내용)
// course.js가 국내 데이터(course-data.js) 대신 이 묶음을 받으면 해외 화면이 됨: 인천 출발, 비행·JR·렌터카 이동, 숙소, 출발 전 확인
// 시간, 항공편, 금액, 날씨, 환율은 모두 예시. 실제 서비스에서는 서버 데이터로 바꿔 끼움.
(function () {
  const CITY = {
    incheon: { name: '인천공항', lat: 37.46, lon: 126.44 },
    chitose: { name: '신치토세', lat: 42.79, lon: 141.68 },
    haneda: { name: '하네다', lat: 35.55, lon: 139.78 },
    kansai: { name: '간사이 공항', lat: 34.43, lon: 135.24 },
    sapporo: { name: '삿포로', lat: 43.062, lon: 141.354 },
    biei: { name: '비에이', lat: 43.49, lon: 142.61 },
    furano: { name: '후라노', lat: 43.34, lon: 142.38 },
    otaru: { name: '오타루', lat: 43.197, lon: 141.0 },
    noboribetsu: { name: '노보리베츠', lat: 42.497, lon: 141.15 },
    niseko: { name: '니세코', lat: 42.86, lon: 140.69 },
    hakodate: { name: '하코다테', lat: 41.77, lon: 140.73 },
    tokyo: { name: '도쿄', lat: 35.68, lon: 139.76 },
    hakone: { name: '하코네', lat: 35.233, lon: 139.1 },
    osaka: { name: '오사카', lat: 34.669, lon: 135.501 },
    kyoto: { name: '교토', lat: 35.0, lon: 135.77 },
    fukuoka: { name: '후쿠오카', lat: 33.59, lon: 130.40 },
  };

  // 삿포로 세부 코스: 평면 지도(assets/course/sapporo-flat.png, 1920x1080, OpenStreetMap으로 그림) 위 좌표
  const SAPPORO_STOPS = [
    { id: 'station', t: '14:20', name: '삿포로역', note: '신치토세에서 JR 쾌속 37분', x: 1324, y: 337, move: '도보 10분' },
    { id: 'odori', t: '15:00', name: '오도리 공원', note: '삿포로 눈축제, 2시간', x: 1288, y: 495, hot: true, move: '도보 5분' },
    { id: 'clock', t: '17:10', name: '시계탑', note: '20분 머묾', x: 1360, y: 446, move: '도보 12분' },
    { id: 'susukino', t: '18:30', name: '스스키노 라멘 요코초', note: '저녁 1시간', card: '저녁', x: 1356, y: 572, move: '전차와 로프웨이 30분' },
    { id: 'moiwa', t: '20:00', name: '모이와산 전망대', note: '야경 1시간', card: '야경', x: 955, y: 958, move: '택시 15분' },
    { id: 'stay', t: '21:30', name: '스스키노 숙소', note: '체크인', card: '2박', x: 1404, y: 599 },
  ];
  // AI가 짠 삿포로 세부 코스 (해외 4-2): 같은 자리, 장소마다 이유
  const SAPPORO_AI = [
    { id: 'station', t: '14:17', name: '삿포로역', note: 'JR 쾌속 도착', x: 1324, y: 337, move: '도보 10분', why: '숙소에 짐 먼저, 스스키노까지 지하철 두 정거장' },
    { id: 'odori', t: '15:00', name: '오도리 공원', note: '삿포로 눈축제, 2시간', x: 1288, y: 495, hot: true, move: '도보 5분', why: '조각은 서쪽 끝 11초메 쪽이 덜 붐벼요', mapWhy: '낮 조각 먼저, 17시 조명 켜지면 한 번 더',
      alts: [{ name: '삿포로 TV 타워 전망대', sub: '도보 3분', x: 1396, y: 470 }, { name: '스스키노 얼음 조각', sub: '도보 10분', x: 1350, y: 588 }] },
    { id: 'clock', t: '17:10', name: '시계탑', note: '20분', x: 1360, y: 446, move: '도보 12분', why: '해 지는 16:50 뒤라 불 켜진 시계탑' },
    { id: 'susukino', t: '18:30', name: '스스키노 라멘 요코초', note: '저녁 1시간', x: 1356, y: 572, move: '전차와 로프웨이 30분', why: '축제 날 저녁엔 19시 전에 들어가야 덜 기다려요' },
    { id: 'moiwa', t: '20:00', name: '모이와산 전망대', note: '야경 1시간', x: 955, y: 958, move: '택시 15분', why: '로프웨이 마지막이 21:30, 내려와서 택시' },
    { id: 'stay', t: '21:30', name: '스스키노 숙소', note: '체크인', x: 1404, y: 599, why: '축제장과 라멘 골목이 걸어서 닿는 곳' },
  ];
  // 평면 지도에 늘 보이는 이름 있는 장소 (검은 점)
  const SAPPORO_PLACES = [
    { id: 'nijo', name: '니조 시장', kind: '시장', x: 1404, y: 537, line: '아침부터 해산물 덮밥을 파는 오래된 시장.', near: '4번에서 도보 5분' },
    { id: 'hokudai', name: '홋카이도 대학', kind: '볼거리', x: 1199, y: 191, line: '은행나무 길과 눈 덮인 캠퍼스.', near: '1번에서 도보 10분' },
    { id: 'beer', name: '삿포로 맥주 박물관', kind: '박물관', x: 1558, y: 288, line: '붉은 벽돌 옛 제당 공장, 시음과 징기스칸.', near: '1번에서 버스 15분' },
    { id: 'nakajima', name: '나카지마 공원', kind: '공원', x: 1365, y: 762, line: '연못과 옛 귀빈관이 있는 도심 공원.', near: '6번에서 도보 10분' },
    { id: 'maruyama', name: '마루야마 공원', kind: '공원', x: 865, y: 613, line: '원시림 사이 산책길과 동물원.', near: '2번에서 지하철 10분' },
    { id: 'jingu', name: '홋카이도 신궁', kind: '신사', x: 776, y: 595, line: '마루야마 숲속의 신사, 겨울에는 눈길.', near: '2번에서 지하철 15분' },
    { id: 'okurayama', name: '오쿠라야마 전망대', kind: '전망대', x: 583, y: 683, line: '스키 점프대 꼭대기에서 보는 삿포로 시내.', near: '2번에서 택시 25분' },
  ];
  // 장소 카드의 자세한 정보와 사진 (사진 출처: assets/course/CREDITS.md, 운영 시간·요금은 예시)
  const PLACE_INFO = {
    nijo: { meta: ['시장', '주오구', '4번에서 도보 5분'], photos: ['place-nijo-1.jpg'],
      info: [['운영', '7:00부터 18:00까지, 가게마다 다름'], ['입장', '무료'], ['추천 시간', '아침, 해산물 덮밥'], ['붐비는 때', '주말 점심', true], ['편의', '현금 챙기기']], tags: ['시장', '해산물', '아침'], eta: '2일차 아침, 렌터카 출발 전에 들르기 좋아요' },
    hokudai: { meta: ['캠퍼스', '기타구', '1번에서 도보 10분'], photos: ['place-hokudai-1.jpg', 'place-hokudai-2.jpg', 'place-hokudai-3.jpg', 'place-hokudai-4.jpg'],
      info: [['운영', '낮 동안 개방'], ['입장', '무료'], ['추천 시간', '눈 온 다음 날 오전'], ['붐비는 때', '가을 은행나무 철', true], ['편의', '학생 식당, 기념품점']], tags: ['산책', '눈길', '사진 명소', '무료'] },
    beer: { meta: ['박물관', '히가시구', '1번에서 버스 15분'], photos: ['place-beer-1.jpg', 'place-beer-2.jpg', 'place-beer-3.jpg', 'place-beer-4.jpg'],
      info: [['운영', '11:00부터 18:00까지'], ['입장', '무료, 시음은 유료'], ['추천 시간', '오후, 저녁은 옆 비어가든'], ['붐비는 때', '주말 저녁', true], ['편의', '시음 코너, 징기스칸 식당']], tags: ['맥주', '역사', '실내'] },
    nakajima: { meta: ['공원', '주오구', '6번에서 도보 10분'], photos: ['place-nakajima-1.jpg', 'place-nakajima-2.jpg', 'place-nakajima-3.jpg'],
      info: [['운영', '24시간 개방'], ['입장', '무료'], ['추천 시간', '낮 산책'], ['붐비는 때', '눈축제 기간 낮', true], ['편의', '옛 귀빈관, 콘서트홀']], tags: ['공원', '산책', '연못', '무료'] },
    maruyama: { meta: ['공원', '주오구', '2번에서 지하철 10분'], photos: ['place-maruyama-1.jpg', 'place-maruyama-2.jpg'],
      info: [['운영', '24시간, 동물원은 9:30부터'], ['입장', '무료'], ['추천 시간', '오전'], ['붐비는 때', '봄 벚꽃 철', true], ['편의', '동물원, 홋카이도 신궁과 이어짐']], tags: ['공원', '숲', '산책', '무료'] },
    jingu: { meta: ['신사', '주오구', '2번에서 지하철 15분'], photos: ['place-jingu-1.jpg', 'place-jingu-2.jpg', 'place-jingu-3.jpg'],
      info: [['운영', '7:00부터 16:00까지 (겨울)'], ['입장', '무료'], ['추천 시간', '눈 온 아침'], ['붐비는 때', '새해 첫 주', true], ['편의', '신궁 안 찻집']], tags: ['신사', '숲', '눈길', '무료'] },
    okurayama: { meta: ['전망대', '주오구', '2번에서 택시 25분'], photos: ['place-okurayama-1.jpg', 'place-okurayama-2.jpg', 'place-okurayama-3.jpg'],
      info: [['운영', '9:00부터 17:00까지'], ['입장', '리프트 왕복 1,000엔 (약 9,000원)'], ['추천 시간', '맑은 오후'], ['붐비는 때', '주말 낮', true], ['편의', '동계 스포츠 박물관']], tags: ['전망대', '스키 점프', '도시 전망'] },
  };
  for (const p of SAPPORO_PLACES) Object.assign(p, PLACE_INFO[p.id] || {});
  // 고르면 열리는 큰 장소 카드 (사진: 위키미디어 공용, assets/course/CREDITS.md)
  const TV_TOWER = {
    id: 'tv', name: '삿포로 TV 타워', kind: '전망대', x: 1396, y: 470,
    meta: ['전망대', '오도리 공원 동쪽 끝', '2번에서 도보 3분'],
    line: '눈축제 조각이 늘어선 오도리 공원을 위에서 한눈에.',
    photos: ['sapporo-tv-festival.jpg', 'sapporo-tv-view.jpg', 'sapporo-tv-night.jpg', 'sapporo-tv-snow.jpg'],
    info: [['운영', '9:00부터 22:00까지'], ['입장', '1,000엔 (약 9,000원)'], ['추천 시간', '해 진 뒤, 눈 조각에 불이 켜질 때'], ['붐비는 때', '눈축제 기간 저녁, 표를 미리 사기', true], ['편의', '1층 기념품점, 엘리베이터']],
    tags: ['전망대', '야경', '눈축제', '실내'],
    eta: '시계탑 뒤 17:40 도착, 라멘은 18:30',
  };
  const NEARBY = [
    { id: 'tv', name: '삿포로 TV 타워', sub: '오도리 공원에서 도보 3분' },
    { id: 'nijo', name: '니조 시장', sub: '스스키노에서 도보 5분' },
    { id: 'nakajima', name: '나카지마 공원', sub: '숙소에서 도보 10분' },
  ];

  const people = { ji: ['지', '#FF8A3D'], min: ['민', '#7FD3E6'], seo: ['서', '#C9DD5A'] };
  const plane = (text, tag) => ({ kind: 'plane', text, tag });
  const train = (text) => ({ kind: 'train', text });
  const car = (text) => ({ kind: 'car', text });

  const HOKKAIDO = {
    id: 'hokkaido', name: '겨울 홋카이도 2박 3일', status: 'upcoming', dday: 'D-77', dates: '2월 6일 금부터 8일 일까지', people: ['ji', 'min', 'seo'],
    air: 'chitose', flyNote: '인천에서 2시간 50분', left: ['otaru', 'furano'],
    days: [
      { label: '1일차', date: '2월 6일 금', cities: [
        { key: 'sapporo', move: [plane('인천 09:10 출발, 신치토세 12:00 도착', '예약됨'), train('신치토세 13:40 JR, 삿포로 14:17 도착')],
          stops: SAPPORO_STOPS.filter((s) => s.id !== 'stay').map((s) => ({ t: s.t, name: s.name, note: s.hot ? '눈축제' : s.card || '', hot: s.hot })), stay: ['스스키노 숙소, 2박', '예약됨'] },
      ] },
      { label: '2일차', date: '2월 7일 토', cities: [
        { key: 'biei', move: car('삿포로 08:30 렌터카, 비에이 11:00 도착'), stops: [{ t: '11:00', name: '청의 호수', note: '' }, { t: '12:30', name: '흰수염 폭포', note: '' }] },
        { key: 'furano', move: car('차 40분'), stops: [{ t: '15:00', name: '닝구르 테라스', note: '' }] },
      ] },
      { label: '3일차', date: '2월 8일 일', cities: [
        { key: 'otaru', move: train('삿포로 10:00 JR, 오타루 10:40 도착'), stops: [{ t: '10:40', name: '오타루 운하', note: '' }, { t: '13:00', name: '르타오 본점', note: '디저트' }] },
      ], end: plane('신치토세 19:30 출발, 인천 22:20 도착', '예약됨') },
    ],
    alert: { kind: 'check', text: '출발 전 확인 3개 남았어요' },
    local: ['시차 없음', '삿포로 영하 4도', '100엔 약 900원'],
    check: [
      { name: '여권', note: '2029년 3월까지 유효', done: true },
      { name: '입국', note: '무비자 90일', done: true },
      { name: '항공권', note: '왕복 예약됨', done: true },
      { name: '숙소', note: '스스키노 2박 예약됨', done: true },
      { name: 'Visit Japan Web', note: '입국 심사와 세관 QR 미리 만들기' },
      { name: '엔화와 카드', note: '포장마차는 현금만, 2만 엔쯤' },
      { name: '방한 준비', note: '눈길에 미끄럽지 않은 신발' },
    ],
  };
  const COURSES = [
    {
      id: 'tokyo', name: '도쿄 연말 3박 4일', status: 'upcoming', dday: 'D-36', dates: '12월 27일 토부터 30일 화까지', people: ['min', 'ji'], shared: '민이 공유, 함께 고치기',
      air: 'haneda', flyNote: '인천에서 2시간 20분',
      days: [
        { label: '1일차', date: '12월 27일 토', cities: [{ key: 'tokyo', move: [plane('인천 09:05 출발, 하네다 11:25 도착', '예약됨'), train('하네다 13:10 모노레일, 하마마쓰초 13:40 도착')],
          stops: [{ t: '14:30', name: '아사쿠사 센소지', note: '' }, { t: '17:00', name: '시부야 스크램블 교차로', note: '' }, { t: '19:00', name: '신주쿠 오모이데요코초', note: '저녁' }], stay: ['신주쿠 숙소, 3박', '예약됨'] }] },
        { label: '2일차', date: '12월 28일 일', cities: [{ key: 'hakone', move: train('신주쿠 08:30 로망스카, 하코네유모토 10:00 도착'),
          stops: [{ t: '10:30', name: '하코네 로프웨이', note: '' }, { t: '13:00', name: '오와쿠다니', note: '검은 달걀' }, { t: '16:00', name: '노천 온천', note: '' }] }] },
        { label: '3일차', date: '12월 29일 월', cities: [{ key: 'tokyo', move: train('하코네유모토 09:00 로망스카, 신주쿠 10:30 도착'),
          stops: [{ t: '11:00', name: '쓰키지 장외시장', note: '점심' }, { t: '15:00', name: '오다이바', note: '' }, { t: '20:00', name: '도쿄 타워 야경', note: '' }] }] },
        { label: '4일차', date: '12월 30일 화', cities: [{ key: 'tokyo', stops: [{ t: '10:00', name: '긴자 쇼핑', note: '' }, { t: '13:00', name: '도쿄역 에키벤', note: '점심' }] }],
          end: plane('하네다 19:40 출발, 인천 22:05 도착', '예약됨') },
      ],
      alert: {
        text: '돌아오는 비행편 시각이 바뀌었어요, 19:40에서 20:25로', source: '항공사 안내, 오늘 08:40', city: 'haneda', day: 3, side: 'rb', map: '돌아오는 비행 20:25 출발, 인천 22:50 도착',
        changes: [{ end: true, from: '하네다 19:40 출발, 인천 22:05 도착', to: '하네다 20:25 출발, 인천 22:50 도착', note: '항공사가 출발을 45분 늦춤' }],
      },
    },
    HOKKAIDO,
    {
      id: 'kansai', name: '오사카와 교토 벚꽃', status: 'draft', ai: true, dates: '', people: [], air: 'kansai',
      days: [
        { label: '1일차', date: '', cities: [{ key: 'osaka', move: plane('인천에서 간사이 공항으로'), stops: [{ t: '', name: '도톤보리', note: '' }, { t: '', name: '오사카성', note: '' }, { t: '', name: '구로몬 시장', note: '' }] }] },
        { label: '2일차', date: '', cities: [{ key: 'kyoto', move: train('오사카에서 교토로'), stops: [{ t: '', name: '철학의 길', note: '' }, { t: '', name: '기온 시라카와', note: '' }] }] },
      ],
    },
  ];
  const PAST = [{ name: '후쿠오카 나카스 1박 2일', dates: '9월 13일, 14일' }];

  // 코스가 없을 때: 이번 시즌 일본 축제로 바로 시작
  const STARTERS = [
    { id: 'snow', name: '삿포로 눈축제 2박 3일', when: '2월', meta: ['인천, 삿포로', '장소 6곳', '비행 2시간 50분'], route: ['incheon', 'sapporo'], spot: 'sapporo', spotLabel: '삿포로 눈축제', air: 'chitose', flyNote: '인천에서 2시간 50분' },
    { id: 'kyoto', name: '교토 단풍 2박 3일', when: '11월 절정', meta: ['인천, 교토', '장소 5곳', '비행 1시간 50분'], route: ['incheon', 'kyoto'], spot: 'kyoto', spotLabel: '교토 단풍', air: 'kansai', flyNote: '인천에서 1시간 50분' },
    { id: 'nakasu', name: '후쿠오카 포장마차 1박 2일', when: '언제나', meta: ['인천, 후쿠오카', '장소 4곳', '비행 1시간 20분'], route: ['incheon', 'fukuoka'], spot: 'fukuoka', spotLabel: '나카스 포장마차' },
  ];

  // AI 코스 제작
  const HOME_PIN = { key: 'incheon', label: '인천공항', sub: '출발·도착', cls: 'is-start' };
  const AI = {
    request: '2월에 친구 셋이 홋카이도 2박 3일. 눈축제는 꼭, 운전은 하루만.',
    chips: ['2월 6일 금부터 8일 일까지', '인천 출발', '3명', '1인 90만 원 안쪽', '렌터카 하루만', '눈축제 꼭', '도시마다 세부 코스까지'],
    steps: [
      ['요청 읽기', '2월 6일부터 8일 / 3명 / 운전은 하루만'],
      ['그 주 축제와 항공편 찾기', '삿포로 눈축제, 인천에서 신치토세 직항'],
      ['도시 순서와 이동 맞추기', '삿포로, 비에이, 후라노, 오타루'],
      ['도시마다 세부 코스 짜기', '삿포로: 눈축제 앞뒤로 장소 고르는 중'],
      ['제안 3개로 정리', ''],
    ],
    // 만드는 중 왼쪽 미리보기 줄: [도시, 글, 보이는 단계, 점 색, 이름]
    genLines: [['sapporo', '12:00 신치토세 도착, 15:00 오도리 공원 눈축제', 3, 'var(--sky)'], ['biei', '08:30 렌터카, 청의 호수와 흰수염 폭포', 4, 'var(--bright)', '비에이, 후라노'], ['otaru', '', 5, 'var(--sky2)']],
    // 만드는 중 지도: 단계마다 비행 점선, 도시가 하나씩 생기고, 고르는 중인 후보 도시가 깜빡임
    genSpec(st) {
      const spec = { segs: [], pins: [HOME_PIN], glow: [], bubbles: [] };
      if (st >= 1) { spec.segs.push({ a: 'incheon', b: 'chitose', cls: 'fly' }); spec.pins.push({ key: 'chitose', label: '신치토세', cls: 'is-air' }); spec.bubbles.push({ key: 'mid:incheon:chitose', text: '인천에서 2시간 50분', side: 'mid', icon: 'plane' }); }
      if (st >= 2) {
        spec.segs.push({ a: 'chitose', b: 'sapporo', cls: 'd1' }, { a: 'sapporo', b: 'biei', cls: 'draw' });
        spec.pins.push({ key: 'sapporo', label: '삿포로', sub: st >= 3 ? '세부 코스 짜는 중' : '', num: 1, cls: 'is-hot is-subsky' }, { key: 'biei', label: '비에이', sub: '2곳', num: 2, cls: 'd2 is-dim' }, { key: 'furano', label: '후라노', sub: '1곳', num: 3, cls: 'd2 is-dim' }, { key: 'otaru', label: '오타루', sub: '2곳', num: 4, left: true, cls: 'd3 is-dim' });
        spec.glow.push('sapporo');
      }
      if (st < 3) for (const k of ['noboribetsu', 'niseko', 'hakodate']) spec.pins.push({ key: k, label: CITY[k].name, cls: 'is-cand' });
      return spec;
    },
    proposals: [
      { id: 'a', name: '눈축제와 설원 2박 3일', route: ['incheon', 'sapporo', 'biei', 'furano', 'otaru'], days: [1, 2, 2, 3], air: 'chitose', flyNote: '인천에서 2시간 50분', course: 'hokkaido', as: HOKKAIDO,
        meta: ['장소 8곳', '비행 왕복 5시간 40분', '렌터카 1일', '!1인 약 84만 원'],
        why: '첫날 저녁 눈축제 조명에 맞추고, 운전은 둘째 날 설원만. 오타루는 공항 가는 길에.',
        detail: [['sapporo', ['12:00 신치토세 도착, 15:00 오도리 공원 눈축제', '!20:00 모이와산 야경, 스스키노 2박'], null, '1일차'], ['biei', ['08:30 렌터카, 청의 호수와 흰수염 폭포', '16:00 닝구르 테라스, 삿포로로'], '비에이, 후라노', '2일차'], ['otaru', ['10:40 오타루 운하, 르타오 본점', '19:30 신치토세 출발, 22:20 인천'], null, '3일차']],
        subs: { sapporo: '세부 6곳', biei: '2곳', furano: '1곳', otaru: '2곳' }, left: ['otaru', 'furano'], alt: ['noboribetsu'],
        stepper: [['sapporo', '삿포로'], ['biei', '비에이, 후라노'], ['otaru', '오타루']],
        reasons: [['sapporo', '눈축제 조명은 17시부터, 오도리 공원은 해 진 뒤', 'lb'], ['biei', '운전은 2일차 하루만, 눈길이라 4륜 렌터카', 'r'], ['chitose', '첫 비행기면 12시 도착, 조명 전에 삿포로', 'rb'], ['otaru', '오타루는 공항 가는 JR 노선 위, 마지막 날에', 'lt']] },
      { id: 'b', name: '삿포로 도심과 오타루 2박 3일', route: ['incheon', 'sapporo', 'otaru'], days: [1, 3], air: 'chitose', flyNote: '인천에서 2시간 50분', course: null,
        meta: ['장소 9곳', '운전 없음', '세부 코스 포함', '!1인 약 72만 원'],
        why: '운전 없이 기차로만. 삿포로에 이틀 머물며 눈축제를 낮과 밤 두 번.',
        detail: [['sapporo', ['14:20 삿포로역, 오도리 공원 눈축제', '!2일차 스스키노 얼음 조각, 모이와산 야경'], null, '1일차'], ['otaru', ['10:40 오타루 운하, 텐구산 야경'], null, '3일차']],
        subs: { sapporo: '세부 6곳', otaru: '3곳' }, left: ['otaru'],
        reasons: [['sapporo', '이틀 머물러 눈축제를 낮과 밤 두 번', 'l'], ['otaru', 'JR로 40분, 공항 가는 길', 'lb']] },
      { id: 'c', name: '눈축제와 노보리베츠 온천 2박 3일', route: ['incheon', 'sapporo', 'noboribetsu'], days: [1, 2], air: 'chitose', flyNote: '인천에서 2시간 50분', course: null,
        meta: ['장소 7곳', '료칸 1박', '1인 약 98만 원', '예산보다 8만 원 높음'],
        why: '둘째 날은 료칸에서 온천과 가이세키. 공항까지 버스 1시간이라 마지막 날이 여유로워요.',
        detail: [['sapporo', ['14:20 삿포로역, 오도리 공원 눈축제', '!20:00 모이와산 야경'], null, '1일차'], ['noboribetsu', ['13:00 지옥 계곡, 료칸 체크인', '!18:00 가이세키 저녁, 노천 온천'], null, '2일차']],
        subs: { sapporo: '세부 6곳', noboribetsu: '2곳' },
        reasons: [['noboribetsu', '공항까지 버스 1시간, 마지막 날이 여유로워요', 'lb']] },
    ],
    refine: ['더 여유롭게', '온천 하루 넣기', '운전 없이'],
  };

  // 코스 화면의 카메라: 내 코스는 일본 전체를 왼쪽 칸만큼 오른쪽으로, 코스를 열면 그 코스 도시들로 다가감
  const WHOLE = { lat: 36.9, lon: 133.4, dist: 47, pitch: 50 };
  const around = (keys) => {
    const pts = keys.map((k) => (typeof k === 'string' ? CITY[k] : k)).filter((p) => p && isFinite(p.lat) && isFinite(p.lon)); // 담은 장소로 만든 코스는 도시 키 없이 위도·경도만 있음
    if (!pts.length) return WHOLE;
    const la = pts.map((p) => p.lat), lo = pts.map((p) => p.lon);
    const span = Math.max(Math.max(...la) - Math.min(...la), (Math.max(...lo) - Math.min(...lo)) * 0.75, 1.2);
    const dist = Math.min(46, 7 + span * 6.5);
    return { lat: (Math.max(...la) + Math.min(...la)) / 2 - 0.15, lon: (Math.max(...lo) + Math.min(...lo)) / 2 - dist * 0.075, dist, pitch: 50 };
  };
  const cityKeys = (c) => c.days.flatMap((d) => d.cities.map((ct) => ct.key || (ct.lat != null ? { lat: ct.lat, lon: ct.lon } : null))).filter(Boolean);
  function COURSE_POSE(view, c, S) {
    if (view === 'edit' && c && c.days.some((d) => d.cities.length)) return around(cityKeys(c).concat(c.air ? [c.air] : []));
    if (view === 'ai' || view === 'ai-gen') { const P = AI.proposals[view === 'ai' ? S.ai.sel : 0]; return around(P.route.slice(1).concat(P.air ? [P.air] : [], P.alt || [])); }
    return WHOLE;
  }

  window.EODI_COURSE_DATA_JP = {
    id: 'jp', CITY, people, COURSES, PAST, STARTERS, AI, COURSE_POSE, COURSE_POSE_FALLBACK: WHOLE, AIRPORTS: ['chitose', 'haneda', 'kansai'],
    HOME: { key: 'incheon', label: '인천공항', short: '인천', sub: '출발·도착', start: '인천 출발', pin: false },
    DAY_COLORS: ['var(--sky)', 'var(--bright)', 'var(--sky2)'],
    DEMO: { course: 'hokkaido', alert: 'tokyo' },
    FLAT: { key: 'sapporo', img: 'assets/course/sapporo-flat.png', stops: SAPPORO_STOPS, aiStops: SAPPORO_AI, places: SAPPORO_PLACES, special: TV_TOWER, specialAt: 3, districts: [], nearby: NEARBY,
      event: '눈축제', eventPick: 'sapporo-snow', moveSum: '이동 1시간 10분', aiMoveSum: '이동 1시간 12분', mpp: 6.3,
      similar: ['전망대', '시장', '공원', '신사', '박물관'], cats: { 먹거리: ['시장', '음식점'], 카페: ['카페'], 볼거리: ['전망대', '박물관', '신사', '볼거리'], 자연: ['공원', '전망대'] } },
    TXT: {
      mine: '해외 코스', redate: '항공편도 다시 찾아요', directSub: '지도에서 일본 장소를 골라 담기',
      aiHint: '2월에 친구 셋이 홋카이도, 눈축제는 꼭 보고 싶어', aiConds: ['날짜', '출발 공항', '인원', '예산'],
      startersT: '이번 시즌 일본 축제로 바로 시작', startersSub: '인천 출발 기준', starterMove: (n) => ({ kind: 'plane', text: `인천에서 ${n}으로` }),
      propsSub: '요청과 눈축제 일정, 항공편을 보고 만들었어요', genTime: '보통 8초쯤 걸려요',
      aiFoot: '눈축제 일정, 해 지는 시각, 붐비는 시간, 이동 시간을 보고 정했어요. 장소를 눌러 바로 고칠 수 있어요.',
      newDates: '2월 6일 금부터 8일 일까지', newDday: 'D-77',
      other: { text: '국내 코스 3개는 국내 지도에서 보여요', btn: '국내로', mode: 'domestic' },
    },
  };
})();

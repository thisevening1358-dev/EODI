// 코스 만들기·내 코스 화면의 예시 데이터 (Figma 시안 '코스 만들기 1~4-2', '내 코스 5-1~5-4'와 같은 내용)
// 시간, 열차, 축제 공지, 사진은 모두 예시. 실제 서비스에서는 서버 데이터로 바꿔 끼움.
(function () {
  // 전국 지도 위 도시 자리 (위도, 경도)
  const CITY = {
    seoul: { name: '서울역', lat: 37.5547, lon: 126.9707 },
    gyeongju: { name: '경주', lat: 35.79, lon: 129.332 },
    busan: { name: '부산', lat: 35.15, lon: 129.08 },
    jinju: { name: '진주', lat: 35.186, lon: 128.09 },
    gangneung: { name: '강릉', lat: 37.7519, lon: 128.8761 },
    jeonju: { name: '전주', lat: 35.8150, lon: 127.1530 },
    suncheon: { name: '순천', lat: 34.9506, lon: 127.4872 },
  };

  // 부산 세부 코스: 평면 지도(assets/course/busan-flat.png, 1920x1080) 위 좌표
  const BUSAN_STOPS = [
    { id: 'busanst', t: '14:20', name: '부산역', note: 'KTX 도착', x: 995, y: 660, move: '버스 20분', why: '숙소 체크인 전이라 짐은 역 보관함에' },
    { id: 'gamcheon', t: '15:00', name: '감천문화마을', note: '1시간 30분 머묾', stay: 90, x: 824, y: 779, move: '버스 15분', why: '오후 빛이 골목 벽에 들 때, 단체 관광은 오전에 몰려요' },
    { id: 'jagalchi', t: '16:50', name: '자갈치시장', note: '저녁 1시간', x: 934, y: 785, move: '지하철 35분', why: '축제 전에 저녁, 18시가 넘으면 줄이 길어요' },
    { id: 'gwangalli', t: '19:00', name: '광안리 해변', note: '부산 불꽃축제, 2시간', x: 1421, y: 403, hot: true, move: '도보 8분', why: '자리는 17시 전에, 민락수변공원 쪽이 덜 붐벼요',
      alts: [{ name: '민락수변공원', sub: '도보 10분', x: 1492, y: 388 }, { name: '이기대 조망바위', sub: '택시 12분', x: 1442, y: 601 }] },
    { id: 'stay', t: '21:30', name: '광안리 숙소', note: '체크인', x: 1401, y: 371, why: '축제 뒤 택시 줄을 피해 걸어서 닿는 곳' },
  ];

  // 평면 지도에 늘 보이는 이름 있는 장소 (검은 점)
  const BUSAN_PLACES = [
    { id: 'haeundae', name: '해운대해수욕장', kind: '해변', x: 1642, y: 366, line: '부산을 대표하는 긴 백사장.', near: '숙소에서 지하철 20분' },
    { id: 'dongbaek', name: '동백섬', kind: '산책', x: 1608, y: 405, line: '해운대 끝 동백 숲을 도는 바닷길.', near: '숙소에서 버스 18분' },
    { id: 'igidae', name: '이기대공원', kind: '자연', x: 1442, y: 601, line: '바위 해안 산책로, 광안대교가 정면으로.', near: '4번에서 택시 12분', photo: 'igidae.jpg' },
    { id: 'oryukdo', name: '오륙도 스카이워크', kind: '전망대', x: 1448, y: 758, line: '바다 위로 뻗은 유리 다리.', near: '4번에서 택시 20분' },
    { id: 'citizen', name: '부산시민공원', kind: '공원', x: 1089, y: 301, line: '옛 미군 기지를 돌려받아 만든 도심 공원.', near: '부산역에서 지하철 20분' },
    { id: 'seomyeon', name: '서면', kind: '거리', x: 1096, y: 372, line: '밤늦게까지 붐비는 부산의 번화가.', near: '부산역에서 지하철 12분' },
    { id: 'gukje', name: '국제시장', kind: '시장', x: 923, y: 754, line: '깡통시장과 이어진 오래된 골목 시장.', near: '3번에서 도보 5분' },
    { id: 'huinnyeoul', name: '흰여울문화마을', kind: '마을', x: 1011, y: 908, line: '영도 절벽 위 바다를 따라 늘어선 흰 집들.', near: '3번에서 버스 15분' },
    { id: 'taejongdae', name: '태종대', kind: '자연', x: 1227, y: 1078, line: '영도 끝 절벽과 등대.', near: '3번에서 버스 30분' },
    { id: 'songdo', name: '송도해수욕장', kind: '해변', x: 860, y: 927, line: '바다 위 구름다리와 케이블카.', near: '3번에서 버스 20분' },
  ];
  // 고르면 열리는 큰 장소 카드 (사진 여러 장과 자세한 정보)
  const MINRAK = {
    id: 'minrak', name: '민락수변공원', kind: '공원', x: 1492, y: 388,
    meta: ['공원', '수영구 민락동', '광안리 해변에서 도보 10분'],
    line: '광안대교를 정면으로 마주한 계단식 수변. 밤바다와 다리 불빛을 앉아서 보기 좋은 곳.',
    photos: ['minrak-night.jpg', 'minrak-day.jpg', 'minrak-fireworks.jpg', 'minrak-sunset.jpg'],
    info: [['운영', '24시간 개방'], ['입장', '무료'], ['추천 시간', '해 질 녘부터 밤까지'], ['붐비는 때', '불꽃축제 날 저녁, 자리 일찍 맡기', true], ['편의', '화장실, 편의점 가까움']],
    tags: ['야경', '산책', '사진 명소', '무료'],
    eta: '불꽃축제 뒤 21:10 도착, 숙소는 21:50',
  };
  // 장소 카드의 자세한 정보와 사진 (Figma 장소 카드처럼). 사진 출처: assets/course/CREDITS.md. 운영 시간·요금은 예시
  const PLACE_INFO = {
    haeundae: { meta: ['해변', '해운대구', '숙소에서 지하철 20분'], line: '부산을 대표하는 1.5km 백사장. 밤에는 마린시티 불빛이 바다에 비쳐요.', photos: ['place-haeundae-1.jpg', 'place-haeundae-2.jpg', 'place-haeundae-3.jpg', 'place-haeundae-4.jpg'],
      info: [['운영', '24시간 개방'], ['입장', '무료'], ['추천 시간', '해 뜰 무렵, 해 진 뒤 야경'], ['붐비는 때', '주말 오후, 축제 날 저녁', true], ['편의', '샤워장, 편의점, 지하철역 가까움']], tags: ['바다', '산책', '야경', '무료'], eta: '2일차 아침 산책으로 넣기 좋아요' },
    dongbaek: { meta: ['산책로', '해운대구', '숙소에서 버스 18분'], line: '해운대 끝 동백 숲을 한 바퀴 도는 바닷길. 등대 전망대에서 광안대교가 보여요.', photos: ['place-dongbaek-1.jpg', 'place-dongbaek-2.jpg', 'place-dongbaek-3.jpg'],
      info: [['운영', '24시간 개방'], ['입장', '무료'], ['추천 시간', '해 질 녘'], ['붐비는 때', '주말 낮', true], ['편의', '누리마루 APEC 하우스, 등대 전망대']], tags: ['산책', '바다', '사진 명소', '무료'] },
    igidae: { meta: ['자연', '남구 용호동', '4번에서 택시 12분'], photos: ['igidae.jpg', 'place-igidae-1.jpg', 'place-igidae-2.jpg'],
      info: [['운영', '24시간 개방, 해안길은 해 지면 어두움'], ['입장', '무료'], ['추천 시간', '오후, 광안대교가 정면으로 보일 때'], ['붐비는 때', '주말 오전', true], ['편의', '입구 주차장과 화장실']], tags: ['산책', '바다', '전망'], eta: '불꽃축제 전 오후 산책, 17시 전에 광안리로' },
    oryukdo: { meta: ['전망대', '남구 용호동', '4번에서 택시 20분'], line: '절벽 끝에서 바다 위로 뻗은 유리 다리. 맑은 날 오륙도 섬들이 한눈에.', photos: ['place-oryukdo-1.jpg', 'place-oryukdo-2.jpg'],
      info: [['운영', '9:00부터 18:00까지'], ['입장', '무료'], ['추천 시간', '맑은 날 오전'], ['붐비는 때', '주말 낮, 입장 줄이 길어요', true], ['편의', '덧신 신고 입장, 해파랑길 시작점']], tags: ['전망대', '바다', '유리 다리', '무료'] },
    citizen: { meta: ['공원', '부산진구', '부산역에서 지하철 20분'], photos: ['place-citizen-1.jpg', 'place-citizen-2.jpg'],
      info: [['운영', '5:00부터 23:00까지'], ['입장', '무료'], ['추천 시간', '오후 산책'], ['붐비는 때', '주말 낮', true], ['편의', '카페, 화장실, 놀이터']], tags: ['공원', '산책', '새 관찰', '무료'] },
    seomyeon: { meta: ['거리', '부산진구', '부산역에서 지하철 12분'], photos: ['place-seomyeon-1.jpg', 'place-seomyeon-2.jpg', 'place-seomyeon-3.jpg'],
      info: [['운영', '가게마다 다름, 밤늦게까지'], ['입장', '무료'], ['추천 시간', '저녁, 돼지국밥 골목'], ['붐비는 때', '금, 토 저녁', true], ['편의', '지하상가, 지하철 1·2호선']], tags: ['미식', '쇼핑', '밤'] },
    gukje: { meta: ['시장', '중구 신창동', '3번에서 도보 5분'], photos: ['place-gukje-1.jpg', 'place-gukje-2.jpg', 'place-gukje-3.jpg'],
      info: [['운영', '9:00부터 20:00까지, 가게마다 다름'], ['입장', '무료'], ['추천 시간', '낮, 깡통시장 야시장은 저녁'], ['붐비는 때', '주말 오후', true], ['편의', '현금 챙기기, 씨앗호떡 골목']], tags: ['시장', '먹거리', '골목'] },
    huinnyeoul: { meta: ['마을', '영도구', '3번에서 버스 15분'], photos: ['place-huinnyeoul-1.jpg', 'place-huinnyeoul-2.jpg', 'place-huinnyeoul-3.jpg'],
      info: [['운영', '24시간, 주민이 사는 곳이라 조용히'], ['입장', '무료'], ['추천 시간', '해 질 녘'], ['붐비는 때', '주말 오후, 사진 찍는 줄', true], ['편의', '바다 쪽 카페 골목, 해안 산책로']], tags: ['바다', '골목', '사진 명소', '무료'] },
    taejongdae: { meta: ['자연', '영도구', '3번에서 버스 30분'], photos: ['place-taejongdae-1.jpg', 'place-taejongdae-2.jpg', 'place-taejongdae-3.jpg', 'place-taejongdae-4.jpg'],
      info: [['운영', '4:00부터 24:00까지'], ['입장', '무료, 다누비 순환 열차는 유료'], ['추천 시간', '오전'], ['붐비는 때', '주말 낮', true], ['편의', '순환 열차, 전망대, 등대']], tags: ['자연', '등대', '절벽'] },
    songdo: { meta: ['해변', '서구', '3번에서 버스 20분'], photos: ['place-songdo-1.jpg', 'place-songdo-2.jpg', 'place-songdo-3.jpg'],
      info: [['운영', '24시간 개방'], ['입장', '무료, 해상 케이블카는 유료'], ['추천 시간', '오후'], ['붐비는 때', '여름 주말', true], ['편의', '해상 케이블카, 구름다리']], tags: ['바다', '케이블카', '산책'] },
  };
  for (const p of BUSAN_PLACES) Object.assign(p, PLACE_INFO[p.id] || {});
  const DISTRICTS = [['해운대구', 1655, 218], ['부산진구', 1032, 353], ['남구', 1263, 583], ['영도구', 1119, 886], ['사하구', 611, 785]];
  const NEARBY = [
    { id: 'minrak', name: '민락수변공원', sub: '광안리에서 도보 10분' },
    { id: 'huinnyeoul', name: '흰여울문화마을', sub: '자갈치시장에서 버스 15분' },
    { id: 'haeundae', name: '해운대 블루라인파크', sub: '숙소에서 지하철 20분' },
  ];

  const people = { ji: ['지', '#FF8A3D'], min: ['민', '#7FD3E6'], seo: ['서', '#C9DD5A'] };

  // 내 코스
  const COURSES = [
    {
      id: 'namdo', name: '가을 남도 1박 2일', status: 'upcoming', dday: '오늘 출발', dates: '11월 21일 금, 22일 토', people: ['ji', 'min', 'seo'],
      days: [
        { label: '1일차', date: '11월 21일 금', cities: [
          { key: 'gyeongju', move: '서울역 07:30 KTX, 경주 09:40 도착', stops: [{ t: '10:20', name: '불국사', note: '2시간 머묾' }] },
          { key: 'busan', move: '경주 12:50 KTX, 부산 13:20 도착', detail: 'busan', stops: BUSAN_STOPS.map((s) => ({ t: s.t, name: s.name, note: s.id === 'gwangalli' ? '불꽃축제' : s.id === 'stay' ? '1박' : '', hot: s.hot })) },
        ] },
        { label: '2일차', date: '11월 22일 토', cities: [
          { key: 'jinju', move: '부산 09:30 시외버스, 진주 11:00 도착', stops: [{ t: '11:00', name: '진주성', note: '1시간 30분' }, { t: '13:00', name: '중앙시장 육전', note: '점심' }, { t: '18:00', name: '남강유등축제', note: '2시간' }, { t: '21:10', name: 'KTX로 서울', note: '' }] },
        ] },
      ],
      check: [
        { name: 'KTX 승차권', note: '서울역 07:30, 왕복 예매됨', done: true },
        { name: '숙소', note: '광안리 1박 예약됨', done: true },
        { name: '불꽃축제 자리', note: '17시 전에, 돗자리 챙기기' },
        { name: '유등축제 시간', note: '18:00에서 18:30으로 바뀜, 확인함', done: true },
        { name: '겉옷', note: '밤바다는 쌀쌀해요, 얇은 패딩' },
        { name: '보조배터리', note: '사진 많이 찍는 날' },
      ],
      local: ['부산 맑음 19도', '해 지는 시각 17:24', '진주 밤 9도'],
      alert: {
        text: '남강유등축제 시작이 18:00에서 18:30으로 바뀌었어요', source: '진주시 축제 공지, 오늘 09:10', city: 'jinju', map: '유등축제 18:30 시작, 서울행은 21:40으로',
        changes: [{ name: '남강유등축제', from: '18:00', to: '18:30', note: '축제가 시작 시간을 바꿈' }, { name: 'KTX로 서울', from: '21:10', to: '21:40', note: '30분 더 머물게, 좌석 있음' }],
      },
    },
    {
      id: 'gangneung', name: '겨울 강릉 바다 1박 2일', status: 'upcoming', dday: 'D-29', dates: '12월 20일 토, 21일 일', people: ['min', 'ji'], shared: '민이 공유, 함께 고치기',
      check: [
        { name: 'KTX 승차권', note: '서울역 08:00, 왕복 예매됨', done: true },
        { name: '숙소', note: '경포 쪽 1박, 아직 고르지 않았어요' },
        { name: '정동진 해돋이', note: '06:50 전에 도착, 택시 미리 부르기' },
        { name: '방한 준비', note: '바닷바람이 세요, 장갑과 목도리' },
      ],
      local: ['강릉 맑음 2도', '해 뜨는 시각 07:36'],
      days: [
        { label: '1일차', date: '12월 20일 토', cities: [{ key: 'gangneung', move: '서울역 08:00 KTX, 강릉 09:55 도착', stops: [{ t: '10:30', name: '안목해변 커피거리', note: '' }, { t: '13:00', name: '초당순두부마을', note: '점심' }, { t: '15:00', name: '경포호', note: '산책' }] }] },
        { label: '2일차', date: '12월 21일 일', cities: [{ key: 'gangneung', move: '', stops: [{ t: '06:50', name: '정동진 해돋이', note: '' }, { t: '10:00', name: '주문진 수산시장', note: '' }, { t: '15:30', name: 'KTX로 서울', note: '' }] }] },
      ],
    },
    {
      id: 'jeonju', name: '전주 한옥과 순천만 갈대', status: 'draft', ai: true, dates: '', people: [],
      days: [
        { label: '1일차', date: '', cities: [{ key: 'jeonju', move: '서울역 KTX, 전주 도착', stops: [{ t: '', name: '전주 한옥마을', note: '' }, { t: '', name: '남부시장', note: '' }, { t: '', name: '경기전', note: '' }] }] },
        { label: '2일차', date: '', cities: [{ key: 'suncheon', move: '전주에서 순천으로', stops: [{ t: '', name: '순천만 습지', note: '' }, { t: '', name: '순천만국가정원', note: '' }, { t: '', name: 'KTX로 서울', note: '' }] }] },
      ],
    },
  ];
  const PAST = [
    { name: '부산 해운대 2박 3일', dates: '8월 9일부터 11일' },
    { name: '여수 밤바다 1박 2일', dates: '6월 14일, 15일' },
    { name: '경주 벚꽃 당일', dates: '4월 5일' },
    { name: '강릉 커피 1박 2일', dates: '2월 22일, 23일' },
  ];

  // 코스가 없을 때: 이번 주말 축제로 바로 시작
  const STARTERS = [
    { id: 'fw', name: '부산 불꽃축제 1박 2일', when: '이번 주말', meta: ['서울, 부산', '장소 5곳', 'KTX 2시간 40분'], route: ['seoul', 'busan'], spot: 'busan', spotLabel: '부산 불꽃축제' },
    { id: 'lt', name: '진주 남강유등축제 당일', when: '30일까지', meta: ['서울, 진주', '장소 4곳', 'KTX 3시간 30분'], route: ['seoul', 'jinju'], spot: 'jinju', spotLabel: '진주 남강유등축제' },
    { id: 'gj', name: '경주 단풍과 불국사', when: '이번 주 절정', meta: ['서울, 경주', '장소 4곳', 'KTX 2시간 10분'], route: ['seoul', 'gyeongju'], spot: 'gyeongju', spotLabel: '경주 단풍' },
  ];

  // AI 코스 제작
  const AI = {
    request: '11월 마지막 주말에 친구 둘이랑 KTX로. 축제 하나는 꼭 보고, 너무 빡빡하지 않게.',
    chips: ['11월 21일 금, 22일 토', '서울역 출발', '3명', '여유롭게', '축제 1곳 이상', '도시마다 세부 코스까지'],
    steps: [
      ['요청 읽기', '11월 21일, 22일 / 3명 / 여유롭게'],
      ['그 주말 축제 찾기', '부산 불꽃축제, 진주 남강유등축제'],
      ['도시 순서와 열차 맞추기', '서울, 경주, 부산, 진주'],
      ['도시마다 세부 코스 짜기', '부산: 불꽃축제 앞뒤로 장소 고르는 중'],
      ['제안 3개로 정리', ''],
    ],
    proposals: [
      { id: 'a', name: '남도 축제 따라 1박 2일', route: ['seoul', 'gyeongju', 'busan', 'jinju'], days: [1, 1, 2], meta: ['장소 7곳', '이동 4시간 10분', '축제 2개'], course: 'namdo',
        why: '불꽃축제 시간에 맞춰 부산에 들어가고, 하루 묵은 뒤 진주 유등축제로.',
        detail: [['gyeongju', ['10:20 불국사, 석굴암까지 버스로']], ['busan', ['14:20 부산역, 감천문화마을, 자갈치시장', '!19:00 광안리 불꽃축제, 바다 앞 숙소']], ['jinju', ['11:00 진주성, 중앙시장 육전', '18:00 남강유등축제, 21:10 KTX로 서울']]],
        reasons: [['gyeongju', '아침 첫 KTX면 불국사가 한산할 때 도착', 'r'], ['busan', '불꽃축제 19:00, 해변 자리는 17시 전에', 'rb'], ['jinju', '유등축제는 해 지고, 2일차 저녁에', 'lb']] },
      { id: 'b', name: '부산 바다만 1박 2일', route: ['seoul', 'busan'], days: [1], meta: ['장소 6곳', '이동 2시간 40분', '축제 1개', '세부 코스 포함'], course: null,
        why: '이동을 줄이고 부산 바다에 오래 머물러요. 불꽃축제와 해운대 아침 산책.',
        detail: [['busan', ['14:20 부산역, 흰여울문화마을, 자갈치시장', '!19:00 광안리 불꽃축제, 2일차 해운대']]],
        reasons: [['busan', '하루를 통째로 바다에, 이동은 KTX 한 번', 'rb']] },
      { id: 'c', name: '전주 한옥과 순천만 갈대', route: ['seoul', 'jeonju', 'suncheon'], days: [1, 2], meta: ['장소 6곳', '이동 3시간 50분', '축제 없음', '세부 코스 포함'], course: 'jeonju',
        why: '축제 대신 한옥 골목과 갈대밭, 붐비지 않는 길로.',
        detail: [['jeonju', ['11:00 한옥마을, 남부시장, 경기전']], ['suncheon', ['10:00 순천만 습지, 해 질 녘 용산전망대']]],
        reasons: [['jeonju', '토요일 오전이라 한옥마을이 덜 붐벼요', 'l'], ['suncheon', '갈대는 해 질 녘이 가장 고와요', 'lb']] },
    ],
    refine: ['더 여유롭게', '숙소는 바다 앞으로', '진주 빼고 하루 더 부산'],
  };

  window.EODI_COURSE_DATA = { CITY, BUSAN_STOPS, BUSAN_PLACES, MINRAK, DISTRICTS, NEARBY, people, COURSES, PAST, STARTERS, AI };
})();

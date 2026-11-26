// 모바일 앱 예시 데이터 (Figma '모바일 · 여행 중 앱'과 같은 내용)
// 사람, 시간, 금액은 모두 예시. 여러 사람이 실제로 함께 쓰려면 서버가 필요함 (지금은 이 기기 안에서만 바뀜)
(function () {
  const P = '../assets/course/';
  const people = {
    me: { name: '나', color: '#0E2F47', ink: '#FFFFFF' },
    ji: { name: '지', color: '#FF8A3D', ink: '#FFFFFF' },
    min: { name: '민', color: '#7FD3E6', ink: '#0B2A44' },
    ha: { name: '하', full: '하은', color: '#B9A6F2', ink: '#0B2A44', guest: true },
  };

  // 다가오는 여행: 가을 부산 2박 3일 (11월 27일 금 ~ 29일 일)
  const trip = {
    id: 'busan', title: '가을 부산 2박 3일', route: ['경기도', '부산'], start: '2026-11-27', days: 3,
    from: '수원역', fromNote: '수원역에서 KTX로 출발', crew: ['me', 'ji', 'min'], photo: P + 'place-haeundae-2.jpg',
  };
  const drafts = [
    { id: 'hokkaido', title: '겨울 홋카이도', route: ['한국', '일본'], when: '1월 중, 자세한 일정은 PC에서', photo: P + 'place-okurayama-1.jpg', draft: true },
  ];

  // 1일차 장소: stay는 머무는 시간(분), cost는 1인 예상 비용(원)
  const stops = [
    { id: 'station', name: '부산역 도착', note: '수원역 07:52 KTX', fixed: '10:30', stay: 78, cost: 0, kind: 'arrive' },
    { id: 'gukje', name: '국제시장 점심', note: '비빔당면, 씨앗호떡', stay: 122, cost: 14000, photo: P + 'place-gukje-2.jpg' },
    { id: 'huin', name: '흰여울문화마을', note: '바다 따라 골목 걷기', stay: 120, cost: 0, photo: P + 'place-huinnyeoul-2.jpg', outdoor: true },
    { id: 'songdo', name: '송도 해상케이블카', note: '해 질 무렵에 타요', stay: 135, cost: 20000, photo: P + 'place-songdo-1.jpg' },
    { id: 'stay', name: '광안리 숙소', note: '체크인 15:00부터', stay: 0, cost: 0, kind: 'stay' },
  ];
  // 두 장소 사이 이동 (분, 수단)
  const moves = {
    'station>gukje': [12, 'bus'], 'gukje>huin': [18, 'bus'], 'huin>songdo': [20, 'bus'], 'songdo>stay': [35, 'train'],
    'gukje>songdo': [15, 'bus'], 'songdo>huin': [14, 'bus'], 'huin>stay': [36, 'train'], 'station>huin': [25, 'bus'],
    'station>songdo': [22, 'bus'], 'gukje>stay': [30, 'train'],
  };
  // 비슷한 곳 (바꾸기)
  const alts = {
    huin: [{ id: 'arcade', name: '국제시장 아케이드', note: '지붕 있는 시장 골목', stay: 60, cost: 8000, photo: P + 'place-gukje-1.jpg' },
      { id: 'seomyeon', name: '서면 지하상가', note: '비 안 맞고 걷기', stay: 60, cost: 10000, photo: P + 'place-seomyeon-1.jpg' }],
    songdo: [{ id: 'taejong', name: '태종대 등대', note: '순환 열차로 한 바퀴', stay: 80, cost: 4000, photo: P + 'place-taejongdae-3.jpg' }],
    gukje: [{ id: 'seomyeon2', name: '서면 돼지국밥 골목', note: '부산 사람들의 점심', stay: 60, cost: 11000, photo: P + 'place-seomyeon-2.jpg' }],
  };

  // 계획이 깨질 때: 16시부터 비
  const rain = {
    title: '16시부터 비가 와요', why: '흰여울문화마을은 바닷가 골목이라 미끄러워요', target: 'huin', seconds: 24,
    options: [{ ...alts.huin[0], sub: '지붕 있는 시장 골목, 버스 12분', votes: ['me', 'ji'] },
      { ...alts.huin[1], sub: '비 안 맞고 걷기, 지하철 20분', votes: [] }],
  };

  // 동행 제안
  const proposals = [
    { id: 'p1', by: 'min', when: '3분 전', text: '민이 순서를 바꾸자고 했어요', swap: ['huin', 'songdo'],
      effect: '해 질 무렵 흰여울에 닿아요', yes: ['ji'], wait: ['ha'] },
  ];
  const decided = ['국제시장 점심, 모두 찬성으로 정했어요'];

  // 지출: 지금까지 (원)
  const spent = { total: 324600, people: 3 };

  // 대략 코스: 지역 점 (캡처 화면 좌표, 지도 그림은 assets/map-*.jpg)
  const regions = {
    domestic: { img: 'map-kr', crop: [80, 60, 620, 700], pts: {
      '서울': [311, 272], '인천': [286, 282], '경기도': [313, 296], '강원도': [436, 256], '충청북도': [356, 349], '충청남도': [286, 353], '대전': [345, 374],
      '전라북도': [322, 422], '광주': [289, 486], '전라남도': [334, 516], '대구': [464, 418], '경상북도': [486, 373], '울산': [536, 449], '경상남도': [446, 478], '부산': [512, 489], '제주도': [246, 673] },
      quick: [['강릉', '강원도'], ['경주', '경상북도'], ['전주', '전라북도'], ['여수', '전라남도'], ['제주', '제주도']], hint: '지도에서 차례로 누르거나, 아래 칸을 눌러 목록에서 골라요',
      groups: [['수도권', ['서울', '인천', '경기도']], ['강원', ['강원도']], ['충청', ['대전', '충청북도', '충청남도']], ['전라', ['광주', '전라북도', '전라남도']], ['경상', ['부산', '대구', '울산', '경상북도', '경상남도']], ['제주', ['제주도']]], via: (a) => (a === '경기도' ? '수원역에서 KTX로 바로 가요' : 'KTX와 버스로 이어서 가요') },
    overseas: { img: 'map-world', crop: [100, 120, 620, 700], pts: { '한국': [367, 392], '일본': [527, 395], '중국': [192, 441], '대만': [251, 569], '필리핀': [243, 707] },
      open: ['한국', '일본'], quick: [['도쿄', '일본'], ['오사카', '일본'], ['삿포로', '일본'], ['후쿠오카', '일본']], hint: '나라를 골라요. 지금은 일본까지 열려 있어요',
      groups: [['열린 곳', ['한국', '일본']], ['곧 열려요', ['중국', '대만', '필리핀']]], via: () => '인천공항에서 비행기로 가요' },
  };

  // 동행 채팅: 처음 대화 (제안 카드는 proposals의 id로 이어짐)
  const chat = [
    { t: 'day', text: '오늘, 11월 27일 금' },
    { t: 'sys', icon: 'link', text: '하은이 링크로 들어왔어요' },
    { t: 'sys', icon: 'map-pin', text: '민이 부산역에 도착했어요' },
    { t: 'msg', by: 'ji', text: '점심은 국제시장 어때? 비빔당면 땡겨' },
    { t: 'exp', by: 'ji', title: '국제시장 점심', amount: 42000 },
    { t: 'sys', icon: 'check', text: '국제시장 점심, 모두 찬성으로 정했어요' },
    { t: 'msg', by: 'me', text: '좋아. 흰여울은 해 질 때 가자' },
    { t: 'prop', by: 'min', pid: 'p1' },
  ];
  // 답장 연출: 다른 사람의 답은 미리 정해 둔 말 (실제로 오는 답장이 아님)
  const replies = [
    [/늦/, 'ji', '천천히 와. 먼저 주문해 둘게'],
    [/먼저/, 'min', '오케이, 도착하면 말해 줘'],
    [/비|우산/, 'ha', '우산 하나 더 챙겨 갈게'],
    [/흰여울/, 'min', '흰여울은 해 질 때가 제일 예쁘대'],
    [/케이블카|송도/, 'ji', '케이블카는 줄 길면 내가 먼저 서 있을게'],
    [/밥|저녁|배고/, 'ji', '광안리 가서 조개구이 어때?'],
    [/좋아|오케이|그래|콜/, 'min', '좋아, 그렇게 하자'],
  ];
  const chatty = [['ji', '오 괜찮다'], ['min', '그럼 그렇게 하자'], ['ji', '좋아!'], ['min', '알겠어, 거기서 보자']];

  window.EODI_M = { people, trip, drafts, stops, moves, alts, rain, proposals, decided, spent, regions, chat, replies, chatty };
})();

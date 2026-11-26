// 좌석 휴대폰의 동반자 앱 예시 데이터: 국내(가을 남도 1박 2일)와 해외(겨울 홋카이도 2박 3일)
// 사람, 시간, 금액, 사진은 모두 예시. 실제로 여러 사람이 함께 쓰려면 서버가 필요함 (지금은 이 기기 안에서만 바뀜)
(function () {
  const people = {
    me: { name: '나', color: '#0E2F47' },
    ji: { name: '지', color: '#FF8A3D' },
    min: { name: '민', color: '#7FD3E6' },
    seo: { name: '서', color: '#C9DD5A' },
  };
  const domestic = {
    id: 'namdo', mode: 'domestic', trip: '가을 남도 1박 2일', when: '오늘 출발', dates: '11월 21일 금, 22일 토', route: '서울역, 경주, 부산, 진주',
    lead: '지, 민, 서와 함께 가요. 투표와 돈 정리, 만날 곳을 여기서 맞춰요.',
    clock: '07:04',
    today: { label: '1일차, 11월 21일 금', items: [['07:10', '서울역 2층 맞이방에서 만남'], ['07:30', '서울역 KTX 출발'], ['09:40', '경주 도착, 불국사'], ['13:20', '부산 도착, 감천문화마을'], ['19:00', '광안리 불꽃축제']] },
    crew: [
      { id: 'ji', status: '5호차 12석, 내 옆자리', chip: '옆자리' },
      { id: 'min', status: '4호차 3석, 경주에서 같이 내려요', chip: '같은 열차' },
      { id: 'seo', status: '부산역에서 합류, 14:20 도착 예정', chip: '부산에서 합류', sky: true },
    ],
    activity: [
      ['min', '2일차에 중앙시장 육전을 넣었어요', '10분 전'],
      ['seo', '2일차 오전 투표를 열었어요', '1시간 전'],
      ['ji', '숙소를 광안리로 정했어요', '어제'],
    ],
    vote: {
      q: '2일차 오전, 진주 가기 전에 어디 들를까요?', due: '오늘 21:00 마감', by: 'seo', fit: '부산 숙소에서 출발, 진주행 버스 09:30 전까지',
      map: { img: 'assets/course/busan-flat.png', crop: [700, 300, 1560, 1080], home: { name: '광안리 숙소', x: 1401, y: 371 } },
      options: [
        { id: 'huin', x: 1011, y: 908, name: '흰여울문화마을', sub: '숙소에서 버스 35분, 바다 골목', photo: 'place-huinnyeoul-1.jpg', votes: ['seo'], apply: { day: 1, newCity: 'busan', t: '08:00', note: '투표로 정함, 1시간' } },
        { id: 'tae', x: 1227, y: 1060, name: '태종대 등대', sub: '버스 50분, 순환 열차', photo: 'place-taejongdae-3.jpg', votes: ['ji'], apply: { day: 1, newCity: 'busan', t: '07:50', note: '투표로 정함, 1시간' } },
        { id: 'song', x: 860, y: 927, lab: 'b', name: '송도 구름다리', sub: '버스 40분, 해상 케이블카', photo: 'place-songdo-1.jpg', votes: [], apply: { day: 1, newCity: 'busan', t: '08:00', note: '투표로 정함, 1시간' } },
      ],
      last: 'min', lastPick: 'huin', // 내가 고르면 마지막 한 명이 이어서 고름 (예시)
      done: [{ q: '1일차 숙소', a: '광안리 해변 앞, 지가 예약' }],
    },
    money: {
      unit: '원', rate: null,
      items: [
        { name: '광안리 숙소 1박', by: 'ji', amount: 180000, split: ['me', 'ji', 'min', 'seo'] },
        { name: '자갈치시장 저녁', by: 'me', amount: 96000, split: ['me', 'ji', 'min', 'seo'] },
        { name: '불꽃축제 자리 돗자리, 간식', by: 'min', amount: 23600, split: ['me', 'ji', 'min', 'seo'] },
        { name: '경주 택시', by: 'min', amount: 14200, split: ['me', 'ji', 'min'] },
      ],
      note: 'KTX 표는 각자 냈어요',
    },
    meet: {
      title: '서울역 2층 맞이방', time: '07:10', sub: 'KTX 07:30 출발, 5호차 앞에서 다시 만나요',
      alts: ['서울역 2층 맞이방', '서울역 1번 출구 앞', '5호차 타는 곳'],
      eta: [
        { id: 'me', text: '서울역 도착', at: '07:02', state: 'here' },
        { id: 'min', text: '도착했어요', at: '06:58', state: 'here' },
        { id: 'ji', text: '지하철 4호선, 5분 늦어요', at: '07:15', state: 'late', p: 0.7 },
        { id: 'seo', text: '부산역에서 합류', at: '14:20', state: 'later', p: 0.1 },
      ],
    },
    invite: { link: 'eodi.app/t/namdo-1121', pending: [{ name: '하린', note: '어제 보냄, 아직 열어 보지 않았어요' }] },
    todo: { check: '출발 전 확인 3개 남음' },
    crewCheck: { ji: [], min: ['겉옷'], seo: ['부산역 합류 시간 확인'] },
  };
  const overseas = {
    id: 'hokkaido', mode: 'overseas', trip: '겨울 홋카이도 2박 3일', when: 'D-77', dates: '2월 6일 금부터 8일 일까지', route: '인천, 삿포로, 비에이, 후라노, 오타루',
    lead: '지, 민, 서와 함께 가요. 투표와 엔화 정리, 공항에서 만날 곳을 여기서 맞춰요.',
    clock: '06:52',
    today: { label: '1일차, 2월 6일 금', items: [['07:10', '인천공항 F 카운터에서 만남'], ['09:10', '인천 출발'], ['12:00', '신치토세 도착, JR로 삿포로'], ['15:00', '오도리 공원 눈축제'], ['20:00', '모이와산 야경']] },
    crew: [
      { id: 'ji', status: '같은 비행기 32A, 내 옆자리', chip: '옆자리' },
      { id: 'min', status: '32C, 렌터카 운전 담당', chip: '운전' },
      { id: 'seo', status: 'Visit Japan Web 아직, 출발 전 확인 2개 남음', chip: '준비 중', sky: true },
    ],
    activity: [
      ['min', '렌터카를 4륜으로 바꿨어요', '1시간 전'],
      ['seo', '1일차 저녁 뒤 투표를 열었어요', '3시간 전'],
      ['ji', '스스키노 숙소 2박을 예약했어요', '어제'],
    ],
    vote: {
      q: '1일차 라멘 뒤, 어디로 갈까요?', due: '내일 21:00 마감', by: 'seo', fit: '스스키노 19:30 출발, 숙소 22:00 전에',
      map: { img: 'assets/course/sapporo-flat.png', crop: [860, 230, 1720, 1010], home: { name: '스스키노 라멘', x: 1356, y: 572 } },
      options: [
        { id: 'tv', x: 1396, y: 470, name: '삿포로 TV 타워', sub: '도보 8분, 눈축제 야경', photo: 'sapporo-tv-night.jpg', votes: ['seo'], apply: { day: 0, city: 'sapporo', after: '스스키노 라멘 요코초', t: '19:40', note: '투표로 정함', x: 1396, y: 470 } },
        { id: 'beer', x: 1558, y: 288, name: '삿포로 맥주 박물관', sub: '택시 15분, 비어가든', photo: 'place-beer-2.jpg', votes: ['min'], apply: { day: 0, city: 'sapporo', after: '스스키노 라멘 요코초', t: '19:45', note: '투표로 정함', x: 1558, y: 288 } },
        { id: 'moiwa', x: 955, y: 958, name: '모이와산 야경', sub: '이미 코스에 있어요, 20:00', photo: null, votes: [], apply: { day: 0, city: 'sapporo', existing: '모이와산 전망대', note: '투표로 정함, 야경' } },
      ],
      last: 'ji', lastPick: 'tv',
      done: [{ q: '렌터카', a: '2일차 하루만, 4륜' }],
    },
    money: {
      unit: '엔', rate: 9, // 1엔 약 9원
      items: [
        { name: '스스키노 숙소 2박', by: 'ji', amount: 72000, split: ['me', 'ji', 'min', 'seo'] },
        { name: '렌터카 1일, 기름값', by: 'min', amount: 18400, split: ['me', 'ji', 'min', 'seo'] },
        { name: '징기스칸 저녁', by: 'me', amount: 12600, split: ['me', 'ji', 'min', 'seo'] },
        { name: '오타루 르타오 디저트', by: 'seo', amount: 4800, split: ['me', 'seo'] },
      ],
      note: '항공권은 각자 냈어요',
    },
    meet: {
      title: '인천공항 1터미널 3층 F 카운터', time: '07:10', sub: '09:10 출발, 체크인 같이 하고 보안검색대로',
      alts: ['인천공항 1터미널 3층 F 카운터', '공항철도 내리는 곳', '3층 7번 출입문 앞'],
      eta: [
        { id: 'me', text: '공항철도, 06:58 도착', at: '06:58', state: 'soon', p: 0.85 },
        { id: 'min', text: '도착했어요', at: '06:40', state: 'here' },
        { id: 'ji', text: '공항 리무진, 07:05 도착', at: '07:05', state: 'soon', p: 0.6 },
        { id: 'seo', text: '15분 늦어요', at: '07:25', state: 'late', p: 0.35 },
      ],
    },
    invite: { link: 'eodi.app/t/hokkaido-0206', pending: [{ name: '하린', note: '어제 보냄, 아직 열어 보지 않았어요' }] },
    todo: { check: '서: Visit Japan Web 아직' },
    crewCheck: { ji: [], min: ['국제운전면허증'], seo: ['Visit Japan Web', '엔화'] },
  };
  // 여행(코스 id)마다 한 벌. 좌석 휴대폰은 모드마다 기본 여행을 엶. 데이터가 없는 코스는 코스 내용으로 빈 앱을 만듦 (companion.js)
  window.EODI_COMPANION_DATA = { people, trips: { namdo: domestic, hokkaido: overseas }, defaults: { domestic: 'namdo', overseas: 'hokkaido' } };
})();

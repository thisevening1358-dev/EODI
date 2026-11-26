// 세계 입체 지도 설정: scene-spec.js의 국내 입체 지도(atlas) 값을 바탕으로 세계용 값을 만들어 돌려줌 (국내 값은 건드리지 않음)
// 재질, 빛, 색, 등고선, 필름은 국내와 같고, 축척·카메라·장소만 바뀜. 건물은 세우지 않음 (지형만)
(window.EODI_GEO = window.EODI_GEO || {}).worldSpec = function (BASE) {
  const A = Object.assign({}, BASE, {
    unit: 0.2,                                   // 위도 1도의 길이 (국내 2.0의 1/10)
    proj: { lat0: 28, lon0: 70, kxLat: 30, riseLat: [-50, 75] }, // 기준점과 동서 압축 (북위 30도 기준)
    labelEdges: [8, 150, 30],                    // 이름표 세로줄 기준: 서쪽 끝(아프리카 서해안), 동쪽 끝(일본 동쪽)
    labelSplit: 100,                             // 이 경도보다 서쪽 지역 이름표는 왼쪽, 동쪽은 오른쪽
    national: { lat: 26, lon: 72, dist: 42, pitch: 50, yaw: 0 },
    intro: { pitch: 89, dist: 66, dur: 2100, rise: 1500 },
    region: { pitch: 48, pad: 2.6, min: 7, shift: 0.16 },
    softShadow: { extent: 40, px: 3072, strength: 0.9, layers: [[0.06, 1.2, 0.8], [0.4, 4, 0.55], [1.0, 8, 0.4]] },
    contour: Object.assign({}, BASE.contour, { interval: 400 }), // 세계 축척이라 400m마다
    peaks: [],
    city: Object.assign({}, BASE.city, { cities: [], rural: 0 }), // 건물 없음
    relief: Object.assign({}, BASE.relief, { base: 0.02, height: 0.24, plinth: 0.17, northDim: 0.42, otherDim: 0.62 }),
    filters: ['전체', '바다', '자연', '미식', '역사'],
    subNational: '지금은 일본만 코스를 만들 수 있어요. 일본을 눌러 보세요.',
    soonNote: '곧 열려요',                          // 일본이 아닌 지역 이름표 옆
  });
  // 지금은 일본에서만 코스를 짤 수 있음: 장소는 일본만 (id는 일본 지도와 같아서 담은 곳이 그대로 이어짐)
  A.places = [
    { id: 'sapporo-snow', kind: 'event', when: '2월', name: '삿포로 눈축제', region: 'japan', lat: 43.06, lon: 141.35, tags: ['자연'], line: '오도리 공원을 따라 늘어선 거대한 눈 조각.', trip: '인천에서 비행 2시간 50분' },
    { id: 'otaru', name: '오타루 운하', region: 'japan', lat: 43.197, lon: 141.0, tags: ['역사'], line: '가스등이 켜지는 겨울 밤의 돌 창고 운하.', trip: '삿포로에서 기차 40분' },
    { id: 'kyoto-autumn', name: '교토 단풍', region: 'japan', lat: 35.0, lon: 135.77, tags: ['역사', '자연'], line: '절마다 붉게 물드는 11월의 교토.', trip: '인천에서 간사이까지 비행 1시간 50분' },
    { id: 'hakone', name: '하코네 온천', region: 'japan', lat: 35.233, lon: 139.1, tags: ['자연'], line: '후지산이 보이는 노천 온천 마을.', trip: '도쿄에서 기차 1시간 30분' },
    { id: 'nakasu', name: '후쿠오카 나카스 포장마차', region: 'japan', lat: 33.592, lon: 130.405, tags: ['미식'], line: '강가에 밤마다 서는 라멘·꼬치 포장마차.', trip: '인천에서 비행 1시간 20분' },
    { id: 'dotonbori', name: '오사카 도톤보리', region: 'japan', lat: 34.669, lon: 135.501, tags: ['미식'], line: '네온 아래 타코야키와 쿠시카츠.', trip: '인천에서 비행 1시간 50분' },
    { id: 'ishigaki', name: '이시가키 바다', region: 'japan', lat: 24.34, lon: 124.16, tags: ['바다'], line: '산호초가 비치는 오키나와 남쪽 섬의 바다.', trip: '인천에서 비행 3시간' },
    { id: 'kamakura', name: '가마쿠라', region: 'japan', lat: 35.319, lon: 139.547, tags: ['바다', '역사'], line: '대불과 바닷가 전철이 있는 옛 도시.', trip: '도쿄에서 기차 1시간' },
  ];
  A.picks = ['sapporo-snow', 'otaru', 'kyoto-autumn', 'hakone', 'nakasu'];
  return A;
};

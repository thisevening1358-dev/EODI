/*
 * 씬 사양 (Figma와 공유하는 값)
 * Figma '여행 - 디자인' 페이지의 "Tokens / KTX 히어로" 프레임과 같은 이름을 씁니다.
 * Figma에서 색이나 배치를 고치면 이 파일의 값만 바꾸면 됩니다.
 * 단위: 1 = 약 1m. 축: X = 선로와 직각(+X가 카메라 쪽), Y = 위, Z = 선로 방향(-Z가 화면 오른쪽 위).
 */
window.SCENE = {
  colors: {
    // 무드보드 '맑은 하늘': 한낮의 깊은 하늘색, 흰 콘크리트, 직사광, 시트러스 포인트
    skyTop: '#1A81BD',
    skyMid: '#4799CC',
    skyLow: '#9CCBEA',
    haze: '#DCEBF4',
    platformTop: '#E7E9E5',
    platformSide: '#D3DADD',
    safetyLine: '#D9E23C',   // 점자블록 노랑 (무드보드 라임 쪽)
    trackBed: '#D3CFC7',     // 자갈
    sleeper: '#BABEBD',      // 콘크리트 침목
    rail: '#8E989E',         // 강철
    canopy: '#F1F3F3',
    pillar: '#D9DFE1',
    building: '#EAEDEB',
    glass: '#2E7BB0',        // 하늘이 비치는 유리
    trainBody: '#F4F6F6',
    planeBody: '#F4F6F6',
    planeWing: '#E3E8EB',
    trainWindow: '#16344B',
    trainStripe: '#1A81BD',
    bogie: '#3A4650',
    headlight: '#FFF3D2',
    asphalt: '#7F8A92',      // 활주로
    mark: '#F6F7F5',         // 활주로 표시
    accent: '#EA700B',       // 반투명 오렌지: 활주로 등
    line: '#FFFFFF',         // 처음 그려지는 윤곽선
    ink: '#0E2F47',
    muted: '#4E6C80',
  },

  // 정적인 상자들: id, group, 중심 [x, y, z], 크기 [w, h, d], 색 키
  boxes: [
    { id: 'far-platform',  group: 'station', pos: [-5.6, 0.5, 0],    size: [7.4, 1, 34],     color: 'platformTop', side: 'platformSide' },
    { id: 'far-safety',    group: 'station', pos: [-2.2, 1.006, 0],  size: [0.18, 0.012, 34], color: 'safetyLine' },
    { id: 'canopy',        group: 'station', pos: [-5.4, 4.5, 0],    size: [6.2, 0.28, 26],  color: 'canopy', side: 'pillar' },
    { id: 'pillar-1',      group: 'station', pos: [-6.4, 2.68, -10], size: [0.32, 3.36, 0.32], color: 'pillar' },
    { id: 'pillar-2',      group: 'station', pos: [-6.4, 2.68, -5],  size: [0.32, 3.36, 0.32], color: 'pillar' },
    { id: 'pillar-3',      group: 'station', pos: [-6.4, 2.68, 0],   size: [0.32, 3.36, 0.32], color: 'pillar' },
    { id: 'pillar-4',      group: 'station', pos: [-6.4, 2.68, 5],   size: [0.32, 3.36, 0.32], color: 'pillar' },
    { id: 'pillar-5',      group: 'station', pos: [-6.4, 2.68, 10],  size: [0.32, 3.36, 0.32], color: 'pillar' },
    { id: 'building',      group: 'station', pos: [-11.3, 3.6, -3],  size: [3.6, 7.2, 13],   color: 'building', side: 'platformSide' },
    { id: 'building-glass',group: 'station', pos: [-9.48, 5.6, -3],  size: [0.04, 1.6, 11.6], color: 'glass' },
    { id: 'annex',         group: 'station', pos: [-11.3, 1.7, 8.5], size: [3.6, 3.4, 7],    color: 'building', side: 'platformSide' },
    { id: 'near-platform', group: 'near',    pos: [5.6, 0.5, 0],     size: [7.4, 1, 34],     color: 'platformTop', side: 'platformSide' },
    { id: 'near-safety',   group: 'near',    pos: [2.2, 1.006, 0],   size: [0.18, 0.012, 34], color: 'safetyLine' },
  ],

  // 정거장 디테일: 한 번에 그리는 작은 상자들. 위치만 여기서 조절 (scene.js의 stationDetails)
  stationDetail: {
    joint: '#C8CFD1', steel: '#A5AFB6', seat: '#EA700B', navy: '#27456E', carpet: '#7FB4D8',
    pavingStep: 2,                               // 승강장 바닥 줄눈 간격
    lamps: { x: 8.7, z: [-14, -7, 0, 7] },       // 앞 승강장 조명
    benches: { x: 7.3, z: [-11, -1, 3] },        // 앞 승강장 의자
    shelter: { x: 7.5, z: -7 },                  // 대기 쉼터
    lift: { x: 7.6, z: -14 },                    // 승강기
    vending: { x: 7.9, z: -3.4 },                // 자동판매기
    railX: 9.12,                                 // 앞 승강장 바깥 난간
    canopyRib: 2.6,                              // 캐노피 지붕 골조 간격
    objects: { wood: '#9C6A43', iron: '#2A2E34', graphite: '#4E545C', brushed: '#C8CDD2' }, // 의자 원목, 주철, 가로등·조명탑 금속, 휴지통 스테인리스
  },

  track: {
    length: 140,                 // 화면 밖까지 이어지도록 길게
    bed:     { x: 0, y: 0.2,  w: 2.8,  h: 0.4 },
    sleeper: { y: 0.47, w: 2.4, h: 0.14, d: 0.4, spacing: 1.2, from: 66, to: -66 },
    rail:    { xs: [-0.72, 0.72], y: 0.62, w: 0.14, h: 0.16 },
  },

  train: {
    width: 1.05,   // 반폭
    height: 2.3,
    floorY: 1.2,   // 차체 바닥 높이
    stopZ: 11,     // 정차했을 때 기관차 코끝 위치
    // 앞에서부터: nose(코) -> 차체들 (로컬 z, 0이 코끝, -z가 뒤)
    nose: { length: 3.2, mid: { at: 1.8, w: 0.95, h: 1.75 }, tip: { w: 0.45, h: 0.7, y: 1.25 } },
    cars: [ { from: -3.2, to: -8.2 }, { from: -8.5, to: -14.9 }, { from: -15.2, to: -21.6 }, { from: -21.9, to: -28.3 } ],
    tailNose: true,
  },

  // 표현: 실사 느낌의 빛과 재질. 값은 scene.js의 재질 표와 함께 조절
  look: {
    exposure: 0.95,
    envMatte: 0.45,
    sun: { pos: [22, 30, -6], intensity: 2.5, color: '#FFF6E6' }, // 한낮의 강한 직사광. 그림자가 화면 왼쪽 아래로 짧고 또렷하게
    sky: { intensity: 0.32, top: '#BFDDF2', ground: '#EDEAE3' },  // 하늘에서 내려오는 푸른 반사광
    shadow: { color: '#0C4F80', opacity: 0.2 },  // 바닥 그림자는 하늘빛이 섞인 푸른색
    haze: { near: 50, far: 140 },                 // 카메라에서 멀어질수록 하늘빛 안개 (화면 밖 선로 끝)
    parallax: 0.05,                                // 정차 후 마우스를 따라 도는 정도
    fps: 30,       // 초당 화면 갱신 상한 (필름 느낌, 노트북 부담 절반)
    maxDpr: 1.25,  // 레티나에서도 1.25배까지만 (부드러운 움직임 우선)
  },

  // 승강장 시점: 앞 승강장에 서서 정차한 KTX와 게시판을 보는 눈높이
  pov: { eye: [5.2, 2.6, 16], look: [1.4, 2.25, 2], fov: 46, dur: 2600 },

  // 전광판 광고의 넘김 (초). 세 칸이 시간차를 두고 세로로 스크롤됨
  adMotion: { first: 1.4, period: 5.4, move: 1.05, stagger: 0.32, onFrom: 0.3, onTo: 0.95 }, // onFrom ~ onTo: 시점 이동 진행도에서 화면이 켜지는 구간

  // 승강장 전광판: 입체 지도에서 추천하는 축제 포스터 (일정은 예시라 해마다 확인 필요)
  board: {
    pos: [6.05, 2.6, 8], w: 3.4, h: 2.1,
    // 입체 지도 추천과 같은 장소 (id로 이어서 이름, 열리는 때, 가는 길은 지도 자료 S.atlas.places에서 가져옴)
    // layout: grid(큰 숫자) / type(제목이 그림) / round(원형 창과 스티커), big: 큰 숫자나 스티커 글자, art: posters.js의 그림
    ads: [
      { id: 'fireworks', place: '부산 광안리', big: '11', layout: 'grid', art: 'burst', title: ['광안리', '불꽃'], bg: ['#0B0F33', '#3A2378'], blob: '#6B3FD0', accent: '#FFC85A', accent2: '#FF6FA8', deep: '#0B0F33', ink: '#FFF3D9' },
      { id: 'eoksae', place: '강원 정선', big: '10-11월', layout: 'type', art: 'grass', title: ['은빛', '억새', '물결'], bg: ['#D9D3EC', '#F5F1EA'], blob: '#FFFFFF', accent: '#9C93B8', accent2: '#FFFFFF', deep: '#4A4170', ink: '#2A2346' },
      { id: 'lantern', place: '경남 진주', big: '10월', layout: 'round', art: 'lanterns', title: ['강 위에', '뜬 등불'], bg: ['#05262D', '#0F4E52'], window: '#082F36', blob: '#1D7A73', accent: '#FFB347', accent2: '#FFE2A3', deep: '#05262D', ink: '#FFE9C2' },
      { id: 'snow', place: '강원 태백', big: '1-2', layout: 'grid', art: 'crystal', title: ['눈의', '산'], bg: ['#EEF5FD', '#9EC4EE'], blob: '#FFFFFF', accent: '#FFFFFF', accent2: '#1D4FA3', deep: '#0F2F6B', ink: '#0F2F6B' },
      { id: 'cherry', place: '서울 여의도', big: '4월', layout: 'type', art: 'blossom', title: ['윤중로', '벚꽃'], bg: ['#FFD9E6', '#FF86AE'], blob: '#FFFFFF', accent: '#FFFFFF', accent2: '#FF5C93', deep: '#7A1238', ink: '#5A0F2E' },
      { id: 'mud', place: '충남 보령', big: '7월', layout: 'round', art: 'mud', title: ['온몸으로', '여름'], bg: ['#4A2E1E', '#B5793F'], window: '#C99A63', blob: '#E0A964', accent: '#E6FF4A', accent2: '#8A5A33', deep: '#3A2216', ink: '#FFF1D2' },
    ],
  },

  // 해외 장면: 공항 터미널, 유도로, 비행기. 축과 단위는 국내와 같음
  airport: {
    boxes: [
      { id: 'apron',           pos: [-4, 0.1, 0],       size: [26, 0.2, 36],      color: 'platformTop', side: 'platformSide' },
      { id: 'terminal',        pos: [-13, 3, -2],       size: [6.04, 6, 18.04],   color: 'building', side: 'platformSide', shell: true, hit: true },
      { id: 'terminal-glass',  pos: [-9.96, 3.6, -2],   size: [0.04, 3.4, 16.5],  color: 'glass', shell: true, hit: true },
      { id: 'jet-bridge',      pos: [-5.8, 2.9, 5],     size: [8.2, 1.1, 1.2],    color: 'building', side: 'platformSide', hit: true },
      { id: 'bridge-leg',      pos: [-8.9, 1.3, 5],     size: [0.25, 2.2, 0.25],  color: 'pillar' },
      { id: 'tower',           pos: [-13, 6.5, 11],     size: [1.3, 13, 1.3],     color: 'pillar', hit: true },
      { id: 'tower-cab',       pos: [-13, 13.7, 11],    size: [3.2, 1.6, 3.2],    color: 'glass', hit: true },
      { id: 'tower-top',       pos: [-13, 14.6, 11],    size: [3.6, 0.2, 3.6],    color: 'canopy', side: 'pillar', hit: true },
      { id: 'cart-1',          pos: [5.4, 0.55, 6.5],   size: [1.4, 0.7, 2.2],    color: 'pillar' },
      { id: 'cart-2',          pos: [5.4, 0.55, 3.6],   size: [1.4, 0.7, 2.2],    color: 'pillar' },
    ],
    roof: { x: [-16.5, -9.4], z: [-11.6, 7.6], y: 6, rise: 2.2 },
    // 활주로: 바닥, 양쪽 선, 표시 순서로 깔림. 착륙 방향은 +z (오른쪽 위에서 왼쪽 아래로)
    track: {
      length: 140,
      bed:     { x: 0, y: 0.215, w: 7.6, h: 0.03, color: 'asphalt' },
      sleeper: { spacing: 1.2, from: 66, to: -66 }, // 표시가 깔리는 속도의 기준
      rail:    { xs: [-3.45, 3.45], y: 0.24, w: 0.2, h: 0.03, color: 'mark' },
      runway: {
        y: 0.245, h: 0.03, color: 'mark', lightColor: 'accent',
        threshold: -23,                              // 시단 줄무늬 위치
        keys: 5, keyStep: 0.56, keyW: 0.34, keyD: 4,
        number: '27', numZ: 3.2, numW: 1.5, numH: 3.4, numGap: 1.25,
        touchdown: [[11, 3], [15, 2]],               // 접지 구역 줄무늬 [시단에서 거리, 쪽당 개수]
        aim: 20,                                     // 조준점 위치
        centerFrom: 66, centerStep: 3.2, centerGap: 8.5, centerW: 0.26, centerD: 1.9,
        chevrons: 4, chevronStep: 3.6,               // 시단 앞 화살표
        edgeX: 3.95, edgeFrom: 60, edgeTo: -60, edgeStep: 4.8, // 활주로 등
      },
    },
    plane: {
      from: -86, stopZ: 9,
      landing: { height: 16, touchZ: -6, range: 40, pitch: 0.09 }, // 내려앉는 높이와 위치
      fuselage: [[-23, 0.2, 3.35], [-20, 0.8, 3.0], [-16, 1.35, 2.6], [-4, 1.35, 2.6], [-2, 1.15, 2.5], [-0.8, 0.72, 2.35], [0, 0.2, 2.2]], // z, 반지름, 중심 높이
      cabin: 2, cockpit: 4,
      wing: [[1.1, -8], [1.1, -12.5], [9, -15.2], [9, -13.8]], wingY: 2.2,
      tail: [[0.4, -19.5], [0.4, -21.6], [4, -23.2], [4, -22.2]], tailY: 3.35,
      fin: [[-19.2, 3.6], [-22.6, 3.6], [-23.7, 6.6], [-22.5, 6.6]],
      engine: { x: 4.2, y: 1.35, z: -10.4, r: 0.55, len: 2.4 },
      gear: [[0, -3], [1.5, -12], [-1.5, -12]],
    },
    room: { pos: [-13, 3.6, -2], size: [6, 4.8, 18] }, // 터미널 안, 바닥 높이 1.2
    interior: [
      { id: 'gate-desk', pos: [-11.0, 1.7, -9.1], size: [0.8, 1.0, 2.2], color: 'sleeper' }, // 게이트 데스크 (창 쪽 안, 비행기를 가리지 않는 자리)
    ],
    mullion: { x: -10, y: [1.2, 6], z: [-11, 7], step: 1.5, rails: [5.0, 3.1, 1.3] }, // 유리창 틀 (가는 알루미늄 세로 살 간격, 가로 살 높이)
    pov: { eye: [-15, 2.8, 6.2], look: [-5, 3, -3], fov: 58, dur: 2800 },
    // 터미널 전광판: 입체 지도에서 추천하는 여행지와 축제 포스터
    board: {
      pos: [-12.9, 4.15, 0.9], hang: 6, w: 2.8, h: 1.7,
      // 입체 지도 추천과 같은 장소 (국내선으로 떠나는 여행지와 축제)
      ads: [
        { id: 'suncheon', place: '전남 순천', big: '가을', layout: 'grid', art: 'reeds', title: ['갈대', '바다'], bg: ['#F7DA94', '#E58F52'], blob: '#FFF0C2', accent: '#FFF4D6', accent2: '#5C8FB8', deep: '#7A3A16', ink: '#3B1A0A' },
        { id: 'bulguk', place: '경북 경주', big: '천년', layout: 'round', art: 'pagoda', title: ['천년의', '석탑'], bg: ['#2A1B4A', '#E2705A'], window: '#F29A6B', blob: '#FF9A7A', accent: '#FFD9A8', accent2: '#FFC27A', deep: '#2A1B4A', ink: '#FFE7C9' },
        { id: 'jeonju', place: '전북 전주', big: '한옥', layout: 'type', art: 'roofs', title: ['기와', '지붕', '아래'], bg: ['#163B33', '#2F6E5A'], blob: '#4FA884', accent: '#F1E6C8', accent2: '#0D211C', deep: '#3E8C72', ink: '#F4ECD6' },
        { id: 'maskdance', place: '경북 안동', big: '9-10', layout: 'grid', art: 'masks', title: ['탈 쓰고', '춤을'], bg: ['#E2412E', '#FF8C3D'], blob: '#FFC27A', accent: '#FFF1DC', accent2: '#FF5A6E', deep: '#2B0F0A', ink: '#1F0B07' },
        { id: 'chimaek', place: '대구 두류공원', big: '7월', layout: 'round', art: 'bubbles', title: ['치킨', '맥주', '여름밤'], bg: ['#FFC92B', '#FF7A1A'], window: '#FFB21F', blob: '#FFE27A', accent: '#FFC21F', accent2: '#FF9F1A', deep: '#3A1A00', ink: '#2B1300' },
        { id: 'jazz', place: '경기 가평', big: '10월', layout: 'type', art: 'vinyl', title: ['강 위의', '재즈'], bg: ['#14215C', '#3F6BE0'], blob: '#6E8CF0', accent: '#FFB84A', accent2: '#BFD0FF', deep: '#0B1238', ink: '#F5F0E6' },
      ],
    },
  },

  // 시작과 전환: 구조물이 땅에서 차례로 솟아 완성됨 (초)
  rise: {
    start: 0.1,
    dur: 1.3,          // 하나가 솟는 시간
    fall: 34,          // 화면 밖 아래에서 출발하는 거리
    depth: 44,         // 지면 아래로 이어지는 몸통 길이
    follow: 0.06,      // 판 위의 건물이 판보다 늦게 출발하는 시간
    ridePad: 3.5,      // 건물 발밑 타일을 넉넉히 계산하는 여유(단위)
    columns: /^(far|near)-(platform|safety)$|^apron$|^building|^annex$/, // 화면 밖에서 올라오는 것
    body: /-platform$|^apron$|^building$|^annex$/,                       // 몸통을 늘리는 것
    haze: { from: -0.5, to: -14, amount: 0.95, gain: 1.15 },                // 아래로 갈수록 하늘빛으로 옅어지는 정도
    waveZ: 0.014,      // 앞쪽(+z)에서 뒤쪽으로 번지는 시간차 (1단위당)
    waveX: 0.008,
    z0: 18,
    trackLead: 0.12,   // 도상 다음 침목, 침목 다음 레일이 뒤따르는 간격
    tiles: { 'far-platform': [1, 10], 'near-platform': [1, 10], 'far-safety': [1, 10], 'near-safety': [1, 10], canopy: [1, 8], apron: [4, 6] }, // 넓은 판을 나누는 수 [가로, 세로]
    parent: { 'far-safety': 'far-platform', 'near-safety': 'near-platform', 'building-glass': 'building', tower: 'tower-top', 'tower-cab': 'tower-top', 'terminal-glass': 'terminal', 'bridge-leg': 'jet-bridge' },
    phases: [[/platform|safety|apron/, 0], [/building|annex|terminal|tower/, 0.25], [/pillar|canopy/, 0.5], [/jet|bridge/, 0.6], [/board|cart/, 0.75]],
  },

  // 필름 필터 (참고: cosmos.so/e/1108859166). 숫자를 키우면 효과가 세짐
  film: {
    exposure: 0.86,      // 필름 노출 (흰 면이 날아가지 않게)
    soft: 0.07,          // 초점이 부드럽게 번지는 정도
    halation: 0.38,      // 밝은 물체 가장자리 바깥의 붉은 번짐
    screenGain: 1.25,    // 전광판 화면 밝기
    grain: 0.045,        // 필름 입자 세기
    grainSize: 2,        // 입자 크기(px)
    saturation: 1.12,
    curve: 0.22,         // S 곡선(대비)
    vignette: 0.3,
    aberration: 0.0035,  // 가장자리 색 갈라짐
    clouds: 0.75,        // 하늘 구름 양
    cloudTint: '#F6D7D2', // 분홍빛 구름
    highlights: [1.0, 0.92, 0.9],   // 밝은 곳에 곱하는 색 (분홍빛)
    shadows: [0.82, 0.93, 1.08],    // 어두운 곳에 곱하는 색 (남청)
    overseasTop: '#0F5FA8',
  },

  // 좌석 시점: 열차나 비행기를 누르면(전체 화면이나 승강장·터미널 시점 어디서든) 객실 좌석에 앉은 눈높이로 이동
  // 손에 든 종이 지도가 왼쪽 아래(탐색, 코스 만들기 예정), 휴대폰이 오른쪽 아래(내 여행, 동반자 예정)를 채움
  seat: {
    dur: 2400,
    // 손에 든 소품. x: 화면 왼쪽에서의 위치(화면 너비 비율), w/h: 화면 너비(지도)·높이(휴대폰) 비율, drop: 화면 아래로 잘리는 정도, d: 눈과의 거리(m)
    // 전체 화면에서 바로 좌석으로: 등각 화면 → 창가 벽 바깥(조절점) → 좌석, 한 개의 곡선
    direct: {
      dur: 3400,
      split: 0.6, // 1막(창 앞까지)과 2막(창을 지나 앉기)의 경계
      // 창 앞 자리: 내 좌석 창(gate) 정면에서 dist만큼 바깥, 창이 화면을 채우는 화각. 2막은 창 한가운데를 지나는 곡선
      window: { dist: 1.7, fov: 34 },
      fade: [0.62, 0.78], // 겉면이 녹는 구간 (카메라가 창을 지나는 무렵)
      heldFrom: 0.86,     // 지도와 휴대폰이 올라오기 시작
    },
    held: {
      from: 0.55, // 좌석 이동 진행도가 이 값을 넘으면 아래에서 올라오기 시작
      map:   { x: -0.02, w: 0.56, drop: 0.12, d: 0.45, tilt: -0.42, roll: 0.07 },
      phone: { x: 0.77, h: 0.86, drop: 0.16, d: 0.38, tilt: -0.18, roll: -0.08 },
      // 세로로 긴 화면(휴대폰 등)에서는 지도와 휴대폰을 작게, 서로 덜 겹치게
      narrow: { map: { x: -0.06, w: 0.86, drop: 0.02 }, phone: { x: 0.74, h: 0.4, drop: 0.02 }, atlas: { x: 0.84, h: 0.26, drop: 0.08 } },
      atlas: { x: 0.9, h: 0.5, drop: 0.1, tilt: -0.06, roll: -0.04 }, // 입체 지도에서 코스 요약판이 된 휴대폰
    },
    domestic: { eye: [0.6, 2.5, -2.62], look: [0.5, 2.08, -1.2], fov: 64,
      table: [0.6, 2.0, -2.0, 0.7, 0.5],
        gate: [0.99, 2.42, -2.375] }, // 직행할 때 통과하는 내 좌석 창 (벽면 x, 창 가운데 y, z)
    overseas: { eye: [-0.8, 3.0, 2.3], look: [-0.74, 2.5, 3.4], fov: 66,
      table: [-0.84, 2.56, 2.86, 0.42, 0.3],
        gate: [-1.2, 2.85, 2.32] },
  },

  // 시간대: 방문자 기기의 현재 시각에 맞춰 하늘, 햇빛, 조명이 바뀜 (확인용 ?time=21:30)
  // 다섯 단계(새벽, 낮, 노을, 블루 아워, 밤) 사이를 해 뜨고 지는 시각 기준으로 부드럽게 섞음
  timeOfDay: {
    lat: 37.57,          // 해 뜨고 지는 시각 계산용 위도 (서울)
    noon: 12.4,          // 현지 태양 남중 시각 (시)
    // 해 뜨는 시각(rise), 지는 시각(set) 기준 분 단위 기준점
    keys: [['night', 'rise', -70], ['dawn', 'rise', -5], ['day', 'rise', 80], ['day', 'set', -80], ['sunset', 'set', -10], ['dusk', 'set', 25], ['night', 'set', 70]],
    lightColor: '#8FE3FF',   // 밤 조명: 하늘색
    accentNight: '#FF5A3C',  // 밤 포인트: 다홍 (활주로 등)
    phases: {
      // sky: 위, 가운데, 아래, 지평선 / deep: 해외 하늘 위쪽 / glow: 해 기운 색과 세기
      // sun: 위치, 색, 세기 (밤에는 달빛) / hemi: 하늘과 땅의 반사광 / lights: 조명이 켜진 정도 / stars: 별
      dawn:   { sky: ['#3A5C9E', '#8DA2D2', '#F3C1B0', '#FFE2CF'], deep: '#2E4D8E', cloud: '#FFC9B8', clouds: 0.6,  glow: ['#FFC59E', 0.35], sun: [[34, 7, -26], '#FFC7A0', 1.5], hemi: ['#A9BCE3', '#EBCDBE', 0.38], exposure: 0.92, highlights: [1, 0.9, 0.86],    shadows: [0.84, 0.88, 1.08], lights: 0.25, stars: 0.1 },
      day:    { sky: ['#1A81BD', '#4799CC', '#9CCBEA', '#DCEBF4'], deep: '#0F5FA8', cloud: '#F6D7D2', clouds: 0.75, glow: ['#FFEDD1', 0.18], sun: [[22, 30, -6], '#FFF6E6', 2.5],  hemi: ['#BFDDF2', '#EDEAE3', 0.32], exposure: 0.86, highlights: [1, 0.92, 0.9],    shadows: [0.82, 0.93, 1.08], lights: 0,    stars: 0 },
      sunset: { sky: ['#24508F', '#7A93CC', '#FFB98A', '#FFD7AE'], deep: '#1B3F7E', cloud: '#FFB59A', clouds: 0.7,  glow: ['#FFB070', 0.45], sun: [[42, 8, 6], '#FFB27A', 1.9],    hemi: ['#9DB6E2', '#F0C8A8', 0.38], exposure: 0.9,  highlights: [1, 0.88, 0.8],    shadows: [0.8, 0.86, 1.1],   lights: 0.3,  stars: 0 },
      dusk:   { sky: ['#0D1E50', '#22417F', '#5A79BC', '#94AEDD'], deep: '#0A1842', cloud: '#5F72AE', clouds: 0.45, glow: ['#7D8FD6', 0.12], sun: [[-14, 30, 12], '#A8BEFF', 0.45], hemi: ['#3E5A9C', '#26324F', 0.55], exposure: 1.0,  highlights: [0.98, 0.98, 1.04], shadows: [0.8, 0.88, 1.15], lights: 0.85, stars: 0.35 },
      night:  { sky: ['#050B24', '#0A1940', '#162E66', '#26437C'], deep: '#030820', cloud: '#1A2A57', clouds: 0.28, glow: ['#5C7BD6', 0.06], sun: [[-18, 34, 14], '#A9C4FF', 0.5], hemi: ['#22386E', '#0D1530', 0.5],  exposure: 1.1,  highlights: [0.96, 1, 1.06],   shadows: [0.78, 0.88, 1.18], lights: 1,    stars: 1 },
    },
  },

  // 초현실 실사 재질 (dream.js). physical: 실제 소재 값 (clearcoat: 투명 코팅, iridescence: 얇은 막 간섭색 세기,
  // iridescenceThicknessRange: 막 두께 범위 nm, 넓을수록 색이 다양), pearl: 흰 면 그늘의 진주빛, glow: 오렌지 포인트 빛
  dream: {
    grain: 0.03,
    // 대리석: 흰 바탕에 회보라 결, 아주 가는 금빛 결. scale이 클수록 결이 촘촘함 (세계 좌표 기준이라 면이 바뀌어도 결이 이어짐)
    marble: { base: '#F4F2EF', vein: '#8D8A9B', gold: '#C9A266', scale: 0.32 },
    kinds: {
      vehicle:   { pearl: 0.2,  glow: 0.12, physical: { metalness: 0.18, clearcoat: 0.2, clearcoatRoughness: 0.1, iridescence: 0.14, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 650], envMapIntensity: 1.1 } }, // KTX, 비행기: 펄 크롬에서 광택을 80% 줄인 은은한 펄 도장
      mech:      { pearl: 0,    glow: 0,    physical: { clearcoat: 0.12, clearcoatRoughness: 0.2, envMapIntensity: 1.06 } },   // 바퀴, 금속 (광택 80% 줄임)
      structure: { pearl: 0.12, glow: 0.15, physical: null },                                                                    // 승강장, 건물, 터미널: 콘크리트 그대로
      marble:    { pearl: 0,    glow: 0,    marble: 1, physical: { roughness: 0.18, roughnessMap: null, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 0.85 } }, // 승강장, 역사, 터미널, 기둥: 갈아 낸 대리석
      varnish:   { pearl: 0,    glow: 0,    physical: { clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 0.8 } },   // 의자 원목: 니스 칠
      roof:      { pearl: 0.2,  glow: 0,    physical: { clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.25, iridescenceIOR: 1.3, iridescenceThicknessRange: [300, 700], envMapIntensity: 1.1 } }, // 지붕: 유약 바른 도자기
      glass:     { pearl: 0,    glow: 0,    physical: { tint: '#A9B4F2', roughness: 0.03, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [260, 920], envMapIntensity: 1.8 } }, // 다이크로익 유리
    },
  },

  // 국내, 해외 전환: 지금 장면을 처음 순서의 반대로 빠르게 거둬들이고, 새 장면이 처음 순서대로 지어짐 (초)
  modeSwitch: { rewind: 1.4 },

  // 입체 지도: 좌석에서 종이 지도를 누르면 화면 전체가 하늘에 뜬 한반도 모형이 됨 (국내만)
  // 탐색(전국 → 지역 확대)과 코스 담기. 땅은 육각 기둥 타일이고, 남한은 여행 지역 9곳으로 나뉨 (mapdata.js regions)
  atlas: {
    origin: [4000, 0, 0],   // 원래 장면과 겹치지 않는 먼 곳에 놓음
    unit: 2.0,              // 위도 1도의 길이
    // 초현실 부조 지도 (참고: rayshader로 만든 일본 부조 지도, 스위스 인구 밀도 지도)
    // 땅: 실제 고도(heightdata.js)를 과장한 연속 부조. 높이 = base + (고도 비율^1.6) x height
    // 땅은 낮고 옅게 깔아(fade = 종이색으로 바래는 정도) 건물이 주인공이 되게
    relief: { base: 0.02, height: 0.16, smooth: 1, fade: 0.3, plinth: 0.16, mainland: 0.5, // mainland: 대륙 층 높이 (받침 두께에 대한 비율, 0.5 = 바닥과 한반도의 중간) // plinth: 한반도 받침 두께 (바탕 종이가 이만큼 낮음)
      hoverLift: 0.05, northDim: 0.42, otherDim: 0.62 },
    // 도시: 실제 도시 [이름, 위도, 경도, 인구(천 명)]로 밀도를 만들고 격자 자리마다 건물을 세움 (인구는 대략값)
    // spacing: 자리 간격, reach: 인구 1백만 도시가 퍼지는 반경, gain: 밀도 세기, rural: 시골에 건물이 설 확률, highland: 높은 산에서 그 확률에 곱하는 값
    // subFrom: 이 밀도부터 한 자리를 네 블록으로 나눔, base/tall: 낮은 건물 높이와 대도시 탑이 더 솟는 높이, hiTall: 강조 때 건물이 더 늘어나는 비율
    city: {
      spacing: 0.13, reach: 0.22, gain: 1.1, rural: 0.34, highland: 0.35, subFrom: 0.3, base: 0.022, tall: 0.3, hiTall: 0.6,
      cities: [
        ['서울', 37.5665, 126.978, 9500], ['인천', 37.456, 126.705, 2950], ['수원', 37.263, 127.028, 1200], ['성남', 37.42, 127.126, 930], ['고양', 37.658, 126.832, 1070],
        ['용인', 37.241, 127.178, 1070], ['부천', 37.503, 126.766, 800], ['안산', 37.322, 126.831, 650], ['남양주', 37.636, 127.216, 720], ['화성', 37.199, 126.831, 900],
        ['평택', 36.992, 127.112, 580], ['의정부', 37.738, 127.034, 460], ['파주', 37.76, 126.78, 490], ['김포', 37.615, 126.716, 480], ['청주', 36.642, 127.489, 850],
        ['천안', 36.815, 127.114, 660], ['대전', 36.351, 127.385, 1450], ['세종', 36.48, 127.289, 380], ['전주', 35.824, 127.148, 650], ['익산', 35.948, 126.958, 280],
        ['군산', 35.968, 126.737, 260], ['광주', 35.16, 126.851, 1440], ['목포', 34.811, 126.392, 220], ['여수', 34.76, 127.662, 280], ['순천', 34.95, 127.487, 280],
        ['대구', 35.871, 128.601, 2380], ['포항', 36.019, 129.343, 500], ['구미', 36.12, 128.344, 410], ['경주', 35.856, 129.225, 250], ['안동', 36.568, 128.729, 155],
        ['부산', 35.18, 129.075, 3350], ['울산', 35.538, 129.311, 1110], ['창원', 35.228, 128.681, 1030], ['김해', 35.228, 128.889, 540], ['진주', 35.18, 128.108, 340],
        ['양산', 35.335, 129.037, 350], ['거제', 34.88, 128.621, 240], ['통영', 34.854, 128.433, 125], ['춘천', 37.881, 127.73, 285], ['원주', 37.342, 127.92, 360],
        ['강릉', 37.752, 128.876, 210], ['속초', 38.207, 128.592, 82], ['동해', 37.525, 129.114, 90], ['충주', 36.991, 127.926, 210], ['제주', 33.499, 126.531, 490],
        ['서귀포', 33.254, 126.56, 180],
        ['평양', 39.039, 125.762, 3000], ['함흥', 39.918, 127.535, 700], ['청진', 41.795, 129.776, 630], ['남포', 38.737, 125.408, 360], ['원산', 39.153, 127.443, 360],
        ['신의주', 40.1, 124.398, 360], ['개성', 37.97, 126.554, 300], ['사리원', 38.507, 125.762, 300], ['해주', 38.04, 125.714, 270],
      ],
    },
    contour: { interval: 100, ink: '#07060D', alpha: 0.78 },  // 등고선: 100m마다 얇은 검은 선 (500m마다 조금 굵게)
    // 강조: 지역을 누르거나 취향(바다·자연·미식·역사)을 고르면 그 지형이 위로 늘어나듯 솟고(높을수록 많이, 스프링), 등고선이 빛남
    // 빛: 따뜻한 흰 심선 + 넓고 부드러운 주황 번짐 (참고: 어두운 지도 위 빛나는 경로선)
    highlight: { lift: 0.1, stretch: 0.75, dur: 1600, spring: [4.6, 7.2], radius: 0.55, core: '#FFE2B8', glow: ['#FF6410', '#FFA63A'], glowDay: ['#0A62E8', '#2EB6FF'], coreDay: '#8FD6FF' },
    pin: { line: 30 },      // 장소 이름표 선 길이(px)
    labelSplit: 127.75,     // 이 경도보다 서쪽 지역은 왼쪽 세로줄, 동쪽은 오른쪽 세로줄에 이름표
    // 고도별 색: 낮은 땅 코발트 → 보라 → 분홍 → 흰 봉우리 (0 = 해수면, 1 = 2,750m)
    ramp: [[0, '#2C47D6'], [0.18, '#3F5BE2'], [0.34, '#6A6FEA'], [0.48, '#9C7BE6'], [0.6, '#D18CD6'], [0.72, '#F2B3D6'], [0.85, '#FCDCEB'], [1, '#FFF9FC']],
    colors: { shadow: '#3A3370', mainland: '#EFEBF2', plinth: '#B9B2DC', paper: '#EFEBF2', spike: '#E86FB0', course: '#FF6B57', courseDay: '#1E8FE0' }, // 연보랏빛 종이, 분홍 빛기둥, 코스는 브랜드 다홍
    grain: 0.06,
    peaks: [],              // 산 이름 표기 (지금은 없음). 예: ['한라산', 33.362, 126.529, '1,947m']
    // 밤 버전: 실제 시각이 저녁·밤이면 지도도 밤으로 (낮 색 → 밤 색으로 섞임). 종이는 남색, 등고선은 하늘색, 건물 창에 불이 켜짐
    night: { paper: '#141734', plinth: '#252A58', mainland: '#141734', shadow: '#03040E', ink: '#9FCBFF', inkA: 0.42,
      tint: [0.2, 0.22, 0.44], lamp: '#8FD3FF', lampHot: '#FF7A4D', windows: 0.17 }, // tint: 지형 색에 곱하는 값, windows: 불 켜진 창 비율
    // 부드러운 그림자: 덮는 범위(±extent), 해상도, 층마다 [번짐 반경, 높이에 곱해 밀려나는 거리, 진하기], 전체 세기
    softShadow: { extent: 30, px: 2048, strength: 0.9, layers: [[0.06, 1.2, 0.8], [0.4, 4, 0.55], [1.0, 8, 0.4]] },
    sun: [26, 19, -22],     // 오른쪽 위(북동쪽)에서 비치는 빛: 그림자는 왼쪽 아래(남서쪽)로
    hemi: 0.5,              // 반사광을 줄여 부조의 명암을 살림
    shadow: { national: 0.55, region: 1 }, // 그림자 범위 (0 = 넓게, 1 = 좁고 선명하게)
    fov: 30,
    intro: { pitch: 89, dist: 46, dur: 2100, rise: 1500 }, // 종이처럼 내려다본 평면에서 기울며 남쪽부터 솟아오름
    national: { lat: 36.1, lon: 126.75, dist: 31, pitch: 50, yaw: 0 }, // lon을 서쪽으로 두어 한반도가 화면 오른쪽에 (왼쪽 글자 자리 확보)
    region: { pitch: 46, pad: 3.0, min: 8, shift: 0.16 },  // 지역 확대: 지역 크기 x pad + min 거리. shift: 거리에 비례해 바라보는 점을 서쪽으로 (지역이 화면 오른쪽, 왼쪽 글자 자리 확보)
    camDur: 1300,
    veil: { in: 260, out: 520 }, // 종이 지도가 화면을 채운 뒤 종이색으로 덮였다가 걷힘
    phone: { at: [0.8, -0.6], size: 0.36, narrowAt: [0.56, -0.7], narrowSize: 0.24, turn: 0.38 }, // 종이 위에 놓인 휴대폰: 화면 위치(-1~1), 화면 높이 대비 크기, 비스듬히 놓인 각도
    liftDur: 700,                // 손에 든 지도가 들려 화면을 채우는 시간
    filters: ['전체', '바다', '자연', '미식', '역사'],
    // 장소 (예시 데이터. 위경도는 실제 위치, 이동 시간은 대략값)
    places: [
      { id: 'gyeongbok', name: '경복궁', region: 'capital', lat: 37.5796, lon: 126.977, tags: ['역사'], line: '조선의 첫 궁궐. 해 질 무렵 근정전 처마가 가장 곱다.', trip: '서울역에서 지하철 15분' },
      { id: 'gwangjang', name: '광장시장', region: 'capital', lat: 37.57, lon: 126.9996, tags: ['미식'], line: '빈대떡과 육회, 마약김밥으로 이어지는 먹자골목.', trip: '서울역에서 지하철 20분' },
      { id: 'hwaseong', name: '수원 화성', region: 'capital', lat: 37.2871, lon: 127.0119, tags: ['역사'], line: '성곽을 따라 한 바퀴, 밤에는 방화수류정에 불이 든다.', trip: '서울역에서 기차 30분' },
      // 수도권 요즘 뜨는 곳 (예시 데이터)
      { id: 'seoulforest', name: '서울숲', region: 'capital', lat: 37.5444, lon: 127.0374, tags: ['자연'], line: '성수 골목 바로 옆, 사슴이 사는 도심 숲.', trip: '서울역에서 지하철 25분' },
      { id: 'ikseon', name: '익선동 한옥거리', region: 'capital', lat: 37.5741, lon: 126.9895, tags: ['역사', '미식'], line: '좁은 한옥 골목에 숨은 찻집과 작은 식당들.', trip: '서울역에서 지하철 15분' },
      { id: 'mangwon', name: '망원시장', region: 'capital', lat: 37.556, lon: 126.9056, tags: ['미식'], line: '시장 먹거리를 들고 망원 한강공원까지 걷기.', trip: '서울역에서 지하철 25분' },
      { id: 'gyeongui', name: '연남동 경의선숲길', region: 'capital', lat: 37.56, lon: 126.923, tags: ['자연'], line: '옛 철길 자리에 생긴 긴 잔디 산책길.', trip: '서울역에서 공항철도 10분' },
      { id: 'chinatown', name: '인천 차이나타운', region: 'capital', lat: 37.4757, lon: 126.6176, tags: ['미식', '역사'], line: '짜장면이 처음 생긴 골목과 개항장 거리.', trip: '서울역에서 지하철 1시간' },
      { id: 'eurwangri', name: '을왕리 해변', region: 'capital', lat: 37.4478, lon: 126.3729, tags: ['바다'], line: '공항 옆 서해 바다, 해 질 녘 조개구이.', trip: '서울역에서 공항철도와 버스 약 1시간 20분' },
      { id: 'dumulmeori', name: '양평 두물머리', region: 'capital', lat: 37.5333, lon: 127.3197, tags: ['자연'], line: '두 강이 만나는 곳, 물안개 낀 아침의 느티나무.', trip: '청량리역에서 경의중앙선 약 1시간' },
      { id: 'namhan', name: '남한산성', region: 'capital', lat: 37.4789, lon: 127.1817, tags: ['역사', '자연'], line: '성곽길을 따라 걷고 산성마을 닭백숙으로 마무리.', trip: '서울역에서 지하철과 버스 약 1시간' },
      { id: 'hwadam', name: '곤지암 화담숲', region: 'capital', lat: 37.4087, lon: 127.2989, tags: ['자연'], line: '모노레일로 오르는 단풍 숲, 가을에 가장 붐비는 곳.', trip: '판교역에서 경강선 약 20분' },
      { id: 'icheonrice', name: '이천 쌀밥거리', region: 'capital', lat: 37.2622, lon: 127.447, tags: ['미식'], line: '이천 쌀로 지은 돌솥밥에 반찬 스무 가지.', trip: '판교역에서 경강선 약 30분' },
      { id: 'silleuksa', name: '여주 신륵사', region: 'capital', lat: 37.2986, lon: 127.6556, tags: ['역사'], line: '남한강 바위 위에 선 정자와 오래된 절.', trip: '판교역에서 경강선 약 50분' },
      { id: 'jazz', kind: 'event', when: '10월', name: '자라섬 재즈 페스티벌', region: 'capital', lat: 37.8186, lon: 127.5236, tags: ['자연'], line: '강 위 섬의 잔디밭에서 듣는 가을 재즈.', trip: '용산역에서 ITX 약 1시간' },
      { id: 'cherry', kind: 'event', when: '4월', name: '여의도 봄꽃축제', region: 'capital', lat: 37.5258, lon: 126.9166, tags: ['자연'], line: '윤중로를 덮는 벚꽃 터널.', trip: '서울역에서 지하철 20분' },
      { id: 'lantern-seoul', kind: 'event', when: '12월', name: '서울 빛초롱축제', region: 'capital', lat: 37.569, lon: 126.9784, tags: ['역사'], line: '청계천을 따라 흐르는 전통 등불.', trip: '서울역에서 지하철 10분' },
      { id: 'anmok', name: '강릉 안목해변', region: 'gangwon', lat: 37.7725, lon: 128.9475, tags: ['바다', '미식'], line: '커피거리 창가에서 보는 동해.', trip: '서울역에서 KTX 약 2시간' },
      { id: 'seorak', name: '설악산', region: 'gangwon', lat: 38.1195, lon: 128.4656, tags: ['자연'], line: '케이블카로 권금성까지, 단풍철에는 이른 아침에.', trip: '서울에서 버스 약 2시간 30분' },
      { id: 'sokcho', name: '속초 중앙시장', region: 'gangwon', lat: 38.2049, lon: 128.5904, tags: ['미식', '바다'], line: '닭강정과 오징어순대, 바다가 바로 옆.', trip: '서울에서 버스 약 2시간 30분' },
      { id: 'nami', name: '남이섬', region: 'gangwon', lat: 37.7906, lon: 127.5257, tags: ['자연'], line: '메타세쿼이아 길을 걷는 반나절.', trip: '용산역에서 ITX 약 1시간' },
      { id: 'dodam', name: '단양 도담삼봉', region: 'chungbuk', lat: 36.9988, lon: 128.3437, tags: ['자연'], line: '남한강 위 세 봉우리, 물안개 낀 아침이 좋다.', trip: '청량리역에서 KTX 약 1시간 10분' },
      { id: 'beopju', name: '속리산 법주사', region: 'chungbuk', lat: 36.5425, lon: 127.833, tags: ['자연', '역사'], line: '오리숲 길 끝의 오래된 절.', trip: '서울에서 버스 약 3시간' },
      { id: 'gongsan', name: '공주 공산성', region: 'chungnam', lat: 36.4631, lon: 127.1253, tags: ['역사'], line: '금강을 내려다보는 백제의 성곽길.', trip: '용산역에서 KTX 약 1시간 10분' },
      { id: 'sungsim', name: '대전 성심당', region: 'chungnam', lat: 36.3277, lon: 127.4273, tags: ['미식'], line: '튀김소보로 하나 들고 시작하는 대전 여행.', trip: '서울역에서 KTX 약 1시간' },
      { id: 'kkotji', name: '태안 꽃지해변', region: 'chungnam', lat: 36.4997, lon: 126.3343, tags: ['바다'], line: '할미·할아비 바위 뒤로 지는 서해 노을.', trip: '서울에서 버스 약 2시간 30분' },
      { id: 'jeonju', name: '전주 한옥마을', region: 'jeonbuk', lat: 35.815, lon: 127.153, tags: ['역사', '미식'], line: '한옥 골목과 비빔밥, 밤에는 남부시장 야시장.', trip: '용산역에서 KTX 약 1시간 40분' },
      { id: 'gunsan', name: '군산 근대거리', region: 'jeonbuk', lat: 35.989, lon: 126.711, tags: ['역사'], line: '오래된 은행과 적산가옥 사이를 걷는 시간 여행.', trip: '용산역에서 기차 약 3시간' },
      { id: 'byeonsan', name: '변산 채석강', region: 'jeonbuk', lat: 35.624, lon: 126.47, tags: ['바다', '자연'], line: '책을 쌓아 놓은 듯한 바위 절벽.', trip: '서울에서 버스 약 3시간' },
      { id: 'yeosu', name: '여수 돌산', region: 'jeonnam', lat: 34.74, lon: 127.74, tags: ['바다', '미식'], line: '해상 케이블카와 밤바다, 갓김치 한 접시.', trip: '용산역에서 KTX 약 3시간' },
      { id: 'suncheon', name: '순천만 습지', region: 'jeonnam', lat: 34.887, lon: 127.509, tags: ['자연'], line: '갈대 사이 데크길, 용산 전망대의 S자 물길.', trip: '용산역에서 KTX 약 2시간 40분' },
      { id: 'damyang', name: '담양 죽녹원', region: 'jeonnam', lat: 35.326, lon: 126.987, tags: ['자연'], line: '대숲 바람 소리를 들으며 걷는 길.', trip: '광주송정역에서 버스 약 50분' },
      { id: 'boseong', name: '보성 녹차밭', region: 'jeonnam', lat: 34.711, lon: 127.08, tags: ['자연'], line: '언덕을 덮은 차밭의 초록 물결.', trip: '광주송정역에서 버스 약 1시간 30분' },
      { id: 'bulguk', name: '경주 불국사', region: 'gyeongbuk', lat: 35.79, lon: 129.332, tags: ['역사'], line: '다보탑과 석가탑, 이어서 석굴암까지.', trip: '서울역에서 KTX 약 2시간 10분' },
      { id: 'hahoe', name: '안동 하회마을', region: 'gyeongbuk', lat: 36.539, lon: 128.518, tags: ['역사'], line: '강이 휘감아 도는 양반 마을과 부용대 전망.', trip: '청량리역에서 KTX 약 2시간' },
      { id: 'homigot', name: '포항 호미곶', region: 'gyeongbuk', lat: 36.077, lon: 129.567, tags: ['바다'], line: '바다 위 상생의 손, 해맞이 명소.', trip: '서울역에서 KTX 약 2시간 30분' },
      { id: 'seomun', name: '대구 서문시장', region: 'gyeongbuk', lat: 35.869, lon: 128.581, tags: ['미식'], line: '납작만두와 칼국수, 밤에는 야시장.', trip: '서울역에서 KTX 약 1시간 50분' },
      { id: 'haeundae', name: '부산 해운대', region: 'gyeongnam', lat: 35.1587, lon: 129.1604, tags: ['바다'], line: '해변 산책 뒤 블루라인파크 해변열차.', trip: '서울역에서 KTX 약 2시간 40분' },
      { id: 'jagalchi', name: '자갈치시장', region: 'gyeongnam', lat: 35.0966, lon: 129.0306, tags: ['미식', '바다'], line: '고른 회를 2층에서 바로 맛보는 곳.', trip: '부산역에서 지하철 10분' },
      { id: 'dongpirang', name: '통영 동피랑', region: 'gyeongnam', lat: 34.8457, lon: 128.4272, tags: ['바다'], line: '벽화 골목 꼭대기에서 내려다보는 강구안.', trip: '서울에서 버스 약 4시간' },
      { id: 'jinju', name: '진주성', region: 'gyeongnam', lat: 35.189, lon: 128.079, tags: ['역사'], line: '남강 위 촉석루, 가을에는 유등축제.', trip: '서울역에서 KTX 약 3시간 30분' },
      { id: 'seongsan', name: '성산일출봉', region: 'jeju', lat: 33.4581, lon: 126.9425, tags: ['자연', '바다'], line: '분화구 위에서 맞는 제주의 해돋이.', trip: '김포에서 비행기 약 1시간 10분' },
      { id: 'hallasan', name: '한라산', region: 'jeju', lat: 33.3617, lon: 126.5292, tags: ['자연'], line: '영실 코스로 오르는 윗세오름의 초원.', trip: '김포에서 비행기 약 1시간 10분' },
      { id: 'hyeopjae', name: '협재해변', region: 'jeju', lat: 33.394, lon: 126.239, tags: ['바다'], line: '비양도가 보이는 옥빛 바다.', trip: '김포에서 비행기 약 1시간 10분' },
      { id: 'dongmun', name: '동문시장', region: 'jeju', lat: 33.512, lon: 126.528, tags: ['미식'], line: '흑돼지 꼬치와 귤, 밤에는 야시장.', trip: '김포에서 비행기 약 1시간 10분' },
      // 축제·행사 (kind: 'event', when: 열리는 때. 예시 데이터라 날짜는 해마다 확인 필요)
      { id: 'fireworks', kind: 'event', when: '11월', name: '부산 불꽃축제', region: 'gyeongnam', lat: 35.1532, lon: 129.1187, tags: ['바다'], line: '광안대교 위로 터지는 불꽃, 해변에 앉아 보는 밤.', trip: '서울역에서 KTX 약 2시간 40분' },
      { id: 'mud', kind: 'event', when: '7월', name: '보령 머드축제', region: 'chungnam', lat: 36.3053, lon: 126.5156, tags: ['바다'], line: '대천해수욕장 갯벌에서 온몸으로 즐기는 여름.', trip: '용산역에서 기차 약 2시간 30분' },
      { id: 'eoksae', kind: 'event', when: '10~11월', name: '정선 민둥산 억새꽃 축제', region: 'gangwon', lat: 37.318, lon: 128.72, tags: ['자연'], line: '산 정상을 덮은 은빛 억새 물결.', trip: '청량리역에서 기차 약 3시간' },
      { id: 'snow', kind: 'event', when: '1~2월', name: '태백산 눈축제', region: 'gangwon', lat: 37.098, lon: 128.915, tags: ['자연'], line: '눈 조각 사이를 걷는 겨울 산.', trip: '청량리역에서 기차 약 4시간' },
      { id: 'chimaek', kind: 'event', when: '7월', name: '대구 치맥 페스티벌', region: 'gyeongbuk', lat: 35.846, lon: 128.558, tags: ['미식'], line: '두류공원 잔디밭에서 치킨과 맥주.', trip: '서울역에서 KTX 약 1시간 50분' },
      { id: 'jeotgal', kind: 'event', when: '10월', name: '강경 젓갈축제', region: 'chungnam', lat: 36.159, lon: 127.012, tags: ['미식'], line: '포구 마을의 젓갈 장터와 김장 준비.', trip: '용산역에서 기차 약 2시간' },
      { id: 'lantern', kind: 'event', when: '10월', name: '진주 남강유등축제', region: 'gyeongnam', lat: 35.186, lon: 128.09, tags: ['역사'], line: '남강 위에 띄운 수천 개의 등불.', trip: '서울역에서 KTX 약 3시간 30분' },
      { id: 'maskdance', kind: 'event', when: '9~10월', name: '안동 국제탈춤 페스티벌', region: 'gyeongbuk', lat: 36.561, lon: 128.733, tags: ['역사'], line: '하회탈과 세계의 탈이 한자리에.', trip: '청량리역에서 KTX 약 2시간' },
    ],
    // 전체 버튼의 추천 (이번 시즌에 맞춰 고른 장소 id)
    picks: ['fireworks', 'eoksae', 'suncheon', 'bulguk', 'jeonju'],
    recs: 5,               // 취향 버튼마다 보여 줄 추천 개수
  },
  labels: {
    domestic: { enter: '승강장으로 이동', leave: '역 전체 보기', seatLeave: '승강장 보기', scene: 'KTX 역에 열차가 들어오는 장면' },
    overseas: { enter: '터미널 안으로 이동', leave: '공항 전체 보기', seatLeave: '게이트 보기', scene: '공항에 비행기가 내려앉아 들어오는 장면' },
  },

  camera: {
    // 기준 화면 1920x1080 (Figma 프레임과 같음). 화면 높이에 viewHeight 단위가 담겨요.
    target: [-1.4, 3.6, -1.6],
    viewHeight: 25,     // 화면 세로에 담기는 단위 수 (작을수록 확대). 1080px 기준 1단위 = 43.2px
    mobileViewHeight: 34,
  },

  // 초 단위
  motion: {
    trackStart: 1.4,  trackRise: 0.6,
    sleeperStagger: 0.0085,
    trainStart: 3.4,  trainDur: 3.4, trainFrom: -86,
    navIn: 2.2,
    cameraIntro: 3.6,
  },
};

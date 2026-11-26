// 일본 입체 지도 설정: 국내와 같은 축척(unit 2.0)과 재질. 세계 지도에서 일본을 누르면 이 지도로 넘어감
// 건물은 세우지 않음 (지형만). 장소는 일본 일곱 지역. 국내 값을 바탕으로 새 설정을 만들어 돌려줌
(window.EODI_GEO = window.EODI_GEO || {}).japanSpec = function (BASE) {
  const A = Object.assign({}, BASE, {
    proj: { lat0: 37, lon0: 137, kxLat: 37, riseLat: [30, 46] },
    labelEdges: [129.6, 145.4, 37],
    labelSplit: 138,
    national: { lat: 37.6, lon: 135.2, dist: 46, pitch: 50, yaw: 0 },
    intro: { pitch: 72, dist: 70, dur: 1800, rise: 1300 }, // 세계 지도에서 내려앉듯 이어지게 덜 위에서 시작
    region: { pitch: 46, pad: 2.6, min: 8, shift: 0.16 },
    peaks: [],
    city: Object.assign({}, BASE.city, { cities: [], rural: 0 }),
    relief: Object.assign({}, BASE.relief, { mainland: 0.5 }),
    leaveNational: '세계 지도',
    leaveRegion: '일본 전체 보기',                       // 전국(일본 전체)에서 뒤로 가면 세계 지도로
  });
  const P = (id, name, region, lat, lon, tags, line, trip, ev) => Object.assign({ id, name, region, lat, lon, tags, line, trip }, ev ? { kind: 'event', when: ev } : {});
  A.places = [
    P('sapporo-snow', '삿포로 눈축제', 'hokkaido', 43.06, 141.35, ['자연'], '오도리 공원을 따라 늘어선 거대한 눈 조각.', '인천에서 비행 2시간 50분', '2월'),
    P('otaru', '오타루 운하', 'hokkaido', 43.197, 141.0, ['역사', '바다'], '가스등이 켜지는 겨울 밤의 돌 창고 운하.', '삿포로에서 기차 40분'),
    P('biei', '비에이 청의 호수', 'hokkaido', 43.49, 142.61, ['자연'], '눈 덮인 숲 사이 푸른 빛이 비치는 연못.', '삿포로에서 차 2시간 30분'),
    P('furano', '후라노', 'hokkaido', 43.34, 142.38, ['자연'], '겨울에는 설원, 여름에는 라벤더 언덕.', '삿포로에서 기차 2시간'),
    P('noboribetsu', '노보리베츠 온천', 'hokkaido', 42.497, 141.15, ['자연'], '김이 피어오르는 지옥 계곡과 유황 온천.', '신치토세에서 버스 1시간'),
    P('hakodate', '하코다테 야경', 'hokkaido', 41.76, 140.70, ['바다', '역사'], '두 바다 사이로 반짝이는 항구 도시의 밤.', '삿포로에서 기차 3시간 40분'),
    P('asahiyama', '아사히야마 동물원', 'hokkaido', 43.768, 142.48, ['자연'], '눈길을 걷는 펭귄 산책.', '삿포로에서 기차 1시간 30분'),
    P('niseko', '니세코', 'hokkaido', 42.86, 140.69, ['자연'], '요테이산을 마주한 파우더 스노 스키장.', '신치토세에서 버스 2시간 30분'),
    P('sendai', '센다이 빛의 페이지 축제', 'tohoku', 38.268, 140.87, ['역사'], '느티나무 가로수에 켜지는 수십만 개의 불빛.', '인천에서 비행 2시간 20분', '12월'),
    P('shibuya', '도쿄 시부야', 'kanto', 35.659, 139.70, ['미식'], '스크램블 교차로와 밤늦게까지 이어지는 골목.', '인천에서 비행 2시간 20분'),
    P('hakone', '하코네 온천', 'kanto', 35.233, 139.1, ['자연'], '후지산이 보이는 노천 온천 마을.', '도쿄에서 기차 1시간 30분'),
    P('kanazawa', '가나자와 겐로쿠엔', 'chubu', 36.562, 136.66, ['역사'], '눈 무게를 받치는 유키즈리가 걸린 정원.', '도쿄에서 신칸센 2시간 30분'),
    P('kyoto-autumn', '교토 단풍', 'kansai', 35.0, 135.77, ['역사', '자연'], '절마다 붉게 물드는 11월의 교토.', '간사이 공항에서 기차 1시간 20분'),
    P('dotonbori', '오사카 도톤보리', 'kansai', 34.669, 135.501, ['미식'], '네온 아래 타코야키와 쿠시카츠.', '인천에서 비행 1시간 50분'),
    P('hiroshima', '미야지마', 'chugoku', 34.296, 132.32, ['역사', '바다'], '바다 위에 선 붉은 도리이.', '히로시마에서 배 10분'),
    P('nakasu', '후쿠오카 나카스 포장마차', 'kyushu', 33.592, 130.405, ['미식'], '강가에 밤마다 서는 라멘·꼬치 포장마차.', '인천에서 비행 1시간 20분'),
  ];
  A.picks = ['sapporo-snow', 'otaru', 'kyoto-autumn', 'hakone', 'nakasu'];
  return A;
};

// 초현실 실사 재질: KTX, 정거장, 비행기, 공항 모델을 실제 소재처럼 빛나게 하되 현실에 없을 만큼 고운 쪽으로
// - 열차·비행기 도장: 거울처럼 매끈한 펄 크롬. 둘레의 하늘과 분홍·라일락 스튜디오 빛을 그대로 비추고, 가장자리는 얇은 막 간섭색으로 물듦
// - 유리: 다이크로익(색이 바뀌는) 건축 유리처럼 반사 속에 무지갯빛이 흐름
// - 지붕: 유약 바른 도자기처럼 매끈한 광택
// - 승강장, 역사, 터미널, 기둥: 갈아 낸 흰 대리석 (회보라 결과 가는 금빛 결, 세계 좌표 기준이라 모서리를 지나도 결이 이어짐)
// - 금속: 코팅된 금속 광택
// - 마우스를 올리면 빛줄기가 차체를 따라 앞에서 뒤로 훑고 지나가며 가장자리가 따뜻하게 빛남
// scene.js가 THREE와 설정값(S.dream, S.atlas)을 넘기면 patch(재질, 종류, 강조값)를 돌려줌. patch는 바뀐 재질을 돌려주므로 그 재질을 써야 함
(function () {
  window.EODI_DREAM = function (THREE, spec, atlas) {
    const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
    const ramp = atlas.ramp;
    const at = (t) => lin(ramp.reduce((best, r) => (Math.abs(r[0] - t) < Math.abs(best[0] - t) ? r : best))[1]);
    // 모든 재질이 함께 쓰는 값: 밤낮, 시간, 진주빛 세 색, 글로우 색
    const G = {
      uDNight: { value: 0 }, uDTime: { value: 0 },
      uDP0: { value: at(0.34) }, uDP1: { value: at(0.6) }, uDP2: { value: at(0.85) },
      uDMBase: { value: lin(spec.marble.base) }, uDMVein: { value: lin(spec.marble.vein) }, uDMGold: { value: lin(spec.marble.gold) }, uDMScale: { value: spec.marble.scale },
      uDGlowA: { value: lin(atlas.highlight.glow[0]) }, uDGlowB: { value: lin(atlas.highlight.glow[1]) }, uDCore: { value: lin(atlas.highlight.core) },
    };
    const OFF = { value: 0 };
    const made = new Map(); // 원래 재질 → 바뀐 재질 (여러 모델이 같은 재질을 나눠 쓰면 한 번만 바꿈)

    // 실제 소재 값: 클리어코트, 얇은 막 간섭색, 반사 세기. 표준 재질을 물리 재질로 옮겨 담음
    function toPhysical(m, phys) {
      if (!phys) return m;
      const P = new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(P, m);
      P.defines = { STANDARD: '', PHYSICAL: '' };
      P.onBeforeCompile = m.onBeforeCompile; P.userData = { ...m.userData };
      if (m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) P.customProgramCacheKey = m.customProgramCacheKey;
      const { iridescenceThicknessRange, tint, ...rest } = phys;
      Object.assign(P, rest);
      if (tint) P.color = lin(tint); // 반사 색을 정하는 바탕색
      if (iridescenceThicknessRange) P.iridescenceThicknessRange = [...iridescenceThicknessRange];
      return P;
    }

    function patch(m0, kind, hot) {
      if (!m0) return m0;
      if (made.has(m0)) return made.get(m0);
      const K = spec.kinds[kind] || spec.kinds.structure;
      const m = toPhysical(m0, K.physical);
      made.set(m0, m); made.set(m, m);
      const U = { ...G, uDMarble: { value: K.marble || 0 }, uDPearl: { value: K.pearl }, uDGlow: { value: K.glow }, uDGrain: { value: spec.grain }, uDHot: hot || OFF };
      const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.call(m) : '';
      m.onBeforeCompile = function (sh, r) {
        if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(this, sh, r);
        Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec3 vDW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vec4 dwp = vec4(transformed, 1.);
#ifdef USE_INSTANCING
          dwp = instanceMatrix * dwp;
#endif
          vDW = (modelMatrix * dwp).xyz;`);
        sh.fragmentShader = `varying vec3 vDW;
          uniform float uDNight, uDTime, uDPearl, uDGlow, uDGrain, uDHot, uDMarble, uDMScale;
          uniform vec3 uDP0, uDP1, uDP2, uDGlowA, uDGlowB, uDCore, uDMBase, uDMVein, uDMGold;
          // 대리석: 3차원 잡음으로 결을 비틀어 흰 바탕에 굵은 회보라 결, 가는 잔결, 드문 금빛 결
          float dH1(float n) { return fract(sin(n) * 43758.5453); }
          float dN3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); float n = dot(i, vec3(1., 57., 113.));
            return mix(mix(mix(dH1(n), dH1(n + 1.), f.x), mix(dH1(n + 57.), dH1(n + 58.), f.x), f.y), mix(mix(dH1(n + 113.), dH1(n + 114.), f.x), mix(dH1(n + 170.), dH1(n + 171.), f.x), f.y), f.z); }
          float dF3(vec3 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * dN3(p); p = p * 2.03 + 1.7; a *= .5; } return s; }
          vec3 dMarbleC(vec3 p) {
            p *= uDMScale;
            float t = dF3(p * .8);
            float vein = pow(1. - abs(sin((p.x * .9 + p.y * .55 + p.z * .7) * 2. + t * 7.)), 9.);
            float fine = pow(1. - abs(sin((p.x * .35 - p.z * .8 + p.y * .25) * 3.1 + dF3(p * 1.7 + 3.) * 5.)), 20.);
            float gold = pow(1. - abs(sin((p.z * .6 + p.y * .4 - p.x * .2) * 1.6 + t * 9.)), 46.);
            vec3 c = uDMBase * (1. - .05 * dF3(p * 2.6 + 7.));               // 구름 같은 은은한 얼룩
            c = mix(c, uDMVein, clamp(vein * .6 + fine * .35, 0., 1.));
            return mix(c, uDMGold, gold * .75);
          }
          float dH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          vec3 dRamp(float t) { t = fract(t) * 3.; return t < 1. ? mix(uDP0, uDP1, t) : t < 2. ? mix(uDP1, uDP2, t - 1.) : mix(uDP2, uDP0, t - 2.); }
          ` + sh.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
          // 대리석 재질: 원래 무늬의 밝기(줄눈, 이음매)는 살리고 색은 대리석 결로
          if (uDMarble > .5) { float dT = dot(diffuseColor.rgb, vec3(.299, .587, .114)); diffuseColor.rgb = dMarbleC(vDW) * mix(1., clamp(dT / .8, .55, 1.05), .55); }
          // 무늬 색으로 면의 성격을 나눔: 밝은 도장, 오렌지 포인트
          float dLum = dot(diffuseColor.rgb, vec3(.299, .587, .114));
          float dOr = clamp((diffuseColor.r - diffuseColor.b) * 2.2 - .35, 0., 1.) * step(.12, diffuseColor.r) * (1. - uDMarble);
          float dWhite = smoothstep(.35, .75, dLum) * (1. - dOr);`)
          .replace('#include <output_fragment>', `#include <output_fragment>
          vec3 dVd = isOrthographic ? vec3(0., 0., 1.) : normalize(vViewPosition);
          float dFr = 1. - clamp(abs(dot(normal, dVd)), 0., 1.);
          vec3 dWn = inverseTransformDirection(normal, viewMatrix);
          // 진주빛 그늘: 흰 면의 비스듬한 그늘 쪽만 아주 옅게 분홍·보라로 (실제 펄 도장의 그늘색처럼)
          vec3 dPearl = dRamp(dFr * .7 + dWn.y * .2 + (vDW.x - vDW.z) * .01);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * dPearl * 1.25, dWhite * uDPearl * dFr * dFr * (1. - .5 * uDNight));
          // 오렌지 포인트: 안쪽에서 은은하게 빛나는 듯
          gl_FragColor.rgb += mix(uDGlowA, uDGlowB, clamp(dWn.y * .5 + .5, 0., 1.)) * dOr * uDGlow * (1. + uDNight);
          // 강조: 빛줄기가 차체를 따라 앞에서 뒤로 훑고 지나가고, 윤곽이 따뜻하게 빛남
          float dSw = fract(vDW.z * .06 + uDTime * .7);
          float dBand = (1. - smoothstep(0., .07, abs(dSw - .5))) * (.6 + .4 * dFr);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uDCore, uDGlowB, .35) * 1.4, dBand * uDHot * .75);
          gl_FragColor.rgb += mix(uDGlowA, uDGlowB, dFr) * pow(dFr, 2.) * uDHot * .5;
          // 필름 결
          gl_FragColor.rgb *= 1. - uDGrain * (dH(floor(gl_FragCoord.xy / 2.)) - .5);`);
      };
      m.customProgramCacheKey = () => 'dream:' + kind + ':' + prevKey;
      m.needsUpdate = true;
      return m;
    }
    return { patch, G };
  };
})();

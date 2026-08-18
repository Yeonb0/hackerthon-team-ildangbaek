// src/types/environment.ts
//
// 날씨·자외선·습도 등급 — **홈(HOME-01)과 구매 전 확인(CHECK-01) 양쪽이 쓰는 공용 타입**입니다.
//
// 2026-08-18 신설. 원래는 `types/home.ts`와 `types/check.ts`가 각자 선언하고 있었는데,
// 그러다 `HumidityGrade`가 서로 다른 값으로 두 벌이 되는 사고가 났습니다 —
// home 쪽이 `LOW|NORMAL|HIGH`(백엔드에 없는 값), check 쪽이 `DRY|NORMAL|HUMID`(정답).
// `lib/weather.ts`가 home 쪽을 import하는 바람에 라벨 맵과 건조 팁 판정이 전부
// 매칭에 실패하는 상태였습니다(백엔드 environment가 하드코딩이라 아직 안 드러났을 뿐).
//
// 백엔드도 이 셋을 `domain/environment` 한 곳에 모아두고 있어 구조가 대응됩니다.
// **새 환경 관련 enum이 생기면 여기에 추가하고, home/check는 re-export만 하세요.**
// 같은 값을 두 파일에 선언하면 같은 사고가 반복됩니다.

/**
 * 날씨 상태 7종. 백엔드 `WeatherCondition.java`와 **완전히 일치합니다**(2026-08-18 확인).
 *
 * 이전 주석에 "OVERCAST/YELLOW_DUST/THUNDERSTORM은 백엔드에 없는 임의 키"라고 적혀
 * 있었는데 확정됐습니다. 반대로 폴백 안전망으로 넣어뒀던 `FOG`는 **백엔드 enum에서
 * 사라졌습니다** — 올 수 없는 값이라 타입에서 제거했습니다.
 * (`lib/weather.ts`의 세 라벨 함수는 매칭 실패 시 '알 수 없음'으로 폴백하므로,
 *  예상 못 한 값이 와도 화면이 죽지는 않습니다 — 로드맵 4-2 경고 대응.)
 */
export type WeatherCondition =
  | 'SUNNY' // 맑음
  | 'CLOUDY' // 구름 많음
  | 'OVERCAST' // 흐림
  | 'RAIN' // 비
  | 'SNOW' // 눈
  | 'YELLOW_DUST' // 황사
  | 'THUNDERSTORM'; // 천둥번개

/** 자외선 등급 5종. 백엔드 `UvGrade.java`와 일치합니다. */
export type UvGrade = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

/**
 * 습도 등급 3종. 백엔드 `HumidityGrade.java`와 일치합니다 (건조 <40 / 보통 / 습함 >70).
 *
 * ⚠️ **`LOW|NORMAL|HIGH`가 아닙니다.** 자외선 등급이 `LOW`를 쓰다 보니 습도도 그럴
 * 것이라 짐작하기 쉬운데, 백엔드는 습도만 `DRY`/`HUMID`라는 다른 어휘를 씁니다.
 *
 * ⚠️ 백엔드 `GET /home` 응답의 이 필드는 아직 enum이 아니라 **`String` 하드코딩**
 * (`HomeEnvironmentResponse.java:12`, 항상 `"NORMAL"`)입니다. `CHECK-01`은 제대로 된
 * enum을 보냅니다. enum 전환을 요청해 둔 상태입니다
 * (`docs/backend-request-2026-08-18.md` P1-1).
 */
export type HumidityGrade = 'DRY' | 'NORMAL' | 'HUMID';

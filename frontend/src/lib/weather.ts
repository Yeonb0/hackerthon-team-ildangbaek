// src/lib/weather.ts
//
// 날씨/자외선/습도 코드를 화면에 보여줄 한글 라벨로 바꿉니다.
// 원래 로드맵 계획은 "코드 → 아이콘" 매핑이었지만, 디자인 쪽 날씨 아이콘 세트(SVG)가
// 아직 없어서(Phase 4 체크포인트 A 시점 관리자 결정) 지금은 텍스트 라벨만 반환합니다.
// 아이콘이 오면 이 파일에 WEATHER_ICONS 맵을 하나 더 추가하고, 화면 쪽은 건드릴 필요가
// 없도록 getWeatherIcon() 같은 함수만 새로 내보내면 됩니다 — 매핑표를 여기 한 곳에 모아둔 이유입니다.
//
// ⚠️ 매핑에 없는 코드가 와도 화면이 죽으면 안 됩니다(로드맵 4-2 경고).
// 그래서 세 함수 모두 case를 못 찾으면 '알 수 없음' 같은 안전한 기본값으로 폴백합니다.
import type { HomeEnvironment } from '@/types/home';
import type { HumidityGrade, UvGrade, WeatherCondition } from '@/types/environment';

// 2026-08-18 — 백엔드 WeatherCondition.java와 전수 대조 완료. 7종 전부 일치합니다.
// 예전 주석이 "OVERCAST/YELLOW_DUST/THUNDERSTORM은 백엔드에 없는 임의 키"라고 했는데
// 확정됐고, 반대로 안전망으로 넣어뒀던 FOG는 백엔드 enum에서 사라져 제거했습니다.
// (매칭 실패 시 아래 함수들이 '알 수 없음'으로 폴백하므로 예상 못 한 값이 와도 안 죽습니다.)
const WEATHER_LABELS: Record<WeatherCondition, string> = {
  SUNNY: '맑음',
  CLOUDY: '구름 많음',
  OVERCAST: '흐림',
  RAIN: '비',
  SNOW: '눈',
  YELLOW_DUST: '황사',
  THUNDERSTORM: '천둥번개',
};

const UV_GRADE_LABELS: Record<UvGrade, string> = {
  LOW: '낮음',
  MODERATE: '보통',
  HIGH: '높음',
  VERY_HIGH: '매우 높음',
  EXTREME: '위험',
};

// 2026-08-18 — 키를 백엔드 값(DRY/NORMAL/HUMID)으로 교체했습니다. 예전엔 LOW/NORMAL/HIGH라
// 서버 값과 하나도 안 맞아 **항상 '알 수 없음'으로 폴백**하고 있었습니다.
// 라벨은 자외선("낮음/보통/높음")과 구분되게 습도 어휘를 씁니다.
const HUMIDITY_GRADE_LABELS: Record<HumidityGrade, string> = {
  DRY: '건조',
  NORMAL: '보통',
  HUMID: '습함',
};

const FALLBACK_LABEL = '알 수 없음';

export function getWeatherLabel(code: string): string {
  return WEATHER_LABELS[code as WeatherCondition] ?? FALLBACK_LABEL;
}

export function getUvGradeLabel(code: string): string {
  return UV_GRADE_LABELS[code as UvGrade] ?? FALLBACK_LABEL;
}

export function getHumidityGradeLabel(code: string): string {
  return HUMIDITY_GRADE_LABELS[code as HumidityGrade] ?? FALLBACK_LABEL;
}

// 2026-08-16 — 낮 홈(S-07) 배경용 날씨×화장대 일러스트(디자이너 전달분). 하단으로 갈수록
// 투명해지는 처리는 원본 PNG에 알파가 없어서(RGB) 이미지 자체를 마스킹하는 대신, 화면
// 쪽에서 같은 색(surfaceLavenderPale, #F5F2FF) LinearGradient를 이미지 위에 겹쳐서 같은
// 시각 효과를 냅니다(DayHomeScreen 참고) — 배경색과 그라데이션 도착색이 완전히 같아서
// 실제 마스킹과 결과물이 동일합니다.
//
// 2026-08-18 — YELLOW_DUST(황사) 실제 에셋이 도착해 자리표시자(cloudy.jpg)를 교체했습니다.
// 원본은 1195×1316 PNG였고, 기존 6종과 같은 규격(760px 폭 · RGB JPEG)으로 변환했습니다 —
// 원본 비율(0.9081)이 기존 에셋(0.9091)과 거의 같아 잘라내기 없이 그대로 줄였습니다.
// 이로써 7종 전부 실제 에셋이 채워졌습니다.
const WEATHER_BACKGROUNDS: Record<WeatherCondition, number> = {
  SUNNY: require('../../assets/weather/sunny.jpg'),
  CLOUDY: require('../../assets/weather/cloudy.jpg'),
  OVERCAST: require('../../assets/weather/overcast.jpg'),
  RAIN: require('../../assets/weather/rain.jpg'),
  SNOW: require('../../assets/weather/snow.jpg'),
  THUNDERSTORM: require('../../assets/weather/thunderstorm.jpg'),
  YELLOW_DUST: require('../../assets/weather/yellow_dust.jpg'),
};

export function getWeatherBackground(code: string): number {
  return WEATHER_BACKGROUNDS[code as WeatherCondition] ?? WEATHER_BACKGROUNDS.CLOUDY;
}

export type EnvironmentTip = { title: string; description: string };

/**
 * 홈 낮 화면 팁 카드 문구 — 백엔드 응답엔 이 필드가 없어서 uvGrade/humidityGrade로
 * 클라이언트가 직접 판단합니다(HOME01 목업 "자외선 지수가 높아요" 예시 그대로).
 * 자외선이 우선이고, 자외선이 평범하면 건조(습도 낮음)를 봅니다 — 둘 다 정상이면 팁 없음(null).
 * (Checkpoint 9-D, 관리자 결정 2026-08-11)
 */
export function getEnvironmentTip(environment: HomeEnvironment): EnvironmentTip | null {
  if (environment.uvGrade === 'VERY_HIGH' || environment.uvGrade === 'EXTREME') {
    return {
      title: '자외선 지수가 매우 높아요',
      description: '가능하면 외출을 줄이고, 자외선 차단제를 2~3시간마다 덧발라주세요.',
    };
  }
  if (environment.uvGrade === 'HIGH') {
    return {
      title: '자외선 지수가 높아요',
      description: '선크림을 먼저 챙기고 저자극 제품 위주로 사용해보세요.',
    };
  }
  // 2026-08-18 — 'LOW'로 비교하고 있어 **이 팁이 영원히 뜨지 않았습니다**(서버는 'DRY'를 보냄).
  if (environment.humidityGrade === 'DRY') {
    return {
      title: '습도가 낮아요',
      description: '수분 공급 제품으로 마무리해서 건조해지지 않게 관리해보세요.',
    };
  }
  return null;
}
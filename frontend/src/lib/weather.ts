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
import type { HomeEnvironment, HumidityGrade, UvGrade, WeatherCondition } from '@/types/home';

// 로드맵 문서 기준 7종 + 안전망으로 FOG(실제 백엔드 엔티티에 있는 값) 추가.
// OVERCAST/YELLOW_DUST/THUNDERSTORM 3개는 백엔드에 아직 없는 키 이름이라 확정 전까지 임시입니다.
const WEATHER_LABELS: Record<WeatherCondition, string> = {
  SUNNY: '맑음',
  CLOUDY: '구름 많음',
  OVERCAST: '흐림',
  RAIN: '비',
  SNOW: '눈',
  YELLOW_DUST: '황사',
  THUNDERSTORM: '천둥번개',
  FOG: '안개',
};

const UV_GRADE_LABELS: Record<UvGrade, string> = {
  LOW: '낮음',
  MODERATE: '보통',
  HIGH: '높음',
  VERY_HIGH: '매우 높음',
  EXTREME: '위험',
};

const HUMIDITY_GRADE_LABELS: Record<HumidityGrade, string> = {
  LOW: '낮음',
  NORMAL: '보통',
  HIGH: '높음',
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
  if (environment.humidityGrade === 'LOW') {
    return {
      title: '습도가 낮아요',
      description: '수분 공급 제품으로 마무리해서 건조해지지 않게 관리해보세요.',
    };
  }
  return null;
}
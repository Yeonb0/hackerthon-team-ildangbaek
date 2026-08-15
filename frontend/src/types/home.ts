// src/types/home.ts
// 명세서 §6 Home API(HOME-01) 기준. GET /home 하나가 S-07(낮)/S-08(밤)을 전부 커버하는 BFF 응답입니다.
//
// weather 값은 로드맵 문서 기준 7종(맑음·구름·흐림·비·눈·황사·천둥번개)을 씁니다.
// ⚠️ 백엔드 엔티티 코드(WeatherCondition.java)는 현재 SUNNY/CLOUDY/RAIN/SNOW/FOG 5종만
// 있고, 그중 SUNNY/CLOUDY/RAIN/SNOW 4개만 아래 7종과 이름이 겹칩니다. OVERCAST(흐림) ·
// YELLOW_DUST(황사) · THUNDERSTORM(천둥번개)은 백엔드에 아직 없는 값이라 키 이름을
// 임의로 정한 상태입니다 — 실제 API 연동 전에 백엔드 확정이 필요합니다(안 바뀌는 값 이름 요청 리스트에 추가 필요).
// FOG(안개)는 로드맵 7종엔 없지만 백엔드가 실제로 보낼 수 있는 값이라 폴백 방지용으로 같이 매핑해뒀습니다.
export type WeatherCondition =
  | 'SUNNY' // 맑음
  | 'CLOUDY' // 구름
  | 'OVERCAST' // 흐림 — 백엔드 키 이름 미확정
  | 'RAIN' // 비
  | 'SNOW' // 눈
  | 'YELLOW_DUST' // 황사 — 백엔드 키 이름 미확정
  | 'THUNDERSTORM' // 천둥번개 — 백엔드 키 이름 미확정
  | 'FOG'; // 안개 — 로드맵 7종엔 없지만 실제 백엔드 엔티티에 존재

export type UvGrade = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

export type HumidityGrade = 'LOW' | 'NORMAL' | 'HIGH';

export type HomeType = 'DAY' | 'NIGHT';

/** 캘린더 점 상태 — F-RECORD-01 / F-HOME-06 공용 (채움/외곽선/흐림) */
export type RecordDotStatus = 'FULL' | 'PARTIAL' | 'NONE';

/** environment는 낮에만 채워지고 밤에는 null입니다 (S-08에 날씨 영역이 없음) */
export interface HomeEnvironment {
  location: string;
  weather: WeatherCondition;
  temperature: number;
  uvIndex: number;
  uvGrade: UvGrade;
  humidity: number;
  humidityGrade: HumidityGrade;
}

export interface RoutineRecommendationItem {
  rank: number;
  productId: number;
  name: string;
  /** 근거 문구 — 명세서 F-HOME-04 BR2: 이유 없는 제품 나열은 허용하지 않음 (필수) */
  reason: string;
}

export interface RoutineRecommendation {
  /** 낮은 MORNING, 밤은 NIGHT 루틴 대상 */
  timeSlot: 'MORNING' | 'NIGHT';
  items: RoutineRecommendationItem[];
}

export interface TodayRecordSlot {
  productCompleted: boolean;
  skinCompleted: boolean;
}

/** 4개 슬롯 전체 상태 — 낮/밤 화면 무관하게 항상 반환됨 */
export interface TodayRecord {
  morning: TodayRecordSlot;
  night: TodayRecordSlot;
}

/** weeklyCalendar는 밤에만 반환 (이번 주, 월~오늘) */
export interface WeeklyCalendarDay {
  date: string; // 'YYYY-MM-DD'
  morning: RecordDotStatus;
  night: RecordDotStatus;
}

/** todayReport는 "밤 + 오늘 피부 기록 존재" 조건을 둘 다 만족할 때만 옵니다 */
export interface TodayReport {
  skinRecordId: number;
  totalScore: number;
  /** 비교 대상(전일 동일 시간대)이 없으면 null */
  previousScore: number | null;
  change: number | null;
  comparedTo: string | null;
  summary: string;
}

export interface FailedSection {
  section: string; // 예: 'environment'
  code: string; // 예: 'WEATHER_API_FAILED'
  message: string;
}

/** GET /home 응답 (result) 전체 */
export interface HomeResponse {
  homeType: HomeType;
  greeting: string;
  /** 밤 응답에만 존재 (예: "지금 기록을 남기면 내일 분석이 더 정확해져요") */
  recordPrompt?: string;
  /** 낮에만 값이 있고, 밤에는 null. 낮인데 null이면 failedSections에 'environment' 실패가 있다는 뜻 */
  environment: HomeEnvironment | null;
  routineRecommendation: RoutineRecommendation;
  todayRecord: TodayRecord;
  /** 밤에만 배열, 낮에는 null */
  weeklyCalendar: WeeklyCalendarDay[] | null;
  /** 조건(밤 + 오늘 피부기록) 미충족 시 null — 오류 아님 */
  todayReport: TodayReport | null;
  /** 부분 실패 영역 목록. 실패 없으면 빈 배열([]) — 필드 자체는 항상 존재 */
  failedSections: FailedSection[];
}
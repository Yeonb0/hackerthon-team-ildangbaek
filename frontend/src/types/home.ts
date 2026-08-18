// src/types/home.ts
// 명세서 §6 Home API(HOME-01) 기준. GET /home 하나가 S-07(낮)/S-08(밤)을 전부 커버하는 BFF 응답입니다.
//
//
// 날씨·자외선·습도 등급 3종은 `types/environment.ts`로 옮겼습니다(2026-08-18) —
// 구매 전 확인(check.ts)과 공유하는 값인데 양쪽이 따로 선언하다가 HumidityGrade가
// 서로 다른 값으로 두 벌이 됐던 이력이 있습니다. 여기서는 re-export만 합니다.
import type { WeatherCondition, UvGrade, HumidityGrade } from '@/types/environment';

export type { WeatherCondition, UvGrade, HumidityGrade };

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

/** weeklyCalendar는 밤에만 반환 (이번 주, 월~일 고정 7칸 — 오늘 이후는 NONE, 관리자님 결정 2026-08-14) */
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
// src/types/record.ts
// 명세서 §5 기록 허브 / §7 Record API 기준.
import type { TimeSlot } from '@/app/routes';
import type { RecordDotStatus } from '@/types/home';

/**
 * RECORD-01 캘린더 응답의 날짜 하나. 홈의 WeeklyCalendarDay와 점 규칙(FULL/PARTIAL/NONE)은
 * 같지만, 여기는 서버가 today 여부를 직접 내려줍니다(홈 쪽은 클라이언트가 오늘 날짜와 비교해서 계산).
 */
export interface RecordCalendarDay {
  date: string; // 'YYYY-MM-DD'
  morning: RecordDotStatus;
  night: RecordDotStatus;
  today: boolean;
}

export interface RecordMonthlySummary {
  productRecordCount: number;
  skinRecordCount: number;
}

/**
 * 월간 기록 화면(F-RECORD-02, Frame 10 210:1505) 날짜 탭 바텀시트용.
 *
 * 2026-08-18 — "대응 엔드포인트가 없다"던 예전 주석은 **절반만 맞았습니다.**
 * - **피부 점수**: `GET /reports/daily`(REPORT-03)가 있습니다. javadoc이 이 화면을
 *   명시적으로 지목하고 있어서, "자세히 보기" 경로는 이미 실API에 연결했습니다
 *   (`api/skin.ts`의 `getSkinRecordByDate`).
 * - **제품 목록**: 아직 없습니다. `/product-records/home`은 오늘 기준이고
 *   `/records/calendar`는 점 상태만 줍니다. 백엔드에 요청해 둔 상태입니다
 *   (`docs/backend-request-2026-08-18.md` P2-3).
 *
 * 그래서 이 타입은 **당분간 목업 유지**입니다. 제품 기록 API가 생기면 skinScore는
 * REPORT-03에서, 제품은 새 엔드포인트에서 각각 채우면 됩니다.
 */
export interface RecordDayProductItem {
  name: string;
}

export interface RecordDaySlotDetail {
  completed: boolean;
  items: RecordDayProductItem[];
}

export interface RecordDayDetailResponse {
  date: string;
  /** 그 날 피부 기록이 없으면 null. */
  skinScore: number | null;
  morningProducts: RecordDaySlotDetail;
  nightProducts: RecordDaySlotDetail;
}

/** GET /records/calendar 응답 (result). 조회 월의 모든 날짜를 항상 포함합니다(BR1). */
export interface RecordCalendarResponse {
  yearMonth: string; // 'YYYY-MM'
  days: RecordCalendarDay[];
  monthlySummary: RecordMonthlySummary;
}

export interface ProductSlotState {
  completed: boolean;
  recordId: number | null;
  summary: string | null;
}

export interface SkinSlotState {
  completed: boolean;
  skinRecordId: number | null;
  summary: string | null;
}

export interface TimeSlotRecordState {
  product: ProductSlotState;
  skin: SkinSlotState;
}

/** GET /records/today 응답 (result). 4개 슬롯을 항상 한 번에 반환합니다(BR1) — 탭 전환 시 재요청 없음. */
export interface RecordTodayResponse {
  date: string;
  defaultTab: TimeSlot;
  morning: TimeSlotRecordState;
  night: TimeSlotRecordState;
}

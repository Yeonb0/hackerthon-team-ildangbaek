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

/** 월간 기록 화면(F-RECORD-02, Frame 10 210:1505) 날짜 탭 바텀시트용.
 * ⚠️ 백엔드 API 명세서에 대응 엔드포인트가 없습니다 — 목업 전용(관리자 확인 필요,
 * 2026-08-15). 기존 제품 등록(ProductManualRegister)·이메일 인증 흐름과 같은 패턴으로
 * 우선 프론트만 구현했습니다. */
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

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
 * ✅ 2026-08-19(세션 20) 해결 — 백엔드가 요청(P2-3)대로 `GET /records/daily?date=`를
 * 추가했고(RecordController.getDaily), 응답이 이 타입과 필드까지 동일합니다.
 * `api/queries/record.ts`의 getRecordDayDetail이 실호출로 교체됐습니다.
 * 목업은 USE_MOCK=true 경로에만 남습니다.
 */
export interface RecordDayProductItem {
  name: string;
  /**
   * 2026-08-20(세션 21) 신설 — 시트의 "수정" 진입에 필요합니다.
   *
   * ⚠️ **현재 실서버는 이 값을 안 내려줍니다.** `RecordDailyProductItemResponse`가
   * `name` 하나뿐이라, 실서버 경로에서는 항상 `undefined`입니다
   * (`docs/backend-request-2026-08-20.md` P0-1로 요청해 둔 상태).
   *
   * `PATCH /product-records/{recordId}`(PRODUCT-06)는 `productIds` **전체 교체**라,
   * 수정 화면이 기존 구성을 체크 상태로 복원하지 못하면 사용자가 하나만 빼려고
   * 들어가도 나머지가 전부 지워집니다. 그래서 이 값이 없는 동안에는 시트의 수정
   * 버튼을 아예 그리지 않습니다(RecordDayDetailSheet의 `canEditProducts`).
   * 백엔드가 필드를 채워 내려주는 순간 버튼이 자동으로 나타납니다.
   */
  productId?: number | null;
}

export interface RecordDaySlotDetail {
  completed: boolean;
  /**
   * 이 슬롯의 제품 기록 ID. 기록이 없으면 null.
   * `PATCH /product-records/{recordId}`(PRODUCT-06)의 경로 변수로 씁니다.
   * 백엔드 `6571aa2`로 응답에 추가됐습니다(`RecordDailySlotResponse.recordId`).
   */
  recordId: number | null;
  items: RecordDayProductItem[];
}

export interface RecordDayDetailResponse {
  date: string;
  /** 그 날 피부 기록이 없으면 null. */
  skinScore: number | null;
  morningProducts: RecordDaySlotDetail;
  nightProducts: RecordDaySlotDetail;
  /**
   * 2026-08-20(세션 22) 신설 — 기록 허브 주간 스트립에서 **오늘이 아닌 날짜**를 눌렀을 때,
   * 오늘과 똑같은 4슬롯 카드 UI를 그리기 위해 필요합니다. 구조는 `RecordTodayResponse`의
   * `morning`/`night`와 **완전히 동일**합니다(같은 컴포넌트를 쓰기 때문에 갈리면 안 됩니다).
   *
   * ⚠️ **실서버는 아직 이 필드를 안 내려줍니다.**
   * `docs/backend-request-record-slot-by-date.md` P0-1로 요청해 둔 상태입니다.
   * 그동안 `api/queries/record.ts`의 `getRecordDayDetail`이 두 응답을 조합해 채웁니다:
   *
   *   제품 슬롯 ← `GET /records/daily`의 `morningProducts`/`nightProducts`
   *   피부 슬롯 ← `GET /reports/daily?date=`(REPORT-03)의 `records[]`를 timeSlot으로 매칭
   *
   * 그래서 이 타입에서는 **필수 필드**입니다 — 파싱 경계에서 항상 채워지므로 화면은
   * 옵셔널 분기를 하지 않습니다. 백엔드가 필드를 내려주기 시작하면 폴백 경로(추가
   * 네트워크 호출 1회)가 저절로 꺼집니다.
   */
  morning: TimeSlotRecordState;
  night: TimeSlotRecordState;
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

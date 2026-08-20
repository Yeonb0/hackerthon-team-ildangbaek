// src/api/queries/record.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { formatSlotSummary } from '@/lib/recordSummary';
import { USE_MOCK } from '@/api/useMock';
import { buildMockRecordCalendar, buildMockRecordDayDetail, buildMockRecordToday } from '@/api/mock/record';
import type {
  RecordCalendarResponse,
  RecordDayDetailResponse,
  RecordTodayResponse,
  TimeSlotRecordState,
} from '@/types/record';
import type { ReportDailyResult } from '@/types/report';
import type { SkinRecordResult } from '@/types/skin';
import type { TimeSlot } from '@/app/routes';

export async function getRecordCalendar(yearMonth?: string): Promise<RecordCalendarResponse> {
  if (USE_MOCK) {
    return buildMockRecordCalendar(yearMonth);
  }
  return unwrap<RecordCalendarResponse>(
    apiClient.get('/records/calendar', { params: yearMonth ? { yearMonth } : undefined }),
  );
}

export function useRecordCalendar(yearMonth?: string) {
  return useQuery({
    queryKey: ['recordCalendar', yearMonth ?? 'current'],
    queryFn: () => getRecordCalendar(yearMonth),
  });
}

export async function getRecordToday(): Promise<RecordTodayResponse> {
  if (USE_MOCK) {
    return buildMockRecordToday();
  }
  const raw = await unwrap<RecordTodayResponse>(apiClient.get('/records/today'));
  return normalizeRecordToday(raw);
}

/**
 * 2026-08-19(세션 18, 관리자님 9번 항목) — 백엔드가 슬롯 요약을 영어 하드코딩으로
 * 만들어서("Analysis score 72") 화면에 그대로 노출되던 문제. 변환 규칙과 배경은
 * `lib/recordSummary.ts` 주석 참고.
 *
 * **파싱 경계에서 한 번만 처리합니다.** 슬롯 요약을 그리는 화면이 여럿(기록 허브,
 * 홈 등)이라 화면마다 변환을 넣으면 하나 빠뜨렸을 때 그 화면만 영어로 남습니다.
 */
function normalizeRecordToday(response: RecordTodayResponse): RecordTodayResponse {
  const slot = (state: RecordTodayResponse['morning']): RecordTodayResponse['morning'] => ({
    product: { ...state.product, summary: formatSlotSummary(state.product.summary) },
    skin: { ...state.skin, summary: formatSlotSummary(state.skin.summary) },
  });
  return {
    ...response,
    morning: slot(response.morning),
    night: slot(response.night),
  };
}

export function useRecordToday() {
  return useQuery({
    queryKey: ['recordToday'],
    queryFn: getRecordToday,
  });
}

/**
 * 월간 기록 날짜 탭 바텀시트 — `GET /records/daily?date=YYYY-MM-DD`.
 *
 * 2026-08-19(세션 20) — 목업 전용이던 걸 실 API로 연결했습니다. 세션 초반 백엔드 전수
 * 대조에서 **이미 구현돼 있는데 프론트가 안 쓰던 엔드포인트**로 잡혔습니다
 * (RecordController.getDaily). 응답 형태가 RecordDayDetailResponse와 필드까지 동일해서
 * 변환이 필요 없습니다: date / skinScore / morningProducts / nightProducts.
 */
export async function getRecordDayDetail(date: string): Promise<RecordDayDetailResponse> {
  if (USE_MOCK) {
    return buildMockRecordDayDetail(date);
  }

  // 실서버는 아직 morning/night(슬롯 상태)를 안 내려줍니다 — 그래서 응답을 "일부 필드가
  // 없을 수 있는" 형태로 받습니다. 요청서: docs/backend-request-record-slot-by-date.md P0-1
  const raw = await unwrap<PartialRecordDayDetail>(
    apiClient.get('/records/daily', { params: { date } }),
  );

  if (raw.morning && raw.night) {
    // 백엔드가 P0-1을 반영한 경우 — 조합이 필요 없습니다. 요약 문자열만 오늘 경로
    // (normalizeRecordToday)와 똑같이 한국어로 변환합니다.
    return { ...raw, morning: normalizeSlot(raw.morning), night: normalizeSlot(raw.night) };
  }

  // ── 폴백 ── 제품 슬롯은 이 응답에서, 피부 슬롯은 REPORT-03에서 가져와 조합합니다.
  // 피부 조회가 실패해도 제품 슬롯은 살려야 하므로 실패를 흡수합니다(그 날 기록이
  // 없으면 REPORT-03은 200 + 빈 배열이라, catch로 오는 건 진짜 장애뿐입니다).
  let skinRecords: SkinRecordResult[] = [];
  try {
    const daily = await unwrap<ReportDailyResult>(
      apiClient.get('/reports/daily', { params: { date } }),
    );
    skinRecords = daily.records;
  } catch {
    skinRecords = [];
  }

  return {
    ...raw,
    morning: composeSlot(raw.morningProducts, skinRecords, 'MORNING'),
    night: composeSlot(raw.nightProducts, skinRecords, 'NIGHT'),
  };
}

/** 실서버 응답 과도기 형태 — morning/night가 아직 없을 수 있습니다(P0-1 대기). */
type PartialRecordDayDetail = Omit<RecordDayDetailResponse, 'morning' | 'night'> &
  Partial<Pick<RecordDayDetailResponse, 'morning' | 'night'>>;

function normalizeSlot(state: TimeSlotRecordState): TimeSlotRecordState {
  return {
    product: { ...state.product, summary: formatSlotSummary(state.product.summary) },
    skin: { ...state.skin, summary: formatSlotSummary(state.skin.summary) },
  };
}

/**
 * 제품 기록 상세 + 그 날 피부 기록 목록 → 슬롯 상태 하나.
 *
 * 제품 요약은 서버 문자열이 아니라 **items[]에서 직접 조립**합니다. `/records/daily`에는
 * 애초에 요약 필드가 없고, 있더라도 영어 하드코딩이라(lib/recordSummary.ts 참고)
 * 되파싱보다 이쪽이 정확합니다. 오늘 경로가 보여주는 문구("A 외 2개")와 같은 형식입니다.
 */
function composeSlot(
  products: RecordDayDetailResponse['morningProducts'],
  skinRecords: SkinRecordResult[],
  timeSlot: TimeSlot,
): TimeSlotRecordState {
  const names = products.items.map((item) => item.name).filter(Boolean);
  const productSummary = products.completed
    ? names.length === 0
      ? '제품 기록 완료'
      : names.length === 1
        ? names[0]
        : `${names[0]} 외 ${names.length - 1}개`
    : null;

  const skin = skinRecords.find((record) => record.timeSlot === timeSlot) ?? null;

  return {
    product: {
      completed: products.completed,
      recordId: products.recordId,
      summary: productSummary,
    },
    skin: {
      completed: skin !== null,
      skinRecordId: skin?.skinRecordId ?? null,
      summary: skin ? `분석 점수 ${Math.round(skin.totalScore)}점` : null,
    },
  };
}

export function useRecordDayDetail(date: string | null) {
  return useQuery({
    queryKey: ['recordDayDetail', date],
    queryFn: () => getRecordDayDetail(date as string),
    enabled: date !== null,
  });
}

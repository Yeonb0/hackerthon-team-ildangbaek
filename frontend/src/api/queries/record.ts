// src/api/queries/record.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { formatSlotSummary } from '@/lib/recordSummary';
import { USE_MOCK } from '@/api/useMock';
import { buildMockRecordCalendar, buildMockRecordDayDetail, buildMockRecordToday } from '@/api/mock/record';
import type { RecordCalendarResponse, RecordDayDetailResponse, RecordTodayResponse } from '@/types/record';

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
  return unwrap<RecordDayDetailResponse>(apiClient.get('/records/daily', { params: { date } }));
}

export function useRecordDayDetail(date: string | null) {
  return useQuery({
    queryKey: ['recordDayDetail', date],
    queryFn: () => getRecordDayDetail(date as string),
    enabled: date !== null,
  });
}

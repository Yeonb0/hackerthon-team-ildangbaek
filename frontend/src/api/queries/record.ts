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
 * 월간 기록 화면 날짜 탭 바텀시트(F-RECORD-02).
 *
 * 2026-08-19(세션 20) — **실 API 연결.** 세션 18 시점엔 대응 엔드포인트가 없어서
 * 실서버 모드에서도 목업을 돌려주고 있었습니다(= 캘린더에서 아무 날짜나 눌러도 항상
 * 같은 가짜 데이터가 떴습니다). 그 사이 백엔드에 `GET /records/daily`가 생겼고,
 * 응답이 `RecordDailyResponse{date, skinScore, morningProducts, nightProducts}`로
 * 프론트 타입과 필드가 그대로 맞습니다(`RecordHubService.getDaily`, 85행).
 *
 * ⚠️ 응답에 `recordId`가 없어서 제품 기록 수정 진입은 아직 못 붙입니다 —
 * 서버가 `productRecord.get().getId()`를 이미 들고 있으면서 DTO에만 안 싣습니다.
 * 백엔드 요청 문서 참고.
 *
 * `skinScore`는 백엔드가 `Integer`(nullable)로 주므로 기록 없는 날은 null입니다 —
 * 시트가 그대로 "이 날은 피부 기록이 없어요"로 그립니다.
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

// src/api/queries/record.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
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
  return unwrap<RecordTodayResponse>(apiClient.get('/records/today'));
}

export function useRecordToday() {
  return useQuery({
    queryKey: ['recordToday'],
    queryFn: getRecordToday,
  });
}

// 월간 기록 날짜 탭 바텀시트 — 백엔드 API 없음(types/record.ts 주석 참고), 목업 전용.
export async function getRecordDayDetail(date: string): Promise<RecordDayDetailResponse> {
  return buildMockRecordDayDetail(date);
}

export function useRecordDayDetail(date: string | null) {
  return useQuery({
    queryKey: ['recordDayDetail', date],
    queryFn: () => getRecordDayDetail(date as string),
    enabled: date !== null,
  });
}

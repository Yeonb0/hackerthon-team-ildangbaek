// src/api/queries/record.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockRecordCalendar, buildMockRecordToday } from '@/api/mock/record';
import type { RecordCalendarResponse, RecordTodayResponse } from '@/types/record';

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

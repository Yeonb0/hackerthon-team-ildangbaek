// src/api/mock/record.ts
import { formatDateString, getTodayDateString } from '@/lib/date';
import { getFixedHomeType } from '@/lib/dayNight';
import type { RecordCalendarResponse, RecordTodayResponse } from '@/types/record';
import type { RecordDotStatus } from '@/types/home';

// 데모용 패턴을 날짜별로 순환시켜서 채움/외곽선/흐림이 섞여 보이게 합니다.
// 오늘 이후 날짜는 전부 NONE으로 덮어씁니다(RECORD-01 BR3: 미래 날짜도 NONE으로 포함).
const DEMO_PATTERN: [RecordDotStatus, RecordDotStatus][] = [
  ['FULL', 'FULL'],
  ['FULL', 'PARTIAL'],
  ['PARTIAL', 'NONE'],
  ['NONE', 'NONE'],
  ['FULL', 'NONE'],
];

function buildMockCalendarDays(year: number, month: number): RecordCalendarResponse['days'] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = getTodayDateString();
  const days: RecordCalendarResponse['days'] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = formatDateString(year, month, day);
    const isFuture = date > today;
    const [morning, night] = isFuture
      ? (['NONE', 'NONE'] as const)
      : DEMO_PATTERN[day % DEMO_PATTERN.length];
    days.push({ date, morning, night, today: date === today });
  }

  return days;
}

export function buildMockRecordCalendar(yearMonth?: string): RecordCalendarResponse {
  const base = yearMonth ?? getTodayDateString().slice(0, 7);
  const [yearStr, monthStr] = base.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed

  return {
    yearMonth: base,
    days: buildMockCalendarDays(year, month),
    // 데모용 고정값 — 실제로는 days에서 집계되어야 하지만(RECORD-01 BR4), mock에서는
    // 명세서 예시 숫자를 그대로 씁니다. days 패턴과 정확히 일치하진 않습니다.
    monthlySummary: { productRecordCount: 15, skinRecordCount: 12 },
  };
}

export function buildMockRecordToday(): RecordTodayResponse {
  return {
    date: getTodayDateString(),
    // 낮/밤 판정(getFixedHomeType)을 그대로 재사용 — DAY→MORNING, NIGHT→NIGHT
    // (F-HOME-05의 CTA 매핑과 동일한 대응 관계입니다)
    defaultTab: getFixedHomeType() === 'DAY' ? 'MORNING' : 'NIGHT',
    morning: {
      product: { completed: true, recordId: 41, summary: '라운드랩 토너 외 2개' },
      skin: { completed: true, skinRecordId: 31, summary: '분석 점수 78점' },
    },
    night: {
      product: { completed: false, recordId: null, summary: null },
      skin: { completed: false, skinRecordId: null, summary: null },
    },
  };
}

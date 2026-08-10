// src/api/mock/record.ts
import { formatDateString, getTodayDateString } from '@/lib/date';
import { getFixedHomeType } from '@/lib/dayNight';
import type { RecordCalendarResponse, RecordTodayResponse } from '@/types/record';
import type { RecordDotStatus } from '@/types/home';
import type { TimeSlot } from '@/app/routes';

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

// ---------------------------------------------------------------------------
// 목업 세션 (오늘 새로 완료한 피부 기록 기억 — S-17에서 mock 분석이 끝나면
// recordMockSkinCompletion()으로 여기 기록해두고, 기록 허브가 다시 조회할 때
// 반영합니다. 실제 백엔드는 DB에 바로 저장되니 이런 게 필요 없지만, mock은 상태가
// 없어서 매번 아래 고정값만 내려주면 "촬영 → 분석 후에도 기록 허브가 계속 미완료로
// 보이는" 문제가 생깁니다. 앱 재시작하면 초기화되는 세션 한정 메모리입니다.)
// ---------------------------------------------------------------------------
const mockSkinCompletions: Partial<Record<TimeSlot, { summary: string }>> = {};

export function recordMockSkinCompletion(timeSlot: TimeSlot, summary: string): void {
  mockSkinCompletions[timeSlot] = { summary };
}

/** DevResetButton(개발용 초기화 버튼)에서 호출합니다 — onboarding.ts의 resetMockSession과 같은 역할. */
export function resetMockRecordSession(): void {
  delete mockSkinCompletions.MORNING;
  delete mockSkinCompletions.NIGHT;
}

export function buildMockRecordToday(): RecordTodayResponse {
  const base: RecordTodayResponse = {
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

  const morningCompletion = mockSkinCompletions.MORNING;
  if (morningCompletion) {
    base.morning.skin = { completed: true, skinRecordId: 9999, summary: morningCompletion.summary };
  }
  const nightCompletion = mockSkinCompletions.NIGHT;
  if (nightCompletion) {
    base.night.skin = { completed: true, skinRecordId: 9999, summary: nightCompletion.summary };
  }

  return base;
}
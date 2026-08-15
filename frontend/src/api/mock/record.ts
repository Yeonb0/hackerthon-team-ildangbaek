// src/api/mock/record.ts
import { formatDateString, getTodayDateString } from '@/lib/date';
import { getFixedHomeType } from '@/lib/dayNight';
import type {
  RecordCalendarResponse,
  RecordDayDetailResponse,
  RecordTodayResponse,
} from '@/types/record';
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

  const days = buildMockCalendarDays(year, month);

  // 관리자님 요청(2026-08-10): 오늘 칸의 빈(NONE) → 테두리(PARTIAL) → 채워짐(FULL) 진행이
  // 실제 기록 여부와 무관하게 DEMO_PATTERN 고정값으로만 보였습니다. 오늘 칸만 실제 완료
  // 상태(buildMockRecordToday — mockProductCompletions/mockSkinCompletions 반영 결과)로
  // 덮어써서, 제품·피부 기록을 실제로 완료하면 캘린더에도 즉시 반영되게 합니다.
  // (오늘이 아닌 날짜는 계속 DEMO_PATTERN을 씁니다 — 과거 기록까지 목업으로 재현할 근거가 없음)
  const todayIndex = days.findIndex((d) => d.today);
  if (todayIndex !== -1) {
    const today = buildMockRecordToday();
    days[todayIndex] = {
      ...days[todayIndex],
      morning: computeDotStatus(today.morning.product.completed, today.morning.skin.completed),
      night: computeDotStatus(today.night.product.completed, today.night.skin.completed),
    };
  }

  return {
    yearMonth: base,
    days,
    // 데모용 고정값 — 실제로는 days에서 집계되어야 하지만(RECORD-01 BR4), mock에서는
    // 명세서 예시 숫자를 그대로 씁니다. days 패턴과 정확히 일치하진 않습니다.
    monthlySummary: { productRecordCount: 15, skinRecordCount: 12 },
  };
}

/** 제품·피부 기록 완료 여부 2개를 캘린더 점 상태로 변환 — RecordDot의 빈/테두리/채워짐과 1:1 대응. */
function computeDotStatus(productDone: boolean, skinDone: boolean): RecordDotStatus {
  if (productDone && skinDone) return 'FULL';
  if (productDone || skinDone) return 'PARTIAL';
  return 'NONE';
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

// Phase 7-A 추가 — 위 mockSkinCompletions와 정확히 같은 이유·같은 패턴입니다. 제품 기록
// (S-11 검색/스캔/루틴 바로 기록으로 완료)도 기록 허브가 "미완료"로 계속 보이던 문제가
// 있었습니다(관리자님 실기기 확인, 2026-08-10) — api/queries/product.ts의 목업 저장 성공
// 시점에 여기 기록해두고, buildMockRecordToday()가 이 값을 우선 반영합니다.
const mockProductCompletions: Partial<Record<TimeSlot, { summary: string }>> = {};

export function recordMockProductCompletion(timeSlot: TimeSlot, summary: string): void {
  mockProductCompletions[timeSlot] = { summary };
}

/** DevResetButton "제품 기록 초기화"에서 호출합니다. resetMockRecordSession과 분리한 이유는
 * 같은 파일 상단 주석 참고 — 피부/제품 초기화를 각자 따로 할 수 있어야 합니다. */
export function resetMockProductCompletion(): void {
  delete mockProductCompletions.MORNING;
  delete mockProductCompletions.NIGHT;
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

  const morningSkinCompletion = mockSkinCompletions.MORNING;
  if (morningSkinCompletion) {
    base.morning.skin = { completed: true, skinRecordId: 9999, summary: morningSkinCompletion.summary };
  }
  const nightSkinCompletion = mockSkinCompletions.NIGHT;
  if (nightSkinCompletion) {
    base.night.skin = { completed: true, skinRecordId: 9999, summary: nightSkinCompletion.summary };
  }

  const morningProductCompletion = mockProductCompletions.MORNING;
  if (morningProductCompletion) {
    base.morning.product = {
      completed: true,
      recordId: 9999,
      summary: morningProductCompletion.summary,
    };
  }
  const nightProductCompletion = mockProductCompletions.NIGHT;
  if (nightProductCompletion) {
    base.night.product = { completed: true, recordId: 9999, summary: nightProductCompletion.summary };
  }

  return base;
}
// ---------------------------------------------------------------------------
// 월간 기록 날짜 탭 바텀시트용 — 백엔드 API 없음(위 types/record.ts 주석 참고).
// 캘린더 점 상태(FULL/PARTIAL/NONE)에서 있음직한 데모 데이터를 만들어서 보여줍니다.
// ---------------------------------------------------------------------------
const MOCK_PRODUCT_NAMES: Record<TimeSlot, string[]> = {
  MORNING: ['자작나무 토너', '비타민 세럼', '선크림'],
  NIGHT: ['클렌징 오일', '레티놀 크림'],
};

export function buildMockRecordDayDetail(date: string): RecordDayDetailResponse {
  // 오늘이면 buildMockRecordToday()와 같은 세션 상태를 재사용해서 방금 기록한 게
  // 바로 반영되게 하고, 과거 날짜는 buildMockRecordCalendar()와 같은 DEMO_PATTERN
  // 규칙(요일 순환)으로 있음직한 상태를 재현합니다.
  const today = getTodayDateString();
  let morningStatus: RecordDotStatus;
  let nightStatus: RecordDotStatus;

  if (date === today) {
    const todayData = buildMockRecordToday();
    morningStatus = computeDotStatus(todayData.morning.product.completed, todayData.morning.skin.completed);
    nightStatus = computeDotStatus(todayData.night.product.completed, todayData.night.skin.completed);
  } else {
    const day = Number(date.slice(-2));
    const isFuture = date > today;
    [morningStatus, nightStatus] = isFuture ? ['NONE', 'NONE'] : DEMO_PATTERN[day % DEMO_PATTERN.length];
  }

  const buildSlot = (status: RecordDotStatus, slot: TimeSlot): RecordDayDetailResponse['morningProducts'] => {
    const completed = status !== 'NONE';
    const names = MOCK_PRODUCT_NAMES[slot];
    // PARTIAL이면 일부만, FULL이면 전부, NONE이면 빈 배열.
    const count = status === 'FULL' ? names.length : status === 'PARTIAL' ? Math.max(1, names.length - 1) : 0;
    return { completed, items: names.slice(0, count).map((name) => ({ name })) };
  };

  const hasSkinRecord = morningStatus !== 'NONE' || nightStatus !== 'NONE';

  return {
    date,
    skinScore: hasSkinRecord ? 68 + (Number(date.slice(-2)) % 20) : null,
    morningProducts: buildSlot(morningStatus, 'MORNING'),
    nightProducts: buildSlot(nightStatus, 'NIGHT'),
  };
}

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
      // 2026-08-19 — 목업이 이미 한국어를 주는 바람에, 실서버가 영어("Analysis score 78")를
      // 내려보내는 걸 화면에서 한 번도 못 봤습니다(세션 17 스캔 버그와 같은 함정).
      // **백엔드 RecordHubService:137-139와 똑같은 형식**으로 맞춥니다 — 한국어 변환은
      // lib/recordSummary.ts가 담당합니다.
      skin: { completed: true, skinRecordId: 31, summary: 'Analysis score 78' },
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
// 2026-08-20(세션 21) — 이름만 있던 자리표시자를 **실제 카탈로그 productId**로 바꿨습니다.
// 시트의 "수정"이 `PATCH /product-records/{recordId}`(productIds 전체 교체)로 이어지는데,
// 목업 항목에 실재하지 않는 ID가 실려 있으면 수정 화면에서 그 제품을 못 그립니다.
// ID·이름은 api/mock/product.ts의 CATALOG와 반드시 같아야 합니다.
//
// MORNING의 21(닥터지 선베이스)은 **일부러 savedProducts 초기값(11·15)에서 빼둔 ID**입니다 —
// "과거 기록에는 있는데 지금은 저장 목록에 없는 제품"(찜 해제 후)을 재현하려는 것입니다.
// 실서버에서도 `stopUsing()` 후 똑같이 벌어지는 상황이고, 수정 화면이 이 제품을 목록에
// 못 그리면 저장 시 조용히 지워집니다. 목업이 이 케이스를 재현해야 검증할 수 있습니다.
const MOCK_RECORD_PRODUCTS: Record<TimeSlot, { productId: number; name: string }[]> = {
  MORNING: [
    { productId: 11, name: '라운드랩 자작나무 수분 토너' },
    { productId: 15, name: '이니스프리 어성초 세럼' },
    { productId: 21, name: '닥터지 선베이스' },
  ],
  NIGHT: [
    { productId: 92, name: '코스알엑스 달팽이 에센스' },
    { productId: 71, name: '라로슈포제 시카플라스트' },
  ],
};

/**
 * 슬롯별 제품 기록 ID. 실서버는 DB 시퀀스지만 목업은 날짜+슬롯으로 안정적인 값을
 * 만들어 냅니다 — 같은 날짜를 다시 열어도 같은 ID여야 수정 화면이 어긋나지 않습니다.
 */
function mockProductRecordId(date: string, slot: TimeSlot): number {
  const digits = Number(date.replace(/-/g, '').slice(-6));
  return digits * 10 + (slot === 'MORNING' ? 1 : 2);
}

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
    const products = MOCK_RECORD_PRODUCTS[slot];
    // PARTIAL이면 일부만, FULL이면 전부, NONE이면 빈 배열.
    const count =
      status === 'FULL' ? products.length : status === 'PARTIAL' ? Math.max(1, products.length - 1) : 0;
    return {
      completed,
      // 기록이 없는 슬롯엔 고칠 대상도 없으므로 recordId도 null입니다(실서버와 동일 —
      // `RecordHubService.dailySlot()`이 기록 없으면 `new RecordDailySlotResponse(false, null, ...)`).
      recordId: completed ? mockProductRecordId(date, slot) : null,
      items: products.slice(0, count).map(({ productId, name }) => ({ productId, name })),
    };
  };

  // 2026-08-20(세션 22) — 판정을 FULL 기준으로 바꿨습니다. 아래 buildSlotState가
  // "FULL = 제품·피부 둘 다"로 슬롯을 만드는데, 여기만 "NONE만 아니면 피부 기록 있음"
  // 이면 PARTIAL인 날에 **시트는 점수를 보여주고 허브 카드는 '기록 없음'** 이 됩니다.
  // 목업끼리 어긋나면 실서버 버그를 찾는 시간만 낭비합니다.
  const hasSkinRecord = morningStatus === 'FULL' || nightStatus === 'FULL';

  /**
   * 2026-08-20(세션 22) — 주간 스트립에서 과거 날짜를 눌렀을 때 쓰는 슬롯 상태.
   *
   * 실서버는 아직 이 필드가 없어 `api/queries/record.ts`가 두 응답을 조합해 채웁니다.
   * 목업은 조합할 대상이 없으니 여기서 직접 만듭니다 — **점 상태(DEMO_PATTERN)와 반드시
   * 일치해야 합니다.** 스트립의 점과 카드의 체크가 어긋나면 그게 곧 버그로 보입니다.
   *
   *   FULL    = 제품 · 피부 둘 다 완료   (computeDotStatus의 정의 그대로)
   *   PARTIAL = 제품만 완료
   *   NONE    = 둘 다 미완료
   */
  const buildSlotState = (
    status: RecordDotStatus,
    slot: TimeSlot,
  ): RecordDayDetailResponse['morning'] => {
    const productDone = status !== 'NONE';
    const skinDone = status === 'FULL';
    const items = buildSlot(status, slot).items;
    // 슬롯별 점수 편차(+4)는 api/mock/skin.ts·위 skinScore와 같은 규칙이어야 합니다.
    const score = 68 + (Number(date.slice(-2)) % 20) + (slot === 'NIGHT' ? 4 : 0);

    return {
      product: {
        completed: productDone,
        recordId: productDone ? mockProductRecordId(date, slot) : null,
        summary: productDone
          ? items.length > 1
            ? `${items[0].name} 외 ${items.length - 1}개`
            : (items[0]?.name ?? '제품 기록 완료')
          : null,
      },
      skin: {
        // buildMockSkinRecordResultForDate가 skinRecordId를 일(day)로 두므로 맞춥니다 —
        // 상세 화면과 같은 기록을 가리켜야 합니다.
        completed: skinDone,
        skinRecordId: skinDone ? Number(date.slice(-2)) : null,
        summary: skinDone ? `분석 점수 ${score}점` : null,
      },
    };
  };

  const todayData = date === today ? buildMockRecordToday() : null;

  return {
    date,
    // 백엔드 `RecordHubService.skinScore()`는 그 날 기록 중 **마지막**(= 나이트)을
    // 고릅니다(106행 `.reduce((ignored, latest) -> latest)`). 목업도 같은 규칙을
    // 따라야 상세 화면과 숫자가 맞는지 여기서 검증할 수 있습니다.
    // 슬롯별 편차(+4)는 api/mock/skin.ts와 같은 값이어야 합니다.
    skinScore: hasSkinRecord
      ? 68 + (Number(date.slice(-2)) % 20) + (nightStatus === 'FULL' ? 4 : 0)
      : null,
    morningProducts: buildSlot(morningStatus, 'MORNING'),
    nightProducts: buildSlot(nightStatus, 'NIGHT'),
    // 오늘이면 세션 상태(방금 기록한 것)를 그대로 씁니다 — 기록 직후 스트립에서 오늘을
    // 다시 눌렀을 때 미완료로 되돌아가 보이면 안 됩니다.
    morning: todayData ? todayData.morning : buildSlotState(morningStatus, 'MORNING'),
    night: todayData ? todayData.night : buildSlotState(nightStatus, 'NIGHT'),
  };
}

// src/lib/date.ts
// 명세서 §1.9 데이터 규칙: 날짜는 'YYYY-MM-DD' 문자열로 주고받습니다.
// 네이티브 날짜 피커 라이브러리는 설치하지 않았습니다 (Expo Go 호환성 리스크 회피 —
// 차트를 react-native-svg로 직접 구현하기로 한 것과 같은 이유). 대신 텍스트 입력 +
// 형식 검증으로 처리하고, 필요해지면 @react-native-community/datetimepicker로 교체하면 됩니다.
//
// ⚠️ 전부 "로컬 시간" 기준으로 계산합니다. toISOString()은 UTC로 변환하기 때문에
// UTC+9(한국)에서는 자정~오전 9시 사이 날짜가 하루 밀리거나, 입력한 날짜가 하루 어긋나게
// 검증되는 버그가 생깁니다 (실제로 겪었던 문제).

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 'YYYY-MM-DD' 형식이면서 실존하는 날짜인지만 확인합니다 (오늘 이후 여부는 별도 확인) */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  // UTC 변환 없이 로컬 시간으로 만든 뒤, 넣은 값 그대로 들어갔는지 구성요소만 비교합니다.
  // (예: 2025-02-30처럼 실존하지 않는 날짜는 Date가 3월로 넘겨버리므로 여기서 걸러집니다)
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isFutureDateString(value: string): boolean {
  return value > getTodayDateString();
}

/** year/month(0-indexed)/day를 'YYYY-MM-DD'로 조합 — Calendar 컴포넌트의 그리드 셀 계산용 */
export function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** year/month(0-indexed)를 'YYYY-MM'으로 조합 — RECORD-01 API의 yearMonth 쿼리 파라미터용 */
export function formatYearMonthString(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * 오늘이 속한 주의 7일치 날짜를 고정으로 반환합니다 (기본 월~일).
 * F-HOME-06(밤 홈 주간 현황) 개선안 — 관리자님 결정(2026-08-14)으로 "이번 주(월~오늘만,
 * 요일 수 가변)"도 "최근 7일 롤링"도 아닌 "월~일 고정 7칸"으로 다시 바꿨습니다. 요일과
 * 무관하게 항상 7개가 나오고, 오늘 이후 날짜는 호출하는 쪽에서 "아직 안 지난 날"로
 * 구분해 처리합니다(RecordCalendar.tsx의 isFutureDateString 사용 패턴과 동일).
 */
export function getCurrentWeekDates(weekStart: WeekStart = 'MONDAY'): string[] {
  const today = new Date();
  const rawDayOfWeek = today.getDay(); // 0(일)~6(토)
  const offsetFromStart =
    weekStart === 'MONDAY' ? (rawDayOfWeek === 0 ? 6 : rawDayOfWeek - 1) : rawDayOfWeek;

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetFromStart);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    dates.push(formatDateString(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return dates;
}

export interface MonthGridCell {
  date: string; // 'YYYY-MM-DD'
  day: number;
  inCurrentMonth: boolean;
}

const TOTAL_GRID_CELLS = 42; // 6주 고정 — 달마다 그리드 높이가 바뀌지 않게 (Calendar.tsx와 동일 원칙)

export type WeekStart = 'SUNDAY' | 'MONDAY';

/**
 * 지정한 달의 42칸 그리드(이전/다음 달 여백 포함)를 계산합니다.
 * components/base/Calendar.tsx(S-04 날짜 선택)에서 쓰던 것과 같은 계산이라, 기록 허브
 * 캘린더(F-RECORD-01)에서 재사용하려고 순수 함수로 분리했습니다. Calendar.tsx 자체는
 * 이미 검증된 코드라 건드리지 않았고, 그 결과 지금은 그리드 계산이 두 군데 있습니다 —
 * 여유 있을 때 Calendar.tsx도 이 함수를 쓰도록 정리하면 좋습니다.
 *
 * weekStart 기본값을 'MONDAY'로 바꿨습니다(관리자님 요청, 2026-08-10 — 기록 허브
 * 캘린더만 대상, Calendar.tsx는 별도 구현이라 영향 없음). 나중에 설정 화면에서
 * 사용자가 고를 수 있게 할 계획이라 하드코딩하지 않고 파라미터로 열어뒀습니다.
 */
export function getMonthGridCells(
  year: number,
  month: number,
  weekStart: WeekStart = 'MONDAY'
): MonthGridCell[] {
  const rawStartWeekday = new Date(year, month, 1).getDay(); // 0(일)~6(토)
  // 월요일 시작 그리드에서는 "1일이 몇 번째 칸인지"가 다르게 계산됩니다.
  // 일요일(0)이면 월요일 시작 기준 6번째 칸, 월요일(1)이면 0번째 칸이 됩니다.
  const startWeekday = weekStart === 'MONDAY' ? (rawStartWeekday + 6) % 7 : rawStartWeekday;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const leadingCount = startWeekday;
  const trailingCount = TOTAL_GRID_CELLS - leadingCount - daysInMonth;

  const prevTarget = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextTarget = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  const cells: MonthGridCell[] = [];

  for (let i = 0; i < leadingCount; i++) {
    const day = daysInPrevMonth - leadingCount + 1 + i;
    cells.push({
      date: formatDateString(prevTarget.year, prevTarget.month, day),
      day,
      inCurrentMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: formatDateString(year, month, day), day, inCurrentMonth: true });
  }
  for (let day = 1; day <= trailingCount; day++) {
    cells.push({
      date: formatDateString(nextTarget.year, nextTarget.month, day),
      day,
      inCurrentMonth: false,
    });
  }

  return cells;
}

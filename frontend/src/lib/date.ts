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
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isFutureDateString(value: string): boolean {
  return value > getTodayDateString();
}

/** year/month(0-indexed)/day를 'YYYY-MM-DD'로 조합 — Calendar 컴포넌트의 그리드 셀 계산용 */
export function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// src/lib/comparedTo.ts
//
// 2026-08-19(세션 18, 관리자님 지적) — 피부 결과 화면에 "2026-08-18 MORNING 대비 -8"이
// 그대로 노출되던 문제.
//
// ─────────────────────────────────────────────────────────────────────────────
// 무엇이 문제였나
//
// 백엔드 `SkinRecordService.buildComparison()`이 비교 대상을 이렇게 만듭니다:
//
//     "%s %s".formatted(previousDate, timeSlot)   →  "2026-08-18 MORNING"
//
// 사람에게 보여줄 문구가 아니라 **기계용 식별자**입니다. DTO 주석에도
// *"비교 대상 기록의 yyyy-MM-dd SLOT 표기"* 라고만 적혀 있습니다. 그런데 화면이 이걸
// 그대로 찍어서 날것의 ISO 날짜와 영어 enum이 노출됐습니다.
//
// 백엔드에 한국어 문구를 요청할 수도 있지만, **표시 문구는 프론트가 갖는 게 맞습니다** —
// 아래 "어제 / 그제 / 8월 10일" 분기는 *보는 시점*에 따라 달라지는데 서버는 응답을
// 만드는 시점만 압니다. 캘린더에서 지난 기록을 열면 서버 기준 "어제"가 사용자 기준
// "어제"가 아닙니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 규칙
//
//   오늘 기준 -1일  →  "어제 아침" / "어제 밤"
//   오늘        →  "오늘 아침" / "오늘 밤"
//   오늘 기준 -2일  →  "그제 아침"
//   그 외        →  "8월 10일 아침"
//
// 시간대 라벨은 「모닝/나이트」가 아니라 「아침/밤」입니다(관리자님 지시) —
// "어제 모닝 대비"보다 "어제 아침 대비"가 문장으로 읽힙니다. 루틴 이름(「모닝 루틴」)과는
// 다른 맥락이라 라벨이 갈리는 게 맞습니다.
//
// ⚠️ 형식이 안 맞으면 **원본 문자열을 그대로 돌려줍니다.** 백엔드가 나중에 이미 한국어인
// 문구를 내려주기 시작해도 화면이 깨지지 않고, 파싱 실패가 빈 화면으로 이어지지도
// 않습니다.

/** 로컬 시간 기준 'YYYY-MM-DD'. `toISOString()`은 UTC로 밀려서 KST 밤에 날짜가 하루 어긋납니다. */
function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const SLOT_LABEL: Record<string, string> = {
  MORNING: '아침',
  NIGHT: '밤',
};

/**
 * 백엔드 `comparedTo`("2026-08-18 MORNING")를 화면 문구("어제 아침")로 바꿉니다.
 *
 * @param comparedTo 서버 값. null이면 null을 돌려줍니다(호출부가 기준점 문구로 대체).
 * @param now        기준 시각. 테스트에서 고정값을 넣을 수 있게 열어뒀습니다.
 */
export function formatComparedTo(comparedTo: string | null, now: Date = new Date()): string | null {
  if (!comparedTo) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\w+)$/.exec(comparedTo.trim());
  if (!match) return comparedTo;

  const [, year, month, day, slot] = match;
  const slotLabel = SLOT_LABEL[slot.toUpperCase()];
  // 아는 시간대가 아니면(백엔드에 슬롯이 추가되는 등) 날짜만이라도 한국어로 바꿔줍니다.
  const suffix = slotLabel ? ` ${slotLabel}` : '';

  const targetKey = `${year}-${month}-${day}`;
  const dayKeyOffsetBy = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return toLocalDateKey(d);
  };

  if (targetKey === dayKeyOffsetBy(0)) return `오늘${suffix}`;
  if (targetKey === dayKeyOffsetBy(-1)) return `어제${suffix}`;
  if (targetKey === dayKeyOffsetBy(-2)) return `그제${suffix}`;

  return `${Number(month)}월 ${Number(day)}일${suffix}`;
}

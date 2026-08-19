// src/lib/comparedTo.ts
//
// 2026-08-19(세션 18) — 피부 결과 화면에 "2026-08-18 MORNING 대비 -8"이 그대로
// 노출되던 문제. 2026-08-19(세션 19, 관리자님 재보고 "아직 안 고쳐짐") — 파서를
// 넓히고 진단용 경고를 넣었습니다. 아래 "왜 아직 남아 있을 수 있나" 참고.
//
// ─────────────────────────────────────────────────────────────────────────────
// 무엇이 문제였나
//
// 백엔드 `SkinRecordService.buildComparison()`(origin/main 177~180행)이 비교 대상을
// 이렇게 만듭니다:
//
//     "%s %s".formatted(previousDate, timeSlot)   →  "2026-08-18 MORNING"
//
// 사람에게 보여줄 문구가 아니라 **기계용 식별자**입니다. 화면이 이걸 그대로 찍어서
// 날것의 ISO 날짜와 영어 enum이 노출됐습니다.
//
// 표시 문구를 프론트가 갖는 이유: "어제 / 그제 / 8월 10일" 분기는 *보는 시점*에 따라
// 달라지는데 서버는 응답을 만드는 시점만 압니다. 캘린더에서 지난 기록을 열면 서버
// 기준 "어제"가 사용자 기준 "어제"가 아닙니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 세션 18 수정 후에도 아직 원문이 보일 수 있나 (세션 19)
//
// 이 파일을 부르는 곳은 `SkinResultScreen`의 총점 아래 한 줄뿐이고, 그 코드는 이미
// 변환을 거치고 있습니다(저장소 `boyeon` 기준 확인). 그래도 화면에 원문이 남는다면
// 남은 가능성은 셋입니다:
//
//   ① 로컬 작업본에 세션 18 파일이 안 들어갔다 (과거에 반복된 사고)
//   ② 기기에 남은 예전 JS 번들 (Metro 캐시 / 예전 빌드)
//   ③ 서버 문자열 형식이 문서와 다르다 (예: ISO 날짜시간, 한 자리 월/일)
//
// ③을 아예 없애기 위해 파서를 크게 넓혔습니다. 이제 아래를 전부 받습니다:
//
//   2026-08-18 MORNING        2026-8-18 morning       2026/08/18 NIGHT
//   2026-08-18T09:30:00       2026-08-18_MORNING      2026-08-18
//
// 그리고 **형식을 못 읽으면 개발 빌드에서 콘솔 경고를 남깁니다.** 다음에도 원문이
// 보이는데 경고가 없다면 원인은 ①/②이고(코드가 아예 안 돌고 있다는 뜻),
// 경고가 있다면 그 로그의 원본 문자열이 곧 ③의 증거입니다.
//
// ⚠️ 못 읽으면 **원본을 그대로 돌려줍니다.** 백엔드가 나중에 이미 한국어인 문구를
// 내려줘도 화면이 깨지지 않습니다.

/** 로컬 시간 기준 'YYYY-MM-DD'. `toISOString()`은 UTC로 밀려 KST 밤에 하루 어긋납니다. */
function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 시간대 라벨은 「모닝/나이트」가 아니라 「아침/밤」입니다(관리자님 지시) —
 * "어제 모닝 대비"보다 "어제 아침 대비"가 문장으로 읽힙니다. 루틴 이름(「모닝루틴」)과는
 * 다른 맥락이라 라벨이 갈리는 게 맞습니다.
 *
 * 백엔드 TimeSlot enum은 MORNING/NIGHT 둘뿐이지만, 나중에 슬롯이 늘어도 조용히
 * 대응되도록 흔한 값들을 미리 넣어뒀습니다.
 */
const SLOT_LABEL: Record<string, string> = {
  MORNING: '아침',
  NIGHT: '밤',
  DAY: '낮',
  NOON: '낮',
  AFTERNOON: '오후',
  EVENING: '저녁',
  AM: '아침',
  PM: '밤',
};

/**
 * 날짜 + (선택적)시간대. 문자열 어디에 있든 찾습니다 — 앞뒤에 다른 말이 붙어 있어도
 * 날짜만 알아보면 문구를 만들 수 있습니다.
 *
 *   그룹1~3: 연-월-일 (구분자 `-` `/` `.`, 한 자리 월/일 허용)
 *   그룹4  : 시간대 토큰 (영문자만 — "09:30" 같은 시각은 여기 안 걸립니다)
 */
const COMPARED_TO_PATTERN = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s_,]+([A-Za-z]+))?/;

/**
 * 백엔드 `comparedTo`("2026-08-18 MORNING")를 화면 문구("어제 아침")로 바꿉니다.
 *
 * @param comparedTo 서버 값. null이면 null을 돌려줍니다(호출부가 기준점 문구로 대체).
 * @param now        기준 시각. 테스트에서 고정값을 넣을 수 있게 열어뒀습니다.
 */
export function formatComparedTo(comparedTo: string | null, now: Date = new Date()): string | null {
  if (!comparedTo) return null;

  const raw = comparedTo.trim();
  const match = COMPARED_TO_PATTERN.exec(raw);
  if (!match) {
    // 이미 한국어 문구면 정상(그대로 통과). 그게 아니라면 형식이 문서와 다르다는
    // 뜻이라 원본을 남겨둡니다 — 이 로그가 백엔드에 확인을 요청할 근거가 됩니다.
    if (__DEV__ && /[A-Za-z0-9]/.test(raw)) {
      console.warn('[comparedTo] 형식을 읽지 못했습니다. 원본 그대로 표시합니다:', raw);
    }
    return comparedTo;
  }

  const [, year, month, day, slot] = match;
  const slotLabel = slot ? SLOT_LABEL[slot.toUpperCase()] : undefined;
  // 아는 시간대가 아니면(백엔드에 슬롯이 추가되는 등) 날짜만이라도 한국어로 바꿔줍니다.
  const suffix = slotLabel ? ` ${slotLabel}` : '';

  const targetKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const dayKeyOffsetBy = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return toLocalDateKey(d);
  };

  if (targetKey === dayKeyOffsetBy(0)) return `오늘${suffix}`;
  if (targetKey === dayKeyOffsetBy(-1)) return `어제${suffix}`;
  if (targetKey === dayKeyOffsetBy(-2)) return `그제${suffix}`;

  return `${Number(month)}월 ${Number(day)}일${suffix}`;
}

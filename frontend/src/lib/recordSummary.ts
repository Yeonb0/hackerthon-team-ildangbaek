// src/lib/recordSummary.ts
//
// 2026-08-19(세션 18, 관리자님 9번 항목) — 기록 허브 슬롯 카드에 "Analysis score 72"가
// 영어로 그대로 노출되던 문제.
//
// ─────────────────────────────────────────────────────────────────────────────
// 원인
//
// 백엔드 `RecordHubService`가 요약 문자열을 **영어 하드코딩**으로 만듭니다(132~139행):
//
//     String summary = names.isEmpty()
//         ? "Product record completed"
//         : String.join(", ", names);                       // 제품 슬롯
//
//     String summary = record.getOverallScore() == null
//         ? ...
//         : "Analysis score " + record.getOverallScore()... // 피부 슬롯
//
// 제품 슬롯도 같은 문제가 잠재해 있습니다 — 등록된 제품 이름을 못 찾으면 영어 문구가
// 그대로 뜹니다. 지금은 제품명이 있어서 안 보일 뿐입니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 처리 방침 (관리자님 확정)
//
// 백엔드 수정이 정석이지만 데모가 촉박해서 **프론트에서 재조립 + 백엔드 요청 문서 병행**
// 으로 갑니다. 백엔드가 한국어로 고쳐서 내려주기 시작해도 아래 패턴에 안 걸리므로
// **원본이 그대로 통과**합니다 — 나중에 이 파일을 지워도 화면이 깨지지 않습니다.
//
// ⚠️ 서버 문자열을 패턴 매칭하는 건 본질적으로 취약합니다. 백엔드가 문구를 살짝 바꾸면
// (예: "Analysis Score") 조용히 원문이 노출됩니다. 임시 조치임을 잊지 마세요.

/** "Analysis score 72" / "Analysis score 72.5" → 72 */
const ANALYSIS_SCORE = /^Analysis\s+score\s+([\d.]+)$/i;
const PRODUCT_COMPLETED = /^Product\s+record\s+completed$/i;

/**
 * 기록 허브 슬롯 요약(`RecordTodayResponse`의 `product.summary` / `skin.summary`)을
 * 화면 문구로 바꿉니다. 아는 패턴이 아니면 **원본을 그대로** 돌려줍니다.
 */
export function formatSlotSummary(summary: string | null): string | null {
  if (!summary) return summary;

  const trimmed = summary.trim();

  const scoreMatch = ANALYSIS_SCORE.exec(trimmed);
  if (scoreMatch) {
    // 백엔드가 BigDecimal을 stripTrailingZeros로 찍기 때문에 "72" / "72.5" 둘 다 옵니다.
    // 소수점은 화면에서 의미가 없어 반올림합니다(다른 화면의 총점 표기와 동일).
    const score = Math.round(Number(scoreMatch[1]));
    return Number.isFinite(score) ? `분석 점수 ${score}점` : trimmed;
  }

  if (PRODUCT_COMPLETED.test(trimmed)) {
    return '제품 기록 완료';
  }

  // 제품명 목록("토너, 세럼")이나 이미 한국어인 문구는 손대지 않습니다.
  return trimmed;
}

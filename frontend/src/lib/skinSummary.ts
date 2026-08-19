// src/lib/skinSummary.ts
//
// 2026-08-19(세션 18, 관리자님 리포트) — "오늘의 피부 요약" 문구가 화면에 안 뜨는 문제.
//
// ─────────────────────────────────────────────────────────────────────────────
// 원인 (프론트 버그 아님)
//
// 백엔드 `skinComment`는 **OpenAI Vision이 성공했을 때만** 채워집니다. AI 서버
// `pipeline.analyze()`는 CIELAB 규칙 기반 1차 점수를 낸 뒤 `vision.refine()`으로
// OpenAI에 확정을 요청하는데, 키가 없거나 호출이 실패·타임아웃하면
// `VisionUnavailableError`를 잡아 **1차 점수를 그대로 반환**합니다:
//
//     except vision.VisionUnavailableError as e:
//         log.warning("OpenAI 확정 실패, 1차 규칙 기반 점수로 폴백: ...")
//         return preliminary          # skin_comment = None
//
// `schema.py` 주석도 명시합니다 — *"규칙 기반 1차 점수에는 근거가 없어 값을 지어낼 수
// 없으므로, OpenAI 확정이 실패해 1차 점수로 폴백한 경우 None이다."*
//
// 즉 **AI 서버의 OpenAI 단계가 지금 동작하지 않고 있습니다.** 근본 해결은 AI 서버 쪽
// `OPENAI_API_KEY` 설정·호출 실패 원인 확인입니다(백엔드 요청 문서로 별도 정리).
//
// ─────────────────────────────────────────────────────────────────────────────
// 이 파일이 하는 일
//
// 데모에서 카드가 통째로 사라지지 않도록 **점수에서 유도한 요약 문장**을 만듭니다.
//
// ⚠️ 없는 사실을 지어내지 않습니다. 사진을 해석하지도, 원인을 추정하지도 않고, 이미
// 화면에 숫자로 보이고 있는 **네 지표 중 가장 높은 것과 가장 낮은 것을 문장으로 옮길
// 뿐**입니다. AI 코멘트가 오면 그쪽이 항상 우선입니다 — 이 문장은 폴백입니다.
import { metricGradeOf } from '@/lib/metricGrade';
import { metricLabel } from '@/lib/metricLabels';
import type { MetricListItem } from '@/api/adapters';

/**
 * 받침 유무로 조사를 고릅니다. 지표 라벨이 「트러블 안정도」(받침 없음)와
 * 「모공 컨디션」(받침 ㄴ)으로 갈려서, 고정 조사를 쓰면 "모공 컨디션가"가 됩니다.
 *
 * 한글 음절은 유니코드에서 U+AC00부터 28음씩 한 종성 주기를 돕니다 — (코드 - 0xAC00) % 28이
 * 0이면 받침이 없습니다. 라벨이 전부 한글이라 이 판정으로 충분합니다.
 */
function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.trim().charCodeAt(word.trim().length - 1);
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return withoutBatchim;
  return (last - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
}

/** 가장 낮은 지표에 붙일 관리 방향. 지표별로 다르게 읽히도록 나눠 둡니다. */
const CARE_HINT: Record<string, string> = {
  trouble: '오늘은 진정 위주로 관리해보세요',
  redness: '자극이 적은 순한 제품으로 가볍게 마무리해보세요',
  pigmentation: '자외선 차단을 꼼꼼히 챙겨보세요',
  pores: '세정과 보습 균형을 신경 써보세요',
};

/**
 * 지표 점수에서 "오늘의 피부 요약" 폴백 문장을 만듭니다.
 * 지표가 2개 미만이면 비교할 대상이 없어 `null`을 돌려줍니다(카드 미노출).
 */
export function buildFallbackSkinSummary(metrics: MetricListItem[]): string | null {
  if (metrics.length < 2) return null;

  const sorted = [...metrics].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const bestLabel = metricLabel('item', best.key);
  const worstLabel = metricLabel('item', worst.key);

  // 네 지표가 다 비슷하면 "가장 좋다/아쉽다"가 과장이 됩니다. 격차가 작으면 한 줄로만.
  if (best.score - worst.score < 10) {
    const grade = metricGradeOf(best.score);
    if (grade === 'good') return '오늘은 네 지표가 고르게 좋은 편이에요. 지금 루틴을 유지해보세요.';
    if (grade === 'normal') return '오늘은 네 지표가 비슷한 수준이에요. 하나씩 천천히 챙겨봐요.';
    return '오늘은 전반적으로 컨디션이 낮은 편이에요. 무리한 관리보다 휴식이 먼저예요.';
  }

  const hint = CARE_HINT[worst.key] ?? '오늘은 무리한 관리보다 기본에 집중해보세요';
  return (
    `오늘은 ${bestLabel}${josa(bestLabel, '이', '가')} 가장 좋아요. ` +
    `${worstLabel}${josa(worstLabel, '은', '는')} 조금 아쉬우니 ${hint}.`
  );
}

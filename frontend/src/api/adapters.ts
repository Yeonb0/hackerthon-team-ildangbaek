// ⚠️ 팀 결정 (관리자 확인, 2026-08-07: 4개로 진행 → 2026-08-09: 키 이름을
// pigmentation/pores로 확정, 프로젝트 지식 문서 기준). GitHub 저장소에 커밋된
// api 명세서.md/기능 명세서.md는 이 글 작성 시점에 아직 3개(trouble/redness/moisture)로
// 남아있어서, 실제 서버가 이 4개 키로 응답하는지는 백엔드 실연동 전 재확인이 필요합니다.
// 답이 바뀌면 lib/metricLabels.ts의 표만 수정하면 됩니다 — S-20 레이더 차트 블로커와
// 연결된 항목.
//
// 2026-08-18 — 라벨 문자열은 lib/metricLabels.ts로 옮겼습니다. 「트러블」 대
// 「트러블 안정도」 개명(개명 A 확정)에서, 같은 지표라도 놓이는 자리마다 쓸 수 있는
// 글자 수가 달라 라벨을 한 벌로 둘 수 없게 됐기 때문입니다.
import { metricLabel } from '@/lib/metricLabels';

export type MetricListItem = {
  key: string;
  /** 넓은 자리용 — S-18 지표 카드 제목, MetricScoreList 행. 예: 「트러블 안정도」 */
  label: string;
  /** 좁은 자리용 — 레이더 차트 축, 첫 기록 2×2 그리드. 예: 「트러블」 */
  shortLabel: string;
  score: number;
  delta: number | null;
};

// 서버가 scores를 객체로 주든 배열로 주든, 화면은 항상 배열만 봅니다.
// 지표가 3개든 4개든 6개든 이 함수와 화면 코드는 그대로입니다.
export function toMetricList(
  scores: Record<string, number>,
  changes?: Record<string, number> | null
): MetricListItem[] {
  return Object.entries(scores).map(([key, score]) => ({
    key,
    label: metricLabel('item', key),
    shortLabel: metricLabel('axis', key),
    score,
    delta: changes?.[key] ?? null,
  }));
}

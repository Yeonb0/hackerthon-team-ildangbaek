// ⚠️ 팀 결정 (관리자 확인, 2026-08-07: 4개로 진행 → 2026-08-09: 키 이름을
// pigmentation/pores로 확정, 프로젝트 지식 문서 기준). GitHub 저장소에 커밋된
// api 명세서.md/기능 명세서.md는 이 글 작성 시점에 아직 3개(trouble/redness/moisture)로
// 남아있어서, 실제 서버가 이 4개 키로 응답하는지는 백엔드 실연동 전 재확인이 필요합니다.
// 답이 바뀌면 이 표만 수정하면 됩니다 — S-20 레이더 차트 블로커와 연결된 항목.
const METRIC_LABELS: Record<string, string> = {
  trouble: '트러블',
  redness: '홍조',
  pores: '모공',
  pigmentation: '색소침착',
};

export type MetricListItem = {
  key: string;
  label: string;
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
    label: METRIC_LABELS[key] ?? key, // 매핑에 없는 키가 와도 화면이 죽지 않고 키 이름 그대로 표시
    score,
    delta: changes?.[key] ?? null,
  }));
}
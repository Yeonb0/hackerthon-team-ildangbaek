// ⚠️ 팀 결정 (관리자 확인, 2026-08-07): AI 지표는 4개로 진행 — 트러블/홍조/색소침착/모공
// 단, 현재 백엔드 API 명세서(SKIN-01 응답)에는 3개(trouble/redness/moisture)만 정의되어 있습니다.
// 백엔드팀 확정 답변이 오면 이 표만 수정하면 됩니다 — S-20 레이더 차트 블로커와 연결된 항목.
const METRIC_LABELS: Record<string, string> = {
  trouble: '트러블',
  redness: '홍조',
  pigment: '색소침착',
  pore: '모공',
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
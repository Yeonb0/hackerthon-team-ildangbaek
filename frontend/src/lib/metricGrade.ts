// src/lib/metricGrade.ts
//
// 지표 점수(0~100) 등급 판정의 단일 출처입니다.
//
// ✅ 방향 확정(2026-08-18) — 지표 4종(트러블/홍조/모공/색소침착)은 모두 **높을수록 좋음**
// 입니다. 관리자 확정이며 백엔드도 같은 방향입니다:
//   - ai-server/app/metrics.py  "모든 지표는 점수가 높을수록 좋은 상태다(ADR 0002)"
//   - ai-server/app/schema.py · app/vision.py 동일
//   - 종합 점수도 4지표 단순 평균(ADR 0008)이라 같은 방향으로 정렬됩니다.
//
// ⚠️ 임계값 70/40은 **기획 확정값이 아닙니다.** 예전 30/60을 대칭으로 뒤집은 값이고,
// 그 30/60조차 Figma 118:9423 한 장에서 역산한 것이었습니다. 그런데 그 Figma가
// "낮을수록 좋음"을 전제로 그려진 화면이라 역산 근거 자체가 무효가 됐습니다.
// 기획이 값을 정하면 이 파일의 상수 두 개만 고치면 됩니다.
//
// 이 모듈을 따로 둔 이유: 같은 경계를 SkinResultScreen(등급 배지·한 줄 설명)과
// ShoppingScreen("오늘 내 피부에 필요해요" 부제)이 함께 쓰는데, 각자 상수를 들고 있으면
// 한쪽만 바뀌었을 때 같은 점수가 화면마다 다른 등급으로 보입니다.

import { reportColor } from '@/theme/tokens';

/** 이 값 이상이면 '좋음'. */
export const GRADE_GOOD_FROM = 70;

/** 이 값 미만이면 '주의'. 사이 구간이 '보통'입니다. */
export const GRADE_CAUTION_BELOW = 40;

export type MetricGrade = 'good' | 'normal' | 'caution';

export function metricGradeOf(score: number): MetricGrade {
  if (score >= GRADE_GOOD_FROM) return 'good';
  if (score >= GRADE_CAUTION_BELOW) return 'normal';
  return 'caution';
}

const GRADE_LABEL: Record<MetricGrade, string> = {
  good: '좋음',
  normal: '보통',
  caution: '주의',
};

export function metricGradeLabel(score: number): string {
  return GRADE_LABEL[metricGradeOf(score)];
}

/**
 * 등급별 accent 색. `reportColor`를 그대로 재수출하지 않고 여기서 한 번 매핑하는 이유는,
 * "좋음=safe / 보통=amber / 주의=caution" 조합이 등급 표시의 정본이기 때문입니다 —
 * SkinResultScreen의 등급 배지와 ShoppingScreen의 등급 칩이 같은 색을 써야 합니다.
 */
export const METRIC_GRADE_ACCENT: Record<MetricGrade, string> = {
  good: reportColor.safe,
  normal: reportColor.amber,
  caution: reportColor.caution,
};

export function metricGradeAccent(score: number): string {
  return METRIC_GRADE_ACCENT[metricGradeOf(score)];
}

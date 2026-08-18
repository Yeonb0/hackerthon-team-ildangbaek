// src/lib/metricLabels.ts
//
// 지표 라벨 문자열의 단일 출처.
//
// ─────────────────────────────────────────────────────────────────────────────
// 결정 이력 (2026-08-18)
//
// 백엔드가 "모든 점수는 높을수록 좋음"으로 방향을 통일하면서, 화면 라벨도 「트러블」
// 대신 「트러블 안정도」처럼 긍정 방향으로 바꾸자고 제안했습니다. 세 안을 실기기에서
// 비교한 뒤 **개명 A(넓은 자리만 개명)** 로 확정했습니다.
//
//   넓은 자리(index/item) → 「트러블 안정도」 등 긍정 라벨
//   좁은 자리(tab/axis/mini) → 짧은 이름 유지
//
// 전면 개명(탭까지)을 택하지 않은 이유: 탭 4개가 한 줄(flex:1)이라 「트러블 안정도」가
// 안 들어가고, 2×2로 접으면 카드 높이가 늘어 그래프가 아래로 밀립니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 슬롯
//
// 같은 지표라도 놓이는 자리마다 쓸 수 있는 글자 수가 다릅니다. 한 벌로 통일하면
// 어딘가는 반드시 깨지므로 자리별로 나눠 둡니다.
//
//   tab   — 리포트 홈 항목별 추이 탭 4개. 한 줄에 4개(flex:1)라 가장 좁습니다.
//   index — 그 아래 큰 숫자 위 라벨 · S-20 차트 제목/범례. 한 줄을 거의 다 씁니다.
//   mini  — 리포트 요약 미니 스코어 4개. 총점(48px)과 같은 줄에 4칸이라 가장 좁습니다.
//   item  — S-18 지표 카드 제목 · MetricScoreList 행. 2열 카드라 중간 폭.
//   axis  — 레이더 차트 축 · 첫 기록 2×2 그리드 · S-20 헤더의 "{지표} 수치와의 상관관계".
//           도형 바깥/문장 안이라 짧은 이름이 필요합니다.
//
// ⚠️ 색소 지표의 짧은 이름이 자리마다 다릅니다 — 탭은 「색소잡티」, 레이더 축은
// 「색소침착」, 미니는 「색소」. 기존 화면 그대로를 보존한 상태입니다. 통일하려면
// 아래 표에서 해당 값만 고치면 되고, 다른 코드는 건드릴 필요가 없습니다.
import type { MetricKey } from '@/types/report';

export type MetricLabelSlot = 'tab' | 'index' | 'mini' | 'item' | 'axis';

/**
 * 긍정 방향 라벨(개명 A 확정안). 백엔드 제안의 「트러블 안정도 / 홍조 안정도 /
 * 모공 컨디션」을 따르고, 색소는 「색소침착 컨디션」이 길어 「색소 컨디션」으로 줄였습니다.
 * 「지수」 접미사는 붙이지 않습니다 — 「트러블 안정도 지수」는 겹말입니다.
 */
const POSITIVE: Record<MetricKey, string> = {
  trouble: '트러블 안정도',
  redness: '홍조 안정도',
  pigmentation: '색소 컨디션',
  pores: '모공 컨디션',
};

const LABELS: Record<MetricLabelSlot, Record<MetricKey, string>> = {
  // ── 좁은 자리: 짧은 이름 유지 ──
  tab: { trouble: '트러블', redness: '홍조', pigmentation: '색소잡티', pores: '모공' },
  mini: { trouble: '트러블', redness: '홍조', pigmentation: '색소', pores: '모공' },
  axis: { trouble: '트러블', redness: '홍조', pigmentation: '색소침착', pores: '모공' },
  // ── 넓은 자리: 긍정 라벨 ──
  index: POSITIVE,
  item: POSITIVE,
};

/**
 * 지표 라벨. 훅이 아니라 순수 함수라 어디서든 그냥 부르면 됩니다.
 * 매핑에 없는 키(운영 중 지표 구성이 바뀌는 등)가 와도 화면이 죽지 않도록
 * 키를 그대로 돌려줍니다 — 기존 adapters.ts의 `?? key` 폴백과 같은 취지입니다.
 */
export function metricLabel(slot: MetricLabelSlot, key: string): string {
  return LABELS[slot][key as MetricKey] ?? key;
}

/**
 * S-18 지표 카드의 한 줄 설명. 인자는 [좋음, 보통, 주의] = 0, 1, 2입니다.
 *
 * 개명 전에는 지표별로 증상 문구가 달랐습니다(「거의 없어요」 / 「뚜렷해요」 등).
 * 라벨의 주어가 「안정도/컨디션」으로 바뀌면서 그 문구들은 뜻이 정반대로 읽히게 되어
 * (「트러블 안정도 · 거의 없어요」) 지표 공통의 상태 문구로 교체했습니다.
 */
const PHRASE: [good: string, normal: string, caution: string] = [
  '좋아요',
  '보통이에요',
  '낮은 편이에요',
];

export function metricPhrase(gradeIndex: 0 | 1 | 2): string {
  return PHRASE[gradeIndex];
}

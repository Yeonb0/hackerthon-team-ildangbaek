// src/components/domain/MetricGradeChip.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { metricGradeAccent, metricGradeLabel } from '@/lib/metricGrade';
import { radius } from '@/theme/tokens';
import { adjustFontSize, weightFamily } from '@/theme/typography';

type MetricGradeChipProps = {
  /** 지표명 — "트러블", "홍조" 등. */
  label: string;
  score: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 지표명과 점수를 하나의 색 칩으로 보여줍니다 — `[트러블 62]`(노랑) `[홍조 38]`(빨강).
 * 좋음=초록 / 보통=노랑 / 주의=빨강이고, **등급 단어는 쓰지 않고 색으로만 나타냅니다**
 * (관리자 결정, 2026-08-18).
 *
 * 경위: 쇼핑 홈 "오늘 내 피부에 필요해요" 부제가 원래 "트러블 62 · 홍조 38 기준 추천"
 * 처럼 숫자만 나열해서 그 값이 좋은지 나쁜지 알 수 없었습니다. 괄호 표기("62(보통)") →
 * 숫자 옆 별도 등급 칩을 거쳐 지금 형태로 정리됐습니다.
 *
 * ⚠️ 색이 유일한 단서라 **색각 이상·스크린리더 사용자에게는 등급이 전달되지 않습니다.**
 * 그래서 `accessibilityLabel`에만 등급 단어를 넣어 읽어주도록 했습니다(화면에는 안
 * 보입니다). 시각적 단서를 더 주려면 등급별 아이콘을 앞에 붙이는 방법이 있는데,
 * 부제 한 줄에 칩 2개가 들어가는 폭이라 지금은 넣지 않았습니다.
 *
 * ⚠️ 배경은 accent의 옅은 알파입니다. `shopTagTint`처럼 고정 hex 쌍을 쓰지 않는 이유는
 * 등급 색이 `lib/metricGrade.ts`의 임계값과 함께 움직여야 하기 때문입니다 — 임계값이
 * 기획 확정으로 바뀌면 그 파일 한 곳만 고치면 됩니다.
 */
export function MetricGradeChip({ label, score, style }: MetricGradeChipProps) {
  const accent = metricGradeAccent(score);
  return (
    <View
      style={[styles.chip, { backgroundColor: tint(accent) }, style]}
      accessibilityLabel={`${label} ${score}, ${metricGradeLabel(score)}`}
    >
      <Text style={[styles.text, { color: accent }]}>
        {label} {score}
      </Text>
    </View>
  );
}

/** 배지 배경은 accent의 옅은 알파 — 리포트 카드들과 같은 방식입니다. */
function tint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: adjustFontSize(11),
    lineHeight: 16,
    ...weightFamily('bold'),
  },
});
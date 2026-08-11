import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { getEnvironmentTip } from '@/lib/weather';
import { environmentTint, radius, space, typography } from '@/theme';
import type { HomeEnvironment } from '@/types/home';

type EnvironmentTipCardProps = {
  environment: HomeEnvironment;
  style?: StyleProp<ViewStyle>;
};

/**
 * 낮 홈(S-07) 전용 환경 팁 카드 — HOME01 목업의 "자외선 지수가 높아요" 박스.
 * getEnvironmentTip()이 null을 주면(자외선·습도 둘 다 평범) 아무것도 렌더링하지 않습니다 —
 * 호출부(DayHomeScreen)에서 조건 분기를 따로 안 해도 되게 컴포넌트 안에서 처리했습니다.
 */
export function EnvironmentTipCard({ environment, style }: EnvironmentTipCardProps) {
  const tip = getEnvironmentTip(environment);
  if (!tip) return null;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{tip.title}</Text>
      <Text style={styles.description}>{tip.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: environmentTint.tipBg,
    borderLeftWidth: 4,
    borderLeftColor: environmentTint.tipBorder,
    borderRadius: radius.sm,
    padding: space[4],
    gap: space[1],
  },
  title: {
    ...typography.bodyStrong,
    color: environmentTint.tipTitle,
  },
  description: {
    ...typography.caption,
    color: environmentTint.tipDescription,
  },
});

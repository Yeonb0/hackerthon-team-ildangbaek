import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon } from '@/components/icons';
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
 *
 * 2026-08-16 — Figma Home-Day(229:2571) AlertBanner 대조: 왼쪽 보더 강조 카드에서
 * amber 배경 통 박스 + 아이콘으로, title/description 두 줄에서 한 문단으로 바꿨습니다.
 * getEnvironmentTip()이 반환하는 title/description 데이터 구조 자체는 안 건드렸고,
 * 화면에 보여주는 방식만 "title. description" 한 문장으로 이어붙였습니다.
 */
export function EnvironmentTipCard({ environment, style }: EnvironmentTipCardProps) {
  const tip = getEnvironmentTip(environment);
  if (!tip) return null;

  return (
    <View style={[styles.card, style]}>
      <AppIcon name="warning" size={20} color={environmentTint.tipText} />
      <Text style={styles.text}>
        {tip.title}. {tip.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    backgroundColor: environmentTint.tipBg,
    borderRadius: radius.lg,
    padding: space[3],
  },
  text: {
    flex: 1,
    ...typography.caption,
    color: environmentTint.tipText,
  },
});

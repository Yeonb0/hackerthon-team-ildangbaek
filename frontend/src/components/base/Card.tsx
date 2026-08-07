import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';

type CardProps = ViewProps & {
  /** space 토큰 키. 기본 5 (20). */
  padding?: keyof typeof space;
  style?: StyleProp<ViewStyle>;
};

/**
 * 반투명 흰 배경 + 그림자 카드.
 * 글래스모피즘(blur) 대체 — Android에서 큰 카드에 blur를 쓰면
 * 성능 이슈가 있어서 이 방식을 택함 (로드맵 Phase 2 결정사항).
 */
export function Card({ padding = 5, style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.base, { padding: space[padding] }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    // tokens.ts에 알파(투명도) 변형이 없어서 color.bg(#FFFFFF) 기준
    // 82% 불투명도를 여기서만 예외적으로 rgba로 직접 계산함.
    // Figma Variables 확정 시 전용 토큰(예: color.surface)으로 교체 예정.
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: radius.lg,
    shadowColor: color.ink900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3, // Android
  },
});

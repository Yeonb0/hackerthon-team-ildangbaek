import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';

type LoadingStateProps = {
  variant?: 'spinner' | 'skeleton';
  /** skeleton일 때 보여줄 줄 수 (기본 3) */
  skeletonLines?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 로딩 상태. spinner는 단순 스피너, skeleton은 회색 바 n줄로 레이아웃 모양만 흉내냅니다.
 * skeleton의 실제 모양(카드형/리스트형 등)은 화면마다 다를 수 있어 지금은
 * 가장 단순한 바 형태만 제공합니다 — 디자인 확정 후 화면별 커스텀 skeleton으로 발전 가능.
 */
export function LoadingState({
  variant = 'spinner',
  skeletonLines = 3,
  style,
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <View style={[styles.skeletonContainer, style]}>
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <View key={i} style={styles.skeletonLine} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size="large" color={color.brand500} />
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  skeletonContainer: {
    padding: space[5],
    gap: space[3],
  },
  skeletonLine: {
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: color.ink300,
    opacity: 0.4,
  },
});

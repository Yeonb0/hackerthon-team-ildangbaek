// src/components/state/InlineErrorBanner.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Button } from '@/components/base/Button';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';

type InlineErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 저장(PATCH/POST) 실패 시 사용하는 인라인 배너입니다.
 * ErrorState와 다르게 화면 전체를 덮지 않습니다 — 온보딩처럼 사용자가 입력을 마친 상태에서
 * 저장만 실패한 경우, 화면을 통째로 갈아치우면 입력값이 사라집니다 (F-SYSTEM-03 위반).
 * 폼은 그대로 두고 이 배너만 폼 위/아래에 끼워 넣어 재시도를 유도합니다.
 */
export function InlineErrorBanner({ message, onRetry, style }: InlineErrorBannerProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button label="다시 시도" variant="ghost" onPress={onRetry} style={styles.retryButton} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.blush100,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
  },
  message: {
    flex: 1,
    fontSize: 13,
    ...weightFamily('regular'),
    color: color.ink900,
  },
  retryButton: {
    minHeight: 32,
    paddingHorizontal: space[3],
  },
});

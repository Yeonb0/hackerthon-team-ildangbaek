import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { color, space } from '@/theme/tokens';

export type ErrorVariant = 'network' | 'server' | 'notFound';

type ErrorStateProps = {
  variant: ErrorVariant;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
};

// ⚠️ 임시 카피 — 기획 문구 확정 전까지 사용하는 placeholder입니다. 확정되면 이 표만 교체하면 됩니다.
const VARIANT_COPY: Record<
  ErrorVariant,
  { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }
> = {
  network: {
    icon: 'cloud-offline-outline',
    title: '연결이 원활하지 않아요',
    description: '네트워크 상태를 확인하고 다시 시도해 주세요.',
  },
  server: {
    icon: 'alert-circle-outline',
    title: '잠시 문제가 생겼어요',
    description: '잠시 후 다시 시도해 주세요.',
  },
  notFound: {
    icon: 'search-outline',
    title: '찾을 수 없어요',
    description: '요청하신 내용을 찾지 못했어요.',
  },
};

/**
 * 에러 상태. network(연결 실패) / server(5xx) / notFound(404류) 3종.
 * REPORT_DATA_INSUFFICIENT처럼 "빈 상태"에 가까운 코드는 이 컴포넌트가 아니라
 * EmptyState를 써야 합니다 (types/errorCodes.ts의 EMPTY_STATE_CODES 참고 — 빨간 에러 UI 금지).
 */
export function ErrorState({ variant, onRetry, style }: ErrorStateProps) {
  const copy = VARIANT_COPY[variant];
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={copy.icon} size={40} color={color.statusCaution} />
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.description}>{copy.description}</Text>
      {onRetry ? (
        <Button label="다시 시도" variant="secondary" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
    gap: space[2],
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink900,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: color.ink600,
    textAlign: 'center',
  },
  action: {
    marginTop: space[3],
  },
});

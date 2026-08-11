import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon, AppIconName } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { color, space } from '@/theme/tokens';

type EmptyStateProps = {
  /** Checkpoint 9-B: 신규 세트에 대응 아이콘이 있으면 그 이름, 없으면 계속 Ionicons 이름을 씁니다. */
  icon?: AppIconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 빈 상태. 아이콘/문구/액션 전부 주입식 — 화면마다 텍스트만 바꿔서 재사용합니다.
 * 예: 기록이 없는 캘린더 날짜, 검색 결과 없음 등.
 */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <AppIcon name={icon} size={40} color={color.ink300} />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
          style={styles.action}
        />
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

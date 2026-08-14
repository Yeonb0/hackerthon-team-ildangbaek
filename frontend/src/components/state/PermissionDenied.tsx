import React from 'react';
import { Linking, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon, AppIconName } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export type PermissionType = 'camera' | 'location' | 'notification';

type PermissionDeniedProps = {
  type: PermissionType;
  /** 미지정 시 기본으로 Linking.openSettings()를 호출합니다. */
  onOpenSettings?: () => void;
  style?: StyleProp<ViewStyle>;
};

// ⚠️ 임시 카피 — 기획 문구 확정 전까지 사용하는 placeholder입니다.
// 아이콘: Checkpoint 9-B에서 camera/notification은 신규 세트(camera/bell)로 교체.
// location(위치 핀 모양)도 2026-08-12 추가분(locationPin)으로 교체 완료.
const TYPE_COPY: Record<
  PermissionType,
  { icon: AppIconName; title: string; description: string }
> = {
  camera: {
    icon: 'camera',
    title: '카메라 권한이 필요해요',
    description: '설정에서 카메라 접근을 허용해 주세요.',
  },
  location: {
    icon: 'locationPin',
    title: '위치 권한이 필요해요',
    description: '설정에서 위치 접근을 허용해 주세요.',
  },
  notification: {
    icon: 'bell',
    title: '알림 권한이 꺼져 있어요',
    description: '설정에서 알림을 허용하면 기록 리마인드를 받을 수 있어요.',
  },
};

/**
 * 권한 거부 상태. 설정 앱으로 바로 이동하는 버튼을 포함합니다
 * (로드맵 Phase 5 명시 요구사항: Linking.openSettings()).
 */
export function PermissionDenied({ type, onOpenSettings, style }: PermissionDeniedProps) {
  const copy = TYPE_COPY[type];
  const handlePress = onOpenSettings ?? (() => Linking.openSettings());

  return (
    <View style={[styles.container, style]}>
      <AppIcon name={copy.icon} size={40} color={color.ink300} />
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.description}>{copy.description}</Text>
      <Button label="설정 열기" variant="secondary" onPress={handlePress} style={styles.action} />
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
    fontSize: adjustFontSize(15),
    ...weightFamily('semibold'),
    color: color.ink900,
    textAlign: 'center',
  },
  description: {
    fontSize: adjustFontSize(13),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
  },
  action: {
    marginTop: space[3],
  },
});

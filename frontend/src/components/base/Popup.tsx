// src/components/base/Popup.tsx
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/base/Button';
import { color, radius, space, typography } from '@/theme';

type PopupProps = {
  visible: boolean;
  title: string;
  description: string;
  /** 미지정 시 버튼 없이 배경 탭으로만 닫힙니다. */
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  onRequestClose: () => void;
};

/**
 * 화면 중앙 안내 팝업. S-19 리포트 탭 직접 진입 시 REPORT_DATA_INSUFFICIENT(409)
 * 안내에 처음 쓰지만, "조건 미충족" 안내가 필요한 다른 화면(예: Phase 7
 * CHECK_PROFILE_NOT_READY)에서도 재사용할 수 있도록 base 컴포넌트로 분리했습니다.
 *
 * 문구는 전부 호출부에서 주입합니다 — 기획 팝업 문구가 아직 확정 전이라(로드맵
 * Phase 6 6-3), placeholder 문구를 넣어두고 나중에 교체하는 걸 전제로 합니다.
 */
export function Popup({
  visible,
  title,
  description,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  onRequestClose,
}: PopupProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} accessibilityRole="button">
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actions}>
            {secondaryLabel && (
              <Button
                label={secondaryLabel}
                variant="ghost"
                onPress={onSecondaryPress ?? onRequestClose}
              />
            )}
            {primaryLabel && (
              <Button label={primaryLabel} variant="primary" onPress={onPrimaryPress ?? onRequestClose} />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[5],
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: color.bg,
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[3],
  },
  title: {
    ...typography.h2,
    color: color.ink900,
  },
  description: {
    ...typography.body,
    color: color.ink600,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[2],
    marginTop: space[2],
  },
});

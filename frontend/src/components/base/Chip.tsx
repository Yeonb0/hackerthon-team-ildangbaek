// src/components/base/Chip.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 선택 가능한 낱개 칩. 단일선택/다중선택 여부는 이 컴포넌트가 관여하지 않고
 * 사용하는 화면이 selected/onPress로 직접 제어합니다 (S-01 성별=단일, S-02 피부타입=다중, S-04 호르몬=단일).
 */
export function Chip({ label, selected, onPress, style }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.base, selected && styles.selected, style]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink300,
    backgroundColor: color.bg,
  },
  selected: {
    borderColor: color.brand500,
    backgroundColor: color.brand50,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink600,
  },
  labelSelected: {
    color: color.brand700,
  },
});

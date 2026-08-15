// src/components/base/OptionCard.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconCheck } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type OptionCardProps = {
  title: string;
  /** 선택 기준 설명 (예: "유분이 많고 쉽게 번들거려요"). 없으면 제목만 표시 */
  description?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Chip과 달리 설명 문구를 함께 보여줘야 하는 선택지에 씁니다 (S-02 피부 타입 등).
 * 단일/다중 선택 여부는 이 컴포넌트가 관여하지 않고 사용하는 화면이 결정합니다.
 */
export function OptionCard({
  title,
  description,
  selected,
  onPress,
  disabled,
  style,
}: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {selected ? (
        <View style={styles.checkboxFilled}>
          <IconCheck size={14} color={color.white} />
        </View>
      ) : (
        <View style={styles.checkboxEmpty} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: color.borderDivider,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    backgroundColor: color.bg,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: color.brand500,
    backgroundColor: color.surfaceLavenderSoft,
  },
  disabled: {
    opacity: 0.4,
  },
  textGroup: {
    flex: 1,
    marginRight: space[3],
  },
  title: {
    fontSize: adjustFontSize(15),
    ...weightFamily('semibold'),
    color: color.ink900,
  },
  description: {
    marginTop: space[1],
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
  },
  // Figma Card/Selectable > checkbox — 24px, radius 12(=circle), border 1.5px.
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: color.borderDivider,
  },
  checkboxFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
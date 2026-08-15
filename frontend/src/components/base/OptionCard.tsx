// src/components/base/OptionCard.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconCheck, IconCircleEmpty } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';

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
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {selected ? (
        <IconCheck size={22} color={color.brand500} />
      ) : (
        <IconCircleEmpty size={22} color={color.ink300} />
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
    borderColor: color.ink300,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
  },
  selected: {
    borderColor: color.brand500,
    backgroundColor: color.brand50,
  },
  disabled: {
    opacity: 0.4,
  },
  textGroup: {
    flex: 1,
    marginRight: space[3],
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink900,
  },
  titleSelected: {
    color: color.brand700,
  },
  description: {
    marginTop: space[1],
    fontSize: 12,
    color: color.ink600,
  },
});

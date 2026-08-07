import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentToggleProps<T extends string> = {
  /** 정확히 2개 — 낮/밤 홈 토글, 스캐너 바코드/사진 모드 전환 등 */
  options: [SegmentOption<T>, SegmentOption<T>];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 2지선다 토글. 낮/밤 홈, 스캐너 2모드 전환에 재사용합니다.
 */
export function SegmentToggle<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentToggleProps<T>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: color.brand50,
    borderRadius: radius.pill,
    padding: space[1],
  },
  segment: {
    flex: 1,
    paddingVertical: space[2],
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: color.bg,
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

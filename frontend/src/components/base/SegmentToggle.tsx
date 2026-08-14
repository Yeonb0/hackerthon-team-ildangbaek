import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentToggleProps<T extends string> = {
  /** 2개 이상 — flex:1로 균등 배분되므로 몇 개든 그립니다. 기존엔 2지선다 전용이었지만
   * S-19 기간 토글(7/14/30일, 관리자님 요청 2026-08-10)에서 3개가 필요해져 배열로
   * 완화했습니다. 렌더링이 이미 .map() 기반이라 동작 변화는 없습니다. */
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * N지선다 토글(기본은 2지선다로 써왔음 — 낮/밤 홈, 스캐너 2모드 전환, S-19 기간 3택).
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
    fontSize: adjustFontSize(14),
    // 2026-08-15 — fontWeight: '600' → weightFamily로 교체(글꼴 토큰 적용).
    ...weightFamily('semibold'),
    color: color.ink600,
  },
  labelSelected: {
    color: color.brand700,
  },
});

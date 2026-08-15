// src/components/base/DayNightIconToggle.tsx
//
// 낮/밤 토글 전용 아이콘 버전 (관리자님 요청, 2026-08-14). 홈(S-07/08) 헤더에서만 씁니다.
// 기존 `SegmentToggle`(텍스트 pill)은 리포트 기간(7/14/30일) · 스캐너 모드 전환에서도
// 재사용하는 범용 컴포넌트라 여기에 아이콘 지원을 끼워 넣지 않고 별도로 분리했습니다.
//
// 해/달 아이콘은 42종 커스텀 아이콘 세트에 없어서(디자이너 요청서
// `docs/icon-request-weather-daynight.md` 전달 완료, 회신 대기) Ionicons로 임시
// 대체합니다 — 로드맵 9-B 방침(대응 없는 곳은 Ionicons 유지) 그대로. 실제 아이콘이
// 오면 AppIcon 레지스트리에 'sunny'/'moon' 키를 추가하는 것만으로 이 파일은 안 건드리고
// 교체됩니다 (AppIcon이 커스텀 세트를 우선 쓰도록 이미 만들어져 있어서).
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppIcon } from '@/components/icons/AppIcon';
import { color, radius, space } from '@/theme/tokens';

export type DayNightValue = 'DAY' | 'NIGHT';

type DayNightIconToggleProps = {
  value: DayNightValue;
  onChange: (value: DayNightValue) => void;
  style?: StyleProp<ViewStyle>;
};

export function DayNightIconToggle({ value, onChange, style }: DayNightIconToggleProps) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="낮"
        accessibilityState={{ selected: value === 'DAY' }}
        onPress={() => onChange('DAY')}
        style={[styles.segment, value === 'DAY' && styles.segmentSelected]}
      >
        <AppIcon
          name={value === 'DAY' ? 'sunny' : 'sunny-outline'}
          size={16}
          color={value === 'DAY' ? color.brand700 : color.ink300}
        />
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="밤"
        accessibilityState={{ selected: value === 'NIGHT' }}
        onPress={() => onChange('NIGHT')}
        style={[styles.segment, value === 'NIGHT' && styles.segmentSelected]}
      >
        <AppIcon
          name={value === 'NIGHT' ? 'moon' : 'moon-outline'}
          size={16}
          color={value === 'NIGHT' ? color.brand700 : color.ink300}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.pill,
    padding: space[1],
    gap: space[1],
  },
  segment: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: color.bg,
  },
});

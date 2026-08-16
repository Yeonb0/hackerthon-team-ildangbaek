import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppIcon } from '@/components/icons';
import { color, overlayWhite, radius, space } from '@/theme/tokens';
import type { HomeType } from '@/types/home';

type DayNightToggleProps = {
  value: HomeType;
  onChange: (value: HomeType) => void;
  /** 낮 홈 히어로(날씨 배경 이미지) 위에 얹을 때 true — 트랙 배경을 반투명 흰색으로
   * (Figma Home-Day 229:2571, 2026-08-16). 기본값(불투명 연라벤더)은 밤 홈처럼 사진
   * 배경이 없는 곳에서 계속 씁니다. */
  onHero?: boolean;
  style?: StyleProp<ViewStyle>;
};

const OPTIONS: { value: HomeType; icon: 'sunny' | 'moon'; label: string }[] = [
  { value: 'DAY', icon: 'sunny', label: '낮' },
  { value: 'NIGHT', icon: 'moon', label: '밤' },
];

/**
 * 낮/밤 홈 전용 아이콘 토글 (F-HOME-02). 기존엔 SegmentToggle(텍스트 "낮"/"밤")을
 * 그대로 썼는데, 관리자님이 전달한 참고 이미지 — 스위치형(선택 안 된 쪽 아이콘이
 * 아예 안 보임, 비교 대상)과 세그먼트형(해/달 아이콘이 항상 둘 다 보이고 선택된
 * 쪽만 강조) — 기준으로 세그먼트형으로 교체합니다(관리자님 지시, 2026-08-14).
 *
 * SegmentToggle 자체는 건드리지 않았습니다 — 스캐너 2모드, S-19 기간 3택 등 텍스트
 * 기반 다른 용도로 계속 쓰이고 있어서, 낮/밤 홈 자리에서만 이걸로 갈아끼웁니다.
 *
 * 해/달 전용 SVG는 2026-08-15 디자이너 전달분으로 registry.ts에 'sunny'/'moon' 키로
 * 등록되어 있습니다. AppIcon이 커스텀 세트를 Ionicons보다 우선하므로 이 파일은 코드
 * 변경 없이 자동으로 신규 아이콘을 씁니다.
 *
 * 접근성: 해/달은 모양 자체가 달라서 색만으로 상태를 구분하지 않는다는 규칙(Phase 2)을
 * 이미 만족하고, 선택된 쪽에 흰 원형 배경을 추가로 얹어 한 번 더 구분됩니다.
 */
export function DayNightToggle({ value, onChange, onHero = false, style }: DayNightToggleProps) {
  return (
    <View style={[styles.track, onHero && styles.trackOnHero, style]} accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={styles.segment}
            hitSlop={4}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
              <AppIcon name={option.icon} size={18} color={selected ? color.brand500 : color.ink300} />
            </View>
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
    gap: space[1],
  },
  trackOnHero: {
    backgroundColor: overlayWhite[28],
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: color.bg,
  },
});

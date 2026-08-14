import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppIcon } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import type { HomeType } from '@/types/home';

type DayNightToggleProps = {
  value: HomeType;
  onChange: (value: HomeType) => void;
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
 * 해/달 전용 SVG는 디자이너 전달본이 아직 없어(날씨 아이콘 세트 미도착) AppIcon의
 * Ionicons 폴백('sunny'/'moon')을 임시로 씁니다(로드맵 9-B 방침과 동일 패턴) —
 * 전용 아이콘이 오면 registry.ts에 추가하고 여기 이름만 바꾸면 됩니다.
 *
 * 접근성: 해/달은 모양 자체가 달라서 색만으로 상태를 구분하지 않는다는 규칙(Phase 2)을
 * 이미 만족하고, 선택된 쪽에 흰 원형 배경을 추가로 얹어 한 번 더 구분됩니다.
 */
export function DayNightToggle({ value, onChange, style }: DayNightToggleProps) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
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

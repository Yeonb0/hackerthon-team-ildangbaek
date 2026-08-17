// src/components/base/Chip.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export type ChipVariant = 'outline' | 'solid';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
   * outline(기본) — 흰 배경 + 보라 테두리, 선택 시 brand50 배경에 brand700 글씨.
   *   온보딩(성별·피부타입·호르몬)에서 쓰는 기존 모양입니다.
   * solid — 선택 시 보라 배경 + 흰 글씨. 제품 기록의 카테고리 필터(CategoryFilterBar)와
   *   같은 모양으로, 목록을 걸러내는 필터 칩에 씁니다.
   */
  variant?: ChipVariant;
  style?: StyleProp<ViewStyle>;
};

/**
 * 선택 가능한 낱개 칩. 단일선택/다중선택 여부는 이 컴포넌트가 관여하지 않고
 * 사용하는 화면이 selected/onPress로 직접 제어합니다 (S-01 성별=단일, S-02 피부타입=다중, S-04 호르몬=단일).
 *
 * 2026-08-15 — 비선택 테두리 ink300(#B7BCC2 회색) → border(#C9C0E0 연보라),
 * 라벨색 ink600 → textSub. 관리자 결정 2번(테두리 검정→보라) 적용.
 */
export function Chip({ label, selected, onPress, variant = 'outline', style }: ChipProps) {
  const isSolid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.base,
        isSolid && styles.solidBase,
        selected && (isSolid ? styles.solidSelected : styles.selected),
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          isSolid && styles.solidLabel,
          selected && (isSolid ? styles.solidLabelSelected : styles.labelSelected),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.bg,
  },
  selected: {
    borderColor: color.brand500,
    backgroundColor: color.brand50,
  },
  label: {
    fontSize: adjustFontSize(14),
    ...weightFamily('semibold'),
    color: color.textSub,
  },
  labelSelected: {
    color: color.brand700,
  },

  // ── solid (CategoryFilterBar와 동일한 모양) ──
  // 테두리를 지우는 대신 투명 테두리로 남깁니다 — 폭이 선택 여부에 따라 2px 달라지면
  // 가로 스크롤 칩들이 누를 때마다 미세하게 밀립니다.
  solidBase: {
    borderColor: 'transparent',
    backgroundColor: color.surfaceLavenderSoft,
  },
  solidSelected: {
    borderColor: 'transparent',
    backgroundColor: color.brand500,
  },
  solidLabel: {
    color: color.textInk,
  },
  solidLabelSelected: {
    color: color.white,
  },
});
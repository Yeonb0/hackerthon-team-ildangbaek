import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon, AppIconName } from '@/components/icons';
import { radius, space } from '@/theme/tokens';
import {
  INGREDIENT_STATUS_COLOR,
  INGREDIENT_STATUS_ICON,
  INGREDIENT_STATUS_LABEL,
} from '@/lib/ingredientStatus';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export type TagVariant = 'match' | 'caution' | 'insufficient';

type TagProps = {
  variant: TagVariant;
  /** 미지정 시 variant별 기본 라벨 사용 */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

// 라벨·아이콘·색은 lib/ingredientStatus.ts의 단일 정의를 그대로 씁니다(2026-08-17).
// 예전에는 여기와 각 화면이 따로 매핑을 들고 있어서 같은 상태가 화면마다 다른 이름으로
// 불렸습니다 — 그 경위는 ingredientStatus.ts 상단 주석 참고.
const VARIANT_CONFIG: Record<
  TagVariant,
  { defaultLabel: string; tint: string; icon: AppIconName }
> = {
  match: {
    defaultLabel: INGREDIENT_STATUS_LABEL.GOOD,
    tint: INGREDIENT_STATUS_COLOR.GOOD,
    icon: INGREDIENT_STATUS_ICON.GOOD,
  },
  caution: {
    defaultLabel: INGREDIENT_STATUS_LABEL.CAUTION,
    tint: INGREDIENT_STATUS_COLOR.CAUTION,
    icon: INGREDIENT_STATUS_ICON.CAUTION,
  },
  insufficient: {
    defaultLabel: INGREDIENT_STATUS_LABEL.INSUFFICIENT,
    tint: INGREDIENT_STATUS_COLOR.INSUFFICIENT,
    icon: INGREDIENT_STATUS_ICON.INSUFFICIENT,
  },
};

/**
 * 성분/제품 판정 태그.
 * 접근성 규칙: 색만으로 구분하지 않고 아이콘(심볼)을 항상 함께 표시합니다.
 */
export function Tag({ variant, label, style }: TagProps) {
  const config = VARIANT_CONFIG[variant];
  const tint = config.tint;
  const displayLabel = label ?? config.defaultLabel;

  return (
    <View
      style={[styles.base, { backgroundColor: withOpacity(tint), borderColor: tint }, style]}
      accessibilityRole="text"
      accessibilityLabel={`${displayLabel} 태그`}
    >
      {/* 표정 아이콘은 체크/경고 심볼보다 획이 잘고 안쪽 여백이 많아서, 같은 size로는
          더 작아 보입니다. 14 → 20으로 올렸습니다(관리자 요청, 2026-08-17).
          여기서 더 키우면 아이콘 높이가 태그 높이를 결정하기 시작해 목록 행 간격이
          벌어집니다 — 그때는 태그 세로 패딩을 같이 줄여야 합니다. */}
      <AppIcon name={config.icon} size={20} color={tint} style={styles.icon} />
      <Text style={[styles.label, { color: tint }]}>{displayLabel}</Text>
    </View>
  );
}

// tint 색상의 옅은 배경 버전이 필요한데 tokens.ts에 알파 변형이 없어서
// 여기서만 예외적으로 계산함. Figma Variables 확정 시 전용 토큰으로 교체 예정.
function withOpacity(hex: string, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  icon: {
    marginRight: space[1],
  },
  label: {
    fontSize: adjustFontSize(12),
    ...weightFamily('semibold'),
  },
});

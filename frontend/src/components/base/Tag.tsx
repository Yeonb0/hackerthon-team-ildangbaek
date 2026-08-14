import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon, AppIconName } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export type TagVariant = 'match' | 'caution' | 'insufficient';

type TagProps = {
  variant: TagVariant;
  /** 미지정 시 variant별 기본 라벨 사용 */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

// ⚠️ 임시 매핑 (관리자 확인 필요) — 디자인 컬러 확정 시 교체
// - match: statusGood
// - caution: statusCaution (statusWatch보다 경고 성격이 강해서 채택)
// - insufficient: 위험도 판정이 아니라 "모름" 상태라 상태색 대신 ink600(중립 회색) 사용
// 아이콘: Checkpoint 9-B에서 match/caution은 신규 세트(check/warning)로 교체.
// insufficient(help-circle-outline)도 2026-08-12 추가분(helpCircle)으로 교체 완료.
const VARIANT_CONFIG: Record<
  TagVariant,
  { defaultLabel: string; tint: string; icon: AppIconName }
> = {
  match: { defaultLabel: '맞음', tint: color.statusGood, icon: 'check' },
  caution: { defaultLabel: '주의', tint: color.statusCaution, icon: 'warning' },
  insufficient: {
    defaultLabel: '데이터부족',
    tint: color.ink600,
    icon: 'helpCircle',
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
      <AppIcon name={config.icon} size={14} color={tint} style={styles.icon} />
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

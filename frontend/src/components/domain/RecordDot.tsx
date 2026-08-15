import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { color, radius } from '@/theme/tokens';
import type { RecordDotStatus } from '@/types/home';

type RecordDotProps = {
  status: RecordDotStatus;
  style?: StyleProp<ViewStyle>;
};

const SIZE = 8;

// 접근성 규칙(Phase 2 로드맵): 완료 상태를 색만으로 구분하지 않습니다.
// FULL/PARTIAL/NONE은 색뿐 아니라 채움(solid) vs 외곽선(outline) vs 흐림(dim)으로
// 형태 자체가 다르기 때문에, 별도 아이콘 없이도 색약 사용자가 구분할 수 있습니다.
const STATUS_STYLE: Record<RecordDotStatus, ViewStyle> = {
  FULL: { backgroundColor: color.brand500 },
  PARTIAL: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color.brand500 },
  NONE: { backgroundColor: color.ink300, opacity: 0.4 },
};

/**
 * 기록 상태 점 하나. F-HOME-06(밤 홈 주간 현황) / F-RECORD-01(월간 캘린더) 공용 원자 컴포넌트입니다.
 */
export function RecordDot({ status, style }: RecordDotProps) {
  return <View style={[styles.base, STATUS_STYLE[status], style]} />;
}

const styles = StyleSheet.create({
  base: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
  },
});

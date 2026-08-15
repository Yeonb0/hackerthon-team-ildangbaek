import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type ProgressBarProps = {
  /** 0~1 채움 비율. 분모를 몰라도 대략치를 넘겨서 항상 지정합니다. */
  progress: number;
  /** current/total 둘 다 있을 때만 "n/N" 텍스트를 노출합니다. */
  current?: number;
  total?: number;
  /** 채움 색상(선택) — 기본은 brand500. F-RECORD-02 월간 기록 모닝/나이트 진행률처럼
   * 슬롯별로 색을 구분해야 하는 곳에서만 넘깁니다(2026-08-15 추가). */
  fillColor?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 온보딩 등에서 쓰는 진행바.
 * 분모(total)가 아직 확정되지 않은 시점(예: 온보딩 성별 선택 전)에는
 * current/total을 넘기지 않으면 채움바만 렌더됩니다 (확정 결정 반영).
 */
export function ProgressBar({ progress, current, total, fillColor, style }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const showLabel = current != null && total != null;

  return (
    <View
      style={[styles.wrapper, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 1, now: clamped }}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }, fillColor && { backgroundColor: fillColor }]} />
      </View>
      {showLabel && (
        <Text style={styles.label}>
          {current}/{total}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.ink300,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: color.brand500,
  },
  label: {
    marginLeft: space[2],
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
  },
});

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MetricListItem } from '@/api/adapters';
import { ProgressBar } from '@/components/base/ProgressBar';
import { color, space } from '@/theme/tokens';

type MetricScoreListProps = {
  /** src/api/adapters.ts의 toMetricList() 출력을 그대로 넘깁니다. 개수 무관 동작. */
  items: MetricListItem[];
  style?: StyleProp<ViewStyle>;
};

/**
 * 지표 점수 리스트. 배열 길이(3개/4개/6개)와 무관하게 동작합니다.
 * ⚠️ score는 0~100 · 높을수록 좋음을 가정합니다 — 백엔드 정규화 방향 확정 대기 중인
 * 항목이라(로드맵 "지금 바로 요청해야 할 것" 참고), 확정되면 이 파일의 방향(▲/▼ 색상)만 손보면 됩니다.
 */
export function MetricScoreList({ items, style }: MetricScoreListProps) {
  return (
    <View style={[styles.container, style]}>
      {items.map((item) => (
        <View key={item.key} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.label}>{item.label}</Text>
            <DeltaBadge delta={item.delta} />
          </View>
          <View style={styles.barRow}>
            <ProgressBar progress={item.score / 100} style={styles.bar} />
            <Text style={styles.score}>{item.score}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    // 첫 기록 — 로드맵 Phase 5 명시 요구사항: 증감 문구 대신 "첫 기록입니다" 대체 문구
    return <Text style={styles.deltaNeutral}>첫 기록입니다</Text>;
  }
  if (delta === 0) {
    return (
      <View style={styles.deltaRow}>
        <Ionicons name="remove" size={12} color={color.ink600} />
        <Text style={styles.deltaNeutral}>변화 없음</Text>
      </View>
    );
  }
  const isUp = delta > 0;
  return (
    <View style={styles.deltaRow}>
      <Ionicons
        name={isUp ? 'arrow-up' : 'arrow-down'}
        size={12}
        color={isUp ? color.statusGood : color.statusCaution}
      />
      <Text style={[styles.deltaText, { color: isUp ? color.statusGood : color.statusCaution }]}>
        {Math.abs(delta)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[4],
  },
  row: {
    gap: space[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink900,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  bar: {
    flex: 1,
  },
  score: {
    fontSize: 13,
    fontWeight: '600',
    color: color.ink600,
    minWidth: 24,
    textAlign: 'right',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deltaNeutral: {
    fontSize: 12,
    color: color.ink600,
  },
});

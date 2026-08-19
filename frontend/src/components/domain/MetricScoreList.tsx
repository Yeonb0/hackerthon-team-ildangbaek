// src/components/domain/MetricScoreList.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconArrowDown, IconArrowUp, IconMinus } from '@/components/icons';
import { MetricListItem } from '@/api/adapters';
import { ProgressBar } from '@/components/base/ProgressBar';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type MetricScoreListProps = {
  /** src/api/adapters.ts의 toMetricList() 출력을 그대로 넘깁니다. 개수 무관 동작. */
  items: MetricListItem[];
  style?: StyleProp<ViewStyle>;
};

/**
 * 지표 점수 리스트. 배열 길이(3개/4개/6개)와 무관하게 동작합니다.
 * ✅ score는 0~100 · **높을수록 좋음**입니다(2026-08-18 확정 — 관리자 확정 및 백엔드
 * ai-server/app/metrics.py 일치). 이 컴포넌트는 원래부터 이 방향을 가정하고 있었고,
 * 확정으로 앱 전체가 같은 규칙이 됐습니다.
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

/**
 * 지표 증감 표시. 색 규칙(오르면 statusGood · 내리면 statusCaution)이 여기 한 곳에만
 * 있도록 화면들이 이 컴포넌트를 공유합니다 — 지표는 **높을수록 좋음**이라 상승이 개선입니다.
 *
 * 2026-08-19(세션 20) — `compact` 모드 추가. S-18 오늘의 피부 지표 카드가 2열이라
 * 폭이 좁고, 등급 배지("좋아요")와 **같은 줄**에 들어가야 해서 문구형("첫 기록입니다",
 * "변화 없음")을 그대로 쓰면 카드가 두 줄로 접힙니다. compact는 숫자만 남기고,
 * 비교 대상이 없을 땐(`delta === null`) 아예 그리지 않습니다 — 그 화면은 헤더에서
 * 이미 "○○ 대비"로 비교 대상을 말하고 있어 칸마다 반복할 이유가 없습니다.
 */
export function DeltaBadge({ delta, compact = false }: { delta: number | null; compact?: boolean }) {
  if (delta === null) {
    if (compact) return null;
    // 첫 기록 — 로드맵 Phase 5 명시 요구사항: 증감 문구 대신 "첫 기록입니다" 대체 문구
    return <Text style={styles.deltaNeutral}>첫 기록입니다</Text>;
  }
  if (delta === 0) {
    return (
      <View style={styles.deltaRow}>
        <IconMinus size={compact ? 10 : 12} color={color.ink600} />
        {!compact && <Text style={styles.deltaNeutral}>변화 없음</Text>}
      </View>
    );
  }
  const isUp = delta > 0;
  const ArrowIcon = isUp ? IconArrowUp : IconArrowDown;
  const accent = isUp ? color.statusGood : color.statusCaution;
  return (
    <View style={styles.deltaRow}>
      <ArrowIcon size={compact ? 10 : 12} color={accent} />
      <Text style={[compact ? styles.deltaTextCompact : styles.deltaText, { color: accent }]}>
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
    fontSize: adjustFontSize(14),
    ...weightFamily('semibold'),
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
    fontSize: adjustFontSize(13),
    ...weightFamily('semibold'),
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
    fontSize: adjustFontSize(12),
    ...weightFamily('semibold'),
  },
  // compact — 등급 배지와 같은 줄에 놓이는 자리. 배지 텍스트(10)와 같은 크기로 맞춰서
  // 둘이 나란히 있을 때 한쪽만 커 보이지 않게 합니다.
  deltaTextCompact: {
    fontSize: adjustFontSize(10),
    ...weightFamily('bold'),
  },
  deltaNeutral: {
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
  },
});

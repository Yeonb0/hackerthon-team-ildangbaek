import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
import { color, space, typography } from '@/theme';
import type { TodayReport } from '@/types/home';

type TodayReportCardProps = {
  report: TodayReport;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * F-HOME-07 오늘 리포트 요약 카드.
 * "노출 여부(오늘 피부 기록이 있는지)" 판단은 이 컴포넌트가 하지 않습니다 — 호출하는 쪽
 * (NightHomeScreen)이 data.todayReport가 null이 아닐 때만 이 컴포넌트를 렌더링합니다.
 */
export function TodayReportCard({ report, onPress, style }: TodayReportCardProps) {
  const hasComparison = report.change !== null;
  const isUp = (report.change ?? 0) >= 0;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={[styles.card, style]}>
        <Text style={styles.label}>오늘 리포트</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{report.totalScore}점</Text>
          {hasComparison ? (
            <Text style={[styles.change, { color: isUp ? color.statusGood : color.statusCaution }]}>
              {isUp ? '▲' : '▼'} {Math.abs(report.change ?? 0)}
            </Text>
          ) : (
            // 비교 대상(전일 동일 시간대)이 없는 경우 — 명세서 F-HOME-07 BR2
            <Text style={styles.changeNeutral}>첫 기록입니다</Text>
          )}
        </View>
        <Text style={styles.summary}>{report.summary}</Text>
        <Text style={styles.link}>자세히 보러가기 →</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[1],
  },
  label: {
    ...typography.caption,
    color: color.ink600,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space[2],
  },
  score: {
    ...typography.display,
    color: color.ink900,
  },
  change: {
    ...typography.bodyStrong,
  },
  changeNeutral: {
    ...typography.caption,
    color: color.ink600,
  },
  summary: {
    ...typography.body,
    color: color.ink900,
  },
  link: {
    ...typography.caption,
    color: color.brand700,
    marginTop: space[1],
  },
});

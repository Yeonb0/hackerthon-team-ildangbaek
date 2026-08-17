// src/components/domain/ReportSummaryCard.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
import { GradientNumber } from '@/components/base/GradientNumber';
import { AreaTrendChart, weekdayLabel } from '@/components/chart/AreaTrendChart';
import { LoadingState } from '@/components/state/LoadingState';
import { IconMinus } from '@/components/icons';
import { color, metricAccent, reportColor, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';
import type { ReportSummaryResult, MetricKey } from '@/types/report';

const METRIC_LABELS: Record<MetricKey, string> = {
  trouble: '트러블',
  redness: '홍조',
  pigmentation: '색소',
  pores: '모공',
};

// 화면 순서는 항상 trouble/redness/pigmentation/pores 고정 — Figma 210:1860 실측
// 순서와 동일합니다 (기존 리포트 화면 Chip 순서 trouble/redness/pores/pigmentation과
// 다릅니다 — 이 카드만 Figma 순서를 따릅니다. Chip 쪽은 별도 항목으로 다룹니다).
const SUMMARY_METRIC_ORDER: MetricKey[] = ['trouble', 'redness', 'pigmentation', 'pores'];

type ReportSummaryCardProps = {
  data: ReportSummaryResult | undefined;
  isLoading: boolean;
  /** 화면 표시용일 뿐이라 7|14|30 어느 값이든 받습니다 — 실제 조회 기간(7|30)은
   * 호출부(ReportScreen)가 이미 callPeriod로 정리해서 useReportSummary에 넘깁니다. */
  period: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 리포트 홈 상단 "종합 피부 점수" 카드 (Figma 210:2437 실측). ⚠️ 데이터는 전부
 * 목업입니다 — types/report.ts의 ReportSummaryResult 주석 참고. 백엔드 필드가
 * 생기기 전까지는 항상 이 값들이 뜹니다.
 *
 * 총점(totalScore)은 "높을수록 좋음" 방향(SKIN-01과 동일)이라 델타 색이 일반
 * 방향(▲=safe/▼=caution)입니다. 반면 지표 4개 미니 스코어는 "낮을수록 좋음"
 * (항목별 추이 섹션의 "낮을수록 좋아요" 안내문과 동일 기준)이라 델타 색이
 * 반대(▲=caution/▼=safe)입니다 — Figma 실측값(트러블 38 ▼1 초록, 홍조 34 ▲1 빨강)
 * 그대로입니다.
 */
export function ReportSummaryCard({ data, isLoading, period, style }: ReportSummaryCardProps) {
  if (isLoading || !data) {
    return (
      <Card style={[styles.card, style]}>
        <LoadingState variant="spinner" style={styles.loading} />
      </Card>
    );
  }

  const metricByKey = new Map(data.metrics.map((item) => [item.metric, item]));

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.totalBlock}>
          <Text style={styles.label}>종합 피부 점수</Text>
          <View style={styles.totalNumberRow}>
            <GradientNumber value={data.totalScore} fontSize={48} />
            <DeltaText delta={data.totalDelta} invert={false} style={styles.totalDelta} />
          </View>
          <Text style={styles.label}>지난 {period}일 기준</Text>
        </View>

        <View style={styles.miniScoreRow}>
          {SUMMARY_METRIC_ORDER.map((metric) => {
            const item = metricByKey.get(metric);
            if (!item) return null;
            return (
              <View key={metric} style={styles.miniScoreCard}>
                <Text style={styles.miniScoreLabel}>{METRIC_LABELS[metric]}</Text>
                <Text style={[styles.miniScoreValue, { color: metricAccent[metric] }]}>{item.score}</Text>
                <DeltaText delta={item.delta} invert style={styles.miniScoreDelta} />
              </View>
            );
          })}
        </View>
      </View>

      <AreaTrendChart
        points={data.graph}
        accentColor={color.brand500}
        labelMode={period === 7 ? 'all' : 'edges'}
        formatLabel={period === 7 ? weekdayLabel : undefined}
        style={styles.chart}
      />
    </Card>
  );
}

/**
 * ▲/▼ 증감 텍스트. invert=true면 "낮을수록 좋음" 지표용으로 색을 뒤집습니다
 * (MetricScoreList.DeltaBadge와 별도입니다 — 그쪽은 아이콘+"변화 없음"/"첫 기록"
 * 문구까지 포함한 다른 화면(S-18) 전용 컴포넌트라, 이 카드의 더 작고 인라인인
 * Figma 스타일(▲/▼ 글리프+숫자만, 별도 아이콘 없음)과 재사용하기엔 서로 안 맞았습니다).
 */
function DeltaText({
  delta,
  invert,
  style,
}: {
  delta: number | null;
  invert: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (delta === null) {
    return (
      <View style={[styles.deltaRow, style]}>
        <IconMinus size={10} color={color.textSub} />
      </View>
    );
  }
  if (delta === 0) {
    return (
      <View style={[styles.deltaRow, style]}>
        <IconMinus size={10} color={color.textSub} />
      </View>
    );
  }
  const isUp = delta > 0;
  const good = invert ? !isUp : isUp;
  const deltaColor = good ? reportColor.safe : reportColor.caution;
  return (
    <View style={[styles.deltaRow, style]}>
      <Text style={[styles.deltaText, { color: deltaColor }]}>
        {isUp ? '▲' : '▼'} {Math.abs(delta)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[4],
  },
  loading: {
    minHeight: 160,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[3],
  },
  totalBlock: {
    gap: 2,
  },
  label: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  totalNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
  },
  totalDelta: {
    paddingBottom: 6,
  },
  miniScoreRow: {
    flexDirection: 'row',
    gap: space[3],
  },
  miniScoreCard: {
    alignItems: 'center',
    gap: 2,
  },
  miniScoreLabel: {
    fontSize: adjustFontSize(10),
    ...weightFamily('semibold'),
    color: color.textSub,
  },
  miniScoreValue: {
    fontSize: adjustFontSize(22),
    ...weightFamily('bold'),
  },
  miniScoreDelta: {},
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deltaText: {
    fontSize: adjustFontSize(11),
    ...weightFamily('semibold'),
  },
  chart: {
    marginTop: space[2],
  },
});

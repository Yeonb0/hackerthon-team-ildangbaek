// src/components/domain/MetricTrendCard.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AreaTrendChart, weekdayLabel } from '@/components/chart/AreaTrendChart';
import { AppIcon, IconMinus } from '@/components/icons';
import { color, metricAccent, reportColor, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize, pinDisplayFont } from '@/theme/typography';
import type { MetricKey, ReportPeriod, GraphPoint } from '@/types/report';

const METRIC_TABS: { key: MetricKey; label: string }[] = [
  { key: 'trouble', label: '트러블' },
  { key: 'redness', label: '홍조' },
  { key: 'pigmentation', label: '색소잡티' },
  { key: 'pores', label: '모공' },
];

const METRIC_INDEX_LABEL: Record<MetricKey, string> = {
  trouble: '트러블 지수',
  redness: '홍조 지수',
  pigmentation: '색소잡티 지수',
  pores: '모공 지수',
};

type MetricTrendCardProps = {
  metric: MetricKey;
  onChangeMetric: (metric: MetricKey) => void;
  /** REPORT-01 graph — 모닝/나이트 중 나이트 우선으로 접어서 단일 선으로 그립니다
   * (TrendGraph와 동일 규칙, ADR 0012·0013). */
  graph: GraphPoint[];
  /** 선택된 지표의 기간 집계 점수·증감 (REPORT-01 summary.metrics). */
  score: number | undefined;
  delta: number | null | undefined;
  period: ReportPeriod;
  /** 점을 찍을 날짜 — 7일 뷰는 전체, 30일 뷰는 이벤트가 있는 날만(ReportScreen 참고). */
  dotDates?: string[];
  style?: StyleProp<ViewStyle>;
};

/**
 * 리포트 홈 "항목별 추이" 섹션 (Figma 컬러 최종본 210:1951 실측).
 *
 * 지표 탭 4개(선택 시 지표 고유색으로 채움) + "{지표} 지수" 큰 숫자·증감 +
 * "높을수록 좋아요" 안내 + 지표 색 영역 차트로 구성됩니다.
 *
 * ✅ 2026-08-18 방향 확정 — 지표 4종은 전부 "높을수록 좋음"이라 증감 색이 종합 점수와
 * 같은 규칙입니다(▲=safe/▼=caution). 예전엔 지표만 반대라 별도 규칙을 뒀는데,
 * 이제 ReportSummaryCard의 DeltaText와 판정이 동일합니다.
 *
 * 2026-08-17(세션 12) — 지수 큰 숫자만 배달의민족 주아체(BMJUA)로 고정했습니다
 * (관리자 결정). 탭 라벨·증감·"높을수록 좋아요"는 본문 글꼴 그대로입니다.
 * ⚠️ 주아체는 Regular 단일 weight라 fontWeight/weightFamily를 같이 주면 안드로이드가
 * 합성 볼드를 얹어 획이 뭉개집니다 — 굵기 지정을 뺐습니다.
 * ⚠️ 주아체는 기호 글리프가 비어 있는 게 있어(°/℃ 확인됨), 점수가 없을 때 쓰는
 * 대시('–')는 주아체로 그리지 않고 본문 글꼴(scoreValueEmpty)로 분리했습니다.
 * ⚠️ 크기는 "지금 그대로" 결정에 따라 기존 adjustFontSize(28)를 유지합니다.
 */
export function MetricTrendCard({
  metric,
  onChangeMetric,
  graph,
  score,
  delta,
  period,
  dotDates,
  style,
}: MetricTrendCardProps) {
  const accent = metricAccent[metric];
  // 모닝/나이트를 단일 선으로 접습니다 — 나이트 우선, 없으면 모닝(TrendGraph와 동일).
  const points = graph.map((point) => ({
    date: point.date,
    score: point.nightScore ?? point.morningScore,
  }));

  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>항목별 추이</Text>

      <View style={styles.tabRow}>
        {METRIC_TABS.map((tab) => {
          const selected = tab.key === metric;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onChangeMetric(tab.key)}
              style={[
                styles.tab,
                selected ? { backgroundColor: metricAccent[tab.key] } : styles.tabIdle,
              ]}
            >
              <Text style={[styles.tabLabel, selected ? styles.tabLabelSelected : null]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>{METRIC_INDEX_LABEL[metric]}</Text>
          <View style={styles.scoreValueRow}>
            {score === undefined ? (
              <Text style={[styles.scoreValueEmpty, { color: accent }]}>–</Text>
            ) : (
              <Text style={[styles.scoreValue, { color: accent }]}>{score}</Text>
            )}
            <MetricDelta delta={delta ?? null} />
          </View>
        </View>
        <Text style={styles.scoreHint}>높을수록 좋아요</Text>
      </View>

      <AreaTrendChart
        points={points}
        accentColor={accent}
        labelMode={period === 7 ? 'all' : 'edges'}
        formatLabel={period === 7 ? weekdayLabel : undefined}
        dotDates={dotDates}
      />
    </View>
  );
}

/** 지표 4종은 "높을수록 좋음"이라 ▲가 초록(safe), ▼가 빨강(caution)입니다(2026-08-18 확정). */
function MetricDelta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    return <IconMinus size={10} color={color.textSub} />;
  }
  const isUp = delta > 0;
  const accent = isUp ? reportColor.safe : reportColor.caution;
  // 2026-08-17(세션 15) — ▲/▼ 문자를 아이콘 세트로 교체(관리자 요청). 화살표를 글리프로
  // 그리면 글꼴마다 모양·기준선이 달라 숫자와 세로 정렬이 어긋나고, 주아체처럼 기호
  // 글리프가 비어 있는 글꼴에서는 아예 안 보일 위험이 있습니다(이 파일 상단 주석 참고).
  return (
    <View style={styles.deltaRow}>
      <AppIcon name={isUp ? 'arrowUp' : 'arrowDown'} size={10} color={accent} />
      <Text style={[styles.deltaText, { color: accent }]}>{Math.abs(delta)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingVertical: space[5],
    gap: space[3],
  },
  sectionTitle: {
    fontSize: adjustFontSize(14),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  tabRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  tab: {
    flex: 1,
    paddingVertical: space[2],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIdle: {
    backgroundColor: color.surfaceLavenderPale,
  },
  tabLabel: {
    fontSize: adjustFontSize(12),
    ...weightFamily('semibold'),
    color: color.textSub,
  },
  tabLabelSelected: {
    color: color.white,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: space[1],
  },
  scoreBlock: {
    gap: 0,
  },
  scoreLabel: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  // 글꼴은 주아체 고정(관리자 결정, 2026-08-17 세션 12). weightFamily를 같이 주면
  // 안 됩니다 — 컴포넌트 상단 주석 참고.
  scoreValue: {
    fontSize: adjustFontSize(28),
    lineHeight: 38,
    ...pinDisplayFont('bmjua'),
  },
  // 값이 없을 때의 '–'. 주아체 기호 글리프 위험을 피해 본문 글꼴로 그립니다.
  scoreValueEmpty: {
    fontSize: adjustFontSize(28),
    lineHeight: 38,
    ...weightFamily('bold'),
  },
  scoreHint: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textSub,
    paddingBottom: 6,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 8,
  },
  deltaText: {
    fontSize: adjustFontSize(11),
    ...weightFamily('semibold'),
  },
});

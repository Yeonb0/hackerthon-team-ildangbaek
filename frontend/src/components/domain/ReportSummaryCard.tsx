// src/components/domain/ReportSummaryCard.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AreaTrendChart, weekdayLabel } from '@/components/chart/AreaTrendChart';
import { LoadingState } from '@/components/state/LoadingState';
import { AppIcon, IconMinus } from '@/components/icons';
import { color, metricAccent, reportColor, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize, pinDisplayFont } from '@/theme/typography';
import type { ReportSummaryResult, MetricKey, ReportPeriod } from '@/types/report';

const METRIC_LABELS: Record<MetricKey, string> = {
  trouble: '트러블',
  redness: '홍조',
  pigmentation: '색소',
  pores: '모공',
};

// 화면 순서는 항상 trouble/redness/pigmentation/pores 고정 — Figma 210:1860 실측
// 순서와 동일합니다 (항목별 추이 탭 순서와도 같습니다).
const SUMMARY_METRIC_ORDER: MetricKey[] = ['trouble', 'redness', 'pigmentation', 'pores'];

type ReportSummaryCardProps = {
  data: ReportSummaryResult | undefined;
  isLoading: boolean;
  /** 7 또는 30 — REPORT-01 유효 기간과 항상 동일합니다. */
  period: ReportPeriod;
  /** 종합 점수 그래프에 점을 찍을 날짜. 7일 뷰는 호출부(ReportScreen)가 표시 중인
   * 날짜 전체를 넘겨 매일 점을 찍고, 30일 뷰는 REPORT-02에서 모아온 이벤트 날짜만
   * 넘겨 이벤트가 있는 날에만 점을 찍습니다. */
  dotDates?: string[];
  style?: StyleProp<ViewStyle>;
};

/**
 * 리포트 홈 상단 "종합 피부 점수" 헤더 (Figma 컬러 최종본 210:1831 실측).
 * 데이터는 REPORT-01 응답의 summary 필드를 그대로 씁니다 — mock/live 분기는
 * api/queries/report.ts의 getReport가 처리합니다.
 *
 * 2026-08-17 — Card(둥근 흰 카드)에서 화면 상단 흰 섹션으로 바뀌었습니다(Figma는
 * 배경이 연보라 #F5F2FF이고 섹션들이 흰 블록으로 쌓입니다). 총점 숫자의 그라데이션은
 * 관리자 요청으로 제외하고 brand500 솔리드로 둡니다.
 *
 * 2026-08-17(세션 12) — 총점 숫자만 배달의민족 주아체(BMJUA)로 고정했습니다
 * (관리자 결정 — 미니 스코어 4종과 증감은 기존 본문 글꼴 유지). 낮 홈 기온 숫자
 * (EnvironmentCard)와 같은 `pinDisplayFont('bmjua')` 패턴이라 새 폰트 등록은
 * 없습니다. ⚠️ 주아체는 Regular 단일 weight라 `weightFamily('bold')`를 같이 주면
 * 안드로이드가 합성 볼드를 얹어 획이 뭉개집니다 — 그래서 굵기 지정을 제거했습니다.
 * ⚠️ 주아체는 기호 글리프가 비어 있는 게 있어(°/℃ 확인됨) 숫자 자리에만 씁니다.
 * ⚠️ 관례상 pinDisplayFont 자리엔 adjustFontSize를 쓰지 않지만, 이번엔 "크기는
 * 지금 그대로"라는 관리자 결정에 따라 기존 adjustFontSize(48)를 유지했습니다.
 * (사용자 글꼴을 나눔스퀘어네오로 바꾸면 이 숫자도 같이 작아집니다 — 의도된 유지)
 *
 * ✅ 2026-08-18 방향 확정 — 총점과 지표 4개 **모두 "높을수록 좋음"** 입니다.
 * 따라서 델타 색 규칙이 하나로 통일됐습니다(▲=safe/▼=caution).
 * ⚠️ Figma 실측값(트러블 38 ▼1 초록, 홍조 34 ▲1 빨강)은 "낮을수록 좋음"을 전제로
 * 그려진 화면이라 **더 이상 색이 일치하지 않습니다.** 목업 숫자도 같이 뒤집었으니
 * Figma와 대조할 때는 이 점을 감안해 주세요.
 */
export function ReportSummaryCard({ data, isLoading, period, dotDates, style }: ReportSummaryCardProps) {
  if (isLoading || !data) {
    return (
      <View style={[styles.section, style]}>
        <LoadingState variant="spinner" style={styles.loading} />
      </View>
    );
  }

  const metricByKey = new Map(data.metrics.map((item) => [item.metric, item]));

  return (
    <View style={[styles.section, style]}>
      <View style={styles.headerRow}>
        <View style={styles.totalBlock}>
          <Text style={styles.label}>종합 피부 점수</Text>
          <View style={styles.totalNumberRow}>
            <Text style={styles.totalNumber}>{data.totalScore}</Text>
            <DeltaText delta={data.totalDelta} style={styles.totalDelta} />
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
                <DeltaText delta={item.delta} style={styles.miniScoreDelta} />
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
        dotDates={dotDates}
        style={styles.chart}
      />
    </View>
  );
}

/**
 * ▲/▼ 증감 텍스트. 오르면 초록(safe), 내리면 빨강(caution)입니다.
 *
 * 2026-08-18 — 기존 `invert` prop을 제거했습니다. 지표 4종을 "낮을수록 좋음"으로
 * 읽던 시절엔 미니 스코어만 색을 뒤집어야 해서 필요했는데, 방향이 "높을수록 좋음"으로
 * 확정되면서 총점과 지표가 같은 규칙이 됐습니다. prop을 남겨두면 다음에 누가 `invert`를
 * 다시 켜서 한쪽만 반대가 될 여지가 있어 아예 없앴습니다.
 *
 * (MetricScoreList.DeltaBadge와 별도입니다 — 그쪽은 아이콘+"변화 없음"/"첫 기록"
 * 문구까지 포함한 다른 화면(S-18) 전용 컴포넌트라, 이 카드의 더 작고 인라인인
 * Figma 스타일(화살표+숫자만)과 재사용하기엔 서로 안 맞았습니다).
 *
 * ⚠️ 여기는 주아체를 쓰지 않습니다 — 숫자가 작고 화살표와 세로 정렬을 맞춰야 해서
 * 본문 글꼴을 그대로 둡니다(관리자 결정, 2026-08-17 세션 12).
 */
function DeltaText({
  delta,
  style,
}: {
  delta: number | null;
  style?: StyleProp<ViewStyle>;
}) {
  if (delta === null || delta === 0) {
    return (
      <View style={[styles.deltaRow, style]}>
        <IconMinus size={10} color={color.textSub} />
      </View>
    );
  }
  const isUp = delta > 0;
  const deltaColor = isUp ? reportColor.safe : reportColor.caution;
  return (
    <View style={[styles.deltaRow, style]}>
      {/* ▲/▼ 문자 → 아이콘 세트 (2026-08-17 세션 15, 관리자 요청).
          글리프가 비어 있을 위험도 함께 사라집니다. */}
      <AppIcon name={isUp ? 'arrowUp' : 'arrowDown'} size={9} color={deltaColor} />
      <Text style={[styles.deltaText, { color: deltaColor }]}>{Math.abs(delta)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingBottom: space[5],
  },
  loading: {
    minHeight: 160,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[3],
    paddingTop: space[5],
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
  // 그라데이션 제외(관리자 결정, 2026-08-17) — Figma는 라벤더→핑크 그라데이션 텍스트지만
  // MaskedView 부팅 크래시 이력이 있어 brand500 솔리드로 둡니다.
  //
  // 글꼴은 주아체 고정(관리자 결정, 2026-08-17 세션 12). weightFamily를 같이 주면
  // 안 됩니다 — 컴포넌트 상단 주석 참고.
  totalNumber: {
    fontSize: adjustFontSize(48),
    lineHeight: 56,
    ...pinDisplayFont('bmjua'),
    color: color.brand500,
  },
  totalDelta: {
    paddingBottom: 8,
  },
  miniScoreRow: {
    flexDirection: 'row',
    gap: space[3],
  },
  miniScoreCard: {
    alignItems: 'center',
  },
  miniScoreLabel: {
    fontSize: adjustFontSize(10),
    ...weightFamily('semibold'),
    color: color.textSub,
    marginBottom: 4,
  },
  miniScoreValue: {
    // 주아체 자리 — S-18 지표 카드 숫자(22px)와 같은 성격이라 글꼴을 맞춥니다
    // (관리자 요청, 2026-08-17). adjustFontSize를 쓰지 않는 건 typography.ts 규약이고,
    // 여기서는 4개가 가로로 나란히 놓여서 하나만 커지면 열이 어긋나기도 합니다.
    fontSize: 22,
    lineHeight: 30,
    ...pinDisplayFont('bmjua'),
  },
  miniScoreDelta: {
    marginTop: 2,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // 화살표 아이콘과 숫자 사이. 예전엔 '▲ 3'처럼 문자열 안의 공백이 이 간격을
    // 만들었는데, 아이콘으로 바뀌면서 직접 줘야 합니다.
    gap: 2,
  },
  deltaText: {
    fontSize: adjustFontSize(10),
    ...weightFamily('semibold'),
  },
  chart: {
    marginTop: space[4],
  },
});
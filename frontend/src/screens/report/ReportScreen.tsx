// ReportScreen.tsx
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueries } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Popup } from '@/components/base/Popup';
import { InsightCard } from '@/components/domain/InsightCard';
import { MetricTrendCard } from '@/components/domain/MetricTrendCard';
import { ReportSummaryCard } from '@/components/domain/ReportSummaryCard';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { useReport, getReportInsight } from '@/api/queries/report';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { useReportUiStore } from '@/store/reportUiStore';
import { DetailRoutes, DetailStackParamList, MainTabParamList, MainTabRoutes } from '@/app/routes';
import { color, reportCardShadow, reportColor, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';
import type { MetricKey, ReportPeriod, InsightDetail } from '@/types/report';

// ReportScreen은 Tabs 안에 있지만 인사이트 카드를 누르면 그 밖의(부모) Stack에 있는
// S-20으로 이동해야 합니다 — RecordHubScreen과 동일한 이유로 컴포지트 타입이 필요합니다.
type ReportNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Report'>,
  NativeStackNavigationProp<DetailStackParamList>
>;

const PERIOD_OPTIONS: { value: '7' | '30'; label: string }[] = [
  { value: '7', label: '7일' },
  { value: '30', label: '30일' },
];

/**
 * S-19 피부 리포트 (Figma 컬러 최종본 P8CmHDZp7z0dKiHByEzuLx, node 210:1829/210:2138 실측).
 *
 * 화면 구조: 연보라(#F5F2FF) 배경 위에 흰 섹션 3개가 쌓입니다 —
 *   1) 헤더 + 종합 피부 점수 + 총점 추이 그래프 (ReportSummaryCard)
 *   2) 항목별 추이 — 지표 탭 4개 + 지표별 지수·증감 + 지표색 그래프 (MetricTrendCard)
 *   3) AI 인사이트 — 구분선으로 나뉜 인사이트 행 목록 (InsightCard)
 *
 * - 기간은 7일 또는 30일. REPORT-01의 `period` 쿼리도 정확히 이 두 값만 유효해서
 *   (다른 값은 422 `REPORT_INVALID_PERIOD`) 화면 토글과 실제 요청 기간이 항상 1:1입니다.
 *   (2026-08-17 — 관리자 요청으로 14일 옵션 제거.)
 *
 * - 그래프 점(2026-08-17, 관리자 요청) — 7일 뷰는 매일 점을 찍고, 30일 뷰는 "이벤트가
 *   있는 날"만 점을 찍습니다. "이벤트"는 새로 만든 게 아니라 REPORT-02(요인 상세, S-20이
 *   이미 쓰던 `useReportInsight`)를 그대로 재사용합니다 — `data.insights`의 각 인사이트에
 *   대해 상세를 추가로 조회해서 `events[].date`를 모읍니다. 종합 점수 그래프는 모든
 *   인사이트의 이벤트를 합쳐서 쓰고, 항목별 추이 그래프는 선택된 지표(`metric`)와
 *   일치하는 인사이트의 이벤트만 걸러 씁니다. 쿼리 키(`['reportInsight', insightId]`)가
 *   S-20과 동일해서 인사이트 카드를 눌러 들어가면 캐시를 그대로 씁니다.
 *
 * - REPORT_DATA_INSUFFICIENT(409)는 types/errorCodes.ts의 EMPTY_STATE_CODES에 이미
 *   속한 코드입니다(빨간 에러 UI 금지 — 신규 사용자의 "정상" 상태). 그래서 ErrorState가
 *   아니라 EmptyState + Popup 조합으로 안내합니다: 이 화면에 머무는 동안 Popup을 딱
 *   한 번만 띄우고(reportUiStore), 닫으면 뒤에 EmptyState가 남아 화면이 비어 보이지
 *   않게 합니다. 문구는 기획 확정 전 placeholder입니다.
 */
export function ReportScreen() {
  const navigation = useNavigation<ReportNavigationProp>();
  const insets = useSafeAreaInsets();

  const [periodOption, setPeriodOption] = useState<'7' | '30'>('7');
  const period: ReportPeriod = Number(periodOption) as ReportPeriod;
  const [metric, setMetric] = useState<MetricKey>('trouble');

  const insufficientPopupSeen = useReportUiStore((state) => state.insufficientPopupSeen);
  const markInsufficientPopupSeen = useReportUiStore((state) => state.markInsufficientPopupSeen);

  const { data, isLoading, isError, error, refetch } = useReport(period, metric);
  const displayedGraph = useMemo(() => data?.graph ?? [], [data]);
  const displayedSummary = data?.summary;
  const selectedMetricSummary = displayedSummary?.metrics.find((item) => item.metric === metric);

  // 그래프 점 — REPORT-02(useReportInsight)를 재사용해 이벤트 날짜를 모읍니다.
  // useQueries를 쓰는 이유: 인사이트가 몇 개인지 미리 알 수 없어서 훅을 반복문 안에서
  // 호출할 수 없습니다(Rules of Hooks) — queryKey는 useReportInsight와 완전히 동일하게
  // 맞춰서 캐시를 공유합니다.
  const insightIds = data?.insights.map((insight) => insight.insightId) ?? [];
  const insightDetailQueries = useQueries({
    queries: insightIds.map((insightId) => ({
      queryKey: ['reportInsight', insightId],
      queryFn: () => getReportInsight(insightId),
    })),
  });
  const insightDetails = insightDetailQueries
    .map((q) => q.data)
    .filter((detail): detail is InsightDetail => detail !== undefined);

  // 표시 중인 그래프 시작일 이전 이벤트는 화면 밖 데이터라 제외합니다.
  const earliestVisibleDate = data?.graph[0]?.date;

  const allEventDates = useMemo(() => {
    const set = new Set<string>();
    insightDetails.forEach((detail) =>
      detail.events.forEach((event) => {
        if (!earliestVisibleDate || event.date >= earliestVisibleDate) set.add(event.date);
      })
    );
    return Array.from(set);
  }, [insightDetails, earliestVisibleDate]);

  const metricEventDates = useMemo(() => {
    const set = new Set<string>();
    insightDetails
      .filter((detail) => detail.metric === metric)
      .forEach((detail) =>
        detail.events.forEach((event) => {
          if (!earliestVisibleDate || event.date >= earliestVisibleDate) set.add(event.date);
        })
      );
    return Array.from(set);
  }, [insightDetails, metric, earliestVisibleDate]);

  // 7일 뷰는 매일 점, 30일 뷰는 이벤트가 있는 날만 점(관리자 요청, 2026-08-17).
  const summaryDotDates =
    period === 7 ? (displayedSummary?.graph.map((p) => p.date) ?? []) : allEventDates;
  const trendDotDates = period === 7 ? displayedGraph.map((p) => p.date) : metricEventDates;

  const isDataInsufficient = error instanceof ApiError && error.code === ErrorCode.REPORT_DATA_INSUFFICIENT;
  const showPopup = isDataInsufficient && !insufficientPopupSeen;

  const handleGoToRecordHub = () => {
    markInsufficientPopupSeen();
    navigation.navigate(MainTabRoutes.RecordHub);
  };

  const handleOpenInsight = (insightId: number) => {
    navigation.navigate(DetailRoutes.MetricDetail, { insightId });
  };

  const header = (
    <View style={[styles.headerSection, { paddingTop: insets.top + space[3] }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>리포트</Text>
        <View style={styles.periodTrack}>
          {PERIOD_OPTIONS.map((option) => {
            const selected = option.value === periodOption;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setPeriodOption(option.value)}
                style={[styles.periodPill, selected && styles.periodPillSelected]}
              >
                <Text style={[styles.periodLabel, selected && styles.periodLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {header}
        <LoadingState variant="spinner" style={styles.centerFill} />
      </View>
    );
  }

  // REPORT_DATA_INSUFFICIENT 외의 진짜 오류(네트워크·서버)만 ErrorState로 처리합니다.
  if (isError && !isDataInsufficient) {
    return (
      <View style={styles.container}>
        {header}
        <ErrorState variant="network" onRetry={() => refetch()} style={styles.centerFill} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {header}

        <ReportSummaryCard
          data={displayedSummary}
          isLoading={isLoading}
          period={period}
          dotDates={summaryDotDates}
        />

        {isDataInsufficient ? (
          <View style={styles.whiteSection}>
            <EmptyState
              icon="navReport"
              title="아직 리포트를 만들 수 없어요"
              description="피부 기록이 조금 더 쌓이면 리포트를 확인할 수 있어요."
              actionLabel="기록하러 가기"
              onAction={handleGoToRecordHub}
            />
          </View>
        ) : (
          data && (
            <>
              <View style={styles.sectionGap} />
              <MetricTrendCard
                metric={metric}
                onChangeMetric={setMetric}
                graph={displayedGraph}
                score={selectedMetricSummary?.score}
                delta={selectedMetricSummary?.delta}
                period={period}
                dotDates={trendDotDates}
              />

              <View style={styles.sectionGap} />
              <View style={styles.whiteSection}>
                <Text style={styles.sectionTitle}>AI 인사이트</Text>
                {data.insights.length > 0 ? (
                  <View style={styles.insightList}>
                    {data.insights.map((insight, index) => (
                      <View key={insight.insightId}>
                        <InsightCard
                          insight={insight}
                          onPress={() => handleOpenInsight(insight.insightId)}
                        />
                        {index < data.insights.length - 1 && <View style={styles.insightDivider} />}
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    icon="tip"
                    title="아직 발견된 인사이트가 없어요"
                    description="기록이 더 쌓이면 성분·환경별 패턴을 알려드려요."
                  />
                )}
              </View>
            </>
          )
        )}
      </ScrollView>

      <Popup
        visible={showPopup}
        title="아직 리포트를 만들 수 없어요"
        description="피부 기록이 조금 더 쌓이면 리포트를 확인할 수 있어요."
        primaryLabel="기록하러 가기"
        onPrimaryPress={handleGoToRecordHub}
        secondaryLabel="닫기"
        onSecondaryPress={markInsufficientPopupSeen}
        onRequestClose={markInsufficientPopupSeen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Figma 배경 — 흰 섹션들이 이 연보라 위에 블록으로 쌓입니다.
    backgroundColor: color.surfaceLavenderPale,
  },
  centerFill: {
    flex: 1,
  },
  // 스크롤 영역 자체는 흰색입니다 — 마지막 섹션(AI 인사이트) 아래로 스크롤이 남을 때
  // 연보라 배경이 빈 띠처럼 보이던 문제를 없앱니다(관리자 제보, 2026-08-17).
  // 섹션 사이 연보라 띠는 sectionGap이 직접 칠합니다.
  scroll: {
    backgroundColor: color.bg,
  },
  content: {
    flexGrow: 1,
    backgroundColor: color.bg,
  },
  headerSection: {
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingBottom: space[1],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  title: {
    fontSize: adjustFontSize(20),
    lineHeight: 30,
    ...weightFamily('bold'),
    color: color.textInk,
    flexShrink: 1,
  },
  periodTrack: {
    flexDirection: 'row',
    backgroundColor: color.surfaceLavenderPale,
    borderRadius: 999,
    padding: 2,
  },
  periodPill: {
    paddingHorizontal: space[4],
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillSelected: {
    backgroundColor: color.bg,
    ...reportCardShadow.soft,
  },
  periodLabel: {
    fontSize: adjustFontSize(12.5),
    ...weightFamily('semibold'),
    color: color.textSub,
  },
  periodLabelSelected: {
    color: reportColor.purpleDeep,
  },
  // 흰 섹션 사이 연보라 띠 (Figma 210:1950 — 12px).
  sectionGap: {
    height: 12,
    backgroundColor: color.surfaceLavenderPale,
  },
  whiteSection: {
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[6],
  },
  sectionTitle: {
    fontSize: adjustFontSize(14),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  insightList: {
    marginTop: space[2],
  },
  insightDivider: {
    height: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
});

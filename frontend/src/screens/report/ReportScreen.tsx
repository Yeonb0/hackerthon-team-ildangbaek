// ReportScreen.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { Chip } from '@/components/base/Chip';
import { Popup } from '@/components/base/Popup';
import { TrendGraph } from '@/components/chart/TrendGraph';
import { InsightCard } from '@/components/domain/InsightCard';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { useReport } from '@/api/queries/report';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { useReportUiStore } from '@/store/reportUiStore';
import { DetailRoutes, DetailStackParamList, MainTabParamList, MainTabRoutes } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { MetricKey, ReportPeriod } from '@/types/report';

// ReportScreen은 Tabs 안에 있지만 인사이트 카드를 누르면 그 밖의(부모) Stack에 있는
// S-20으로 이동해야 합니다 — RecordHubScreen과 동일한 이유로 컴포지트 타입이 필요합니다.
type ReportNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Report'>,
  NativeStackNavigationProp<DetailStackParamList>
>;

const METRIC_TABS: { key: MetricKey; label: string }[] = [
  { key: 'trouble', label: '트러블' },
  { key: 'redness', label: '홍조' },
  { key: 'pores', label: '모공' },
  { key: 'pigmentation', label: '색소침착' },
];

/**
 * S-19 피부 리포트.
 *
 * ⚠️ 로드맵 Phase 6 원안은 레이더 차트였지만, 실제 REPORT-01 응답은 "지표 하나(metric)를
 * 골라 기간별 추이"를 주는 구조라 레이더에 필요한 데이터를 받을 수 없습니다(관리자
 * 확인, 2026-08-10). 그래서 기간 토글(7/14/30) + 지표 탭 4개 + 추이 그래프 + 인사이트
 * 카드 목록으로 구현합니다. RadarChart는 카탈로그에만 등록돼 있습니다.
 *
 * - 추이 그래프는 선(line)으로 그립니다. REPORT-01 명세의 기본값은 막대지만 관리자님
 *   요청(2026-08-10)으로 선으로 바꿨습니다 — TrendGraph 컴포넌트가 둘 다 지원해서
 *   variant prop만 바꾸면 됩니다.
 * - ⚠️ 밤/낮(모닝/나이트)을 구분해서 표시하는 건 아직 못 합니다. REPORT-01의 graph는
 *   하루당 점수 하나만 내려주고(TBD-12 "나이트 우선, 없으면 모닝" 대표값 산출 —
 *   명세서에 "서버 내부 로직 · 응답 구조 영향 없음"이라고 명시돼 있어 프론트가 모닝/
 *   나이트를 구분해서 받을 방법이 없음), 이 부분은 백엔드 응답 구조 확장 확인 후
 *   진행하기로 했습니다(관리자 확인, 2026-08-10 — 아래 "지금 바로 요청해야 할 것"
 *   블로커에 추가 예정).
 *
 * - REPORT_DATA_INSUFFICIENT(409)는 types/errorCodes.ts의 EMPTY_STATE_CODES에 이미
 *   속한 코드입니다(빨간 에러 UI 금지 — 신규 사용자의 "정상" 상태). 그래서 ErrorState가
 *   아니라 EmptyState + Popup 조합으로 안내합니다: 이 화면에 머무는 동안 Popup을 딱
 *   한 번만 띄우고(reportUiStore — 기간·지표 조합별로 따로 기억하면 탭을 바꿀 때마다
 *   다시 떠서 관리자님 확인 후 전역 1회로 바꿨습니다, 2026-08-10), 닫으면 뒤에
 *   EmptyState가 남아 화면이 비어 보이지 않게 합니다. 문구는 기획 확정 전 placeholder입니다.
 *
 * - 기간은 7/14/30일 중 고를 수 있습니다(관리자님 요청, 2026-08-10). 그런데 REPORT-01의
 *   `period` 쿼리는 **7 또는 30만 유효**합니다(다른 값은 422 `REPORT_INVALID_PERIOD`) —
 *   그래서 14일을 고르면 서버엔 30일치를 요청하고, 받은 `graph`에서 최근 14일만
 *   `slice(-14)`로 잘라 보여줍니다. 백엔드 응답 구조 변경이 필요 없는 방식이라 바로
 *   구현했습니다. 다만 `insights`는 실제 요청한 기간(7 또는 30) 기준 그대로라, 14일
 *   화면에서도 30일 분석 기준 인사이트가 그대로 보일 수 있습니다 — 인사이트 자체는
 *   날짜가 찍힌 데이터가 아니라 걸러낼 기준이 없어서 그렇습니다.
 */
export function ReportScreen() {
  const navigation = useNavigation<ReportNavigationProp>();
  const insets = useSafeAreaInsets();

  // SegmentToggle은 T extends string만 받아서(base 컴포넌트 공용 제약), 기간은
  // 문자열로 들고 있다가 쓸 때 숫자로 바꿉니다.
  const [periodOption, setPeriodOption] = useState<'7' | '14' | '30'>('7');
  const displayPeriod = Number(periodOption) as 7 | 14 | 30;
  // REPORT-01의 period 파라미터는 7 또는 30만 유효합니다 — 14일을 고르면 서버엔
  // 30일치를 요청하고 아래에서 최근 14일만 잘라서 보여줍니다.
  const callPeriod: ReportPeriod = displayPeriod === 7 ? 7 : 30;
  const [metric, setMetric] = useState<MetricKey>('trouble');

  const insufficientPopupSeen = useReportUiStore((state) => state.insufficientPopupSeen);
  const markInsufficientPopupSeen = useReportUiStore((state) => state.markInsufficientPopupSeen);

  const { data, isLoading, isError, error, refetch } = useReport(callPeriod, metric);
  const displayedGraph = data ? data.graph.slice(-displayPeriod) : [];

  const isDataInsufficient = error instanceof ApiError && error.code === ErrorCode.REPORT_DATA_INSUFFICIENT;
  const showPopup = isDataInsufficient && !insufficientPopupSeen;

  const handleGoToRecordHub = () => {
    markInsufficientPopupSeen();
    navigation.navigate(MainTabRoutes.RecordHub);
  };

  const handleOpenInsight = (insightId: number) => {
    navigation.navigate(DetailRoutes.MetricDetail, { insightId });
  };

  if (isLoading) {
    return <LoadingState variant="spinner" style={styles.centerFill} />;
  }

  // REPORT_DATA_INSUFFICIENT 외의 진짜 오류(네트워크·서버)만 ErrorState로 처리합니다.
  if (isError && !isDataInsufficient) {
    return <ErrorState variant="network" onRetry={() => refetch()} style={styles.centerFill} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + space[5] }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>피부 리포트</Text>

        <SegmentToggle
          options={[
            { value: '7', label: '7일' },
            { value: '14', label: '14일' },
            { value: '30', label: '30일' },
          ]}
          value={periodOption}
          onChange={setPeriodOption}
        />

        <View style={styles.metricRow}>
          {METRIC_TABS.map((tab) => (
            <Chip
              key={tab.key}
              label={tab.label}
              selected={metric === tab.key}
              onPress={() => setMetric(tab.key)}
            />
          ))}
        </View>

        {isDataInsufficient ? (
          <EmptyState
            icon="navReport"
            title="아직 리포트를 만들 수 없어요"
            description="피부 기록이 조금 더 쌓이면 리포트를 확인할 수 있어요."
            actionLabel="기록하러 가기"
            onAction={handleGoToRecordHub}
          />
        ) : (
          data && (
            <>
              <TrendGraph points={displayedGraph} variant="line" style={styles.graph} />

              {data.insights.length > 0 ? (
                <View style={styles.insightList}>
                  <Text style={styles.sectionTitle}>인사이트</Text>
                  {data.insights.map((insight) => (
                    <InsightCard
                      key={insight.insightId}
                      insight={insight}
                      onPress={() => handleOpenInsight(insight.insightId)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="tip"
                  title="아직 발견된 인사이트가 없어요"
                  description="기록이 더 쌓이면 성분·환경별 패턴을 알려드려요."
                />
              )}
            </>
          )
        )}
      </ScrollView>

      <Popup
        visible={showPopup}
        title="아직 리포트를 만들 수 없어요"
        description="피부 기록이 조금 더 쌓이면 리포트를 확인할 수 있어요. (문구 확정 전 placeholder)"
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
    backgroundColor: color.bg,
  },
  centerFill: {
    flex: 1,
  },
  content: {
    padding: space[5],
    paddingBottom: space[8],
    gap: space[4],
  },
  title: {
    ...typography.display,
    color: color.ink900,
  },
  metricRow: {
    flexDirection: 'row',
    gap: space[2],
    flexWrap: 'wrap',
  },
  graph: {
    marginTop: space[2],
  },
  insightList: {
    gap: space[3],
    marginTop: space[2],
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
  },
});

// MetricDetailScreen.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/base/Card';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { TrendGraph } from '@/components/chart/TrendGraph';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { useReportInsight } from '@/api/queries/report';
import { DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';

const TYPE_LABEL: Record<'INGREDIENT' | 'ENVIRONMENT', string> = {
  INGREDIENT: '성분 요인',
  ENVIRONMENT: '환경 요인',
};

/**
 * S-20 요인 상세. REPORT-02(GET /reports/insights/{insightId}) 기준.
 * S-19에서 인사이트 카드를 눌러 들어옵니다. 뒤로가기는 이 코드베이스의 다른
 * push형 상세 화면들(PhotoGuideScreen 등)과 동일하게 OS 기본 제스처/뒤로가기
 * 버튼에 맡기고, 화면 안에 별도 뒤로가기 버튼은 두지 않았습니다 (headerShown: false
 * 정책이지만 이 프로젝트에서 그 경우 항상 그래왔던 방식).
 *
 * 추이 그래프는 S-19와 동일하게 선(line)을 씁니다(관리자님 요청, 2026-08-10).
 * 이벤트 목록(BR — "추이 그래프 + 주요 이벤트 목록")은 날짜순으로 그대로 나열합니다.
 * confidence가 OBSERVING인 이벤트는 InsightCard와 같은 규칙으로 "확인 중" 배지를 달아
 * 단정적 문구가 아님을 알립니다.
 *
 * 기간은 7/14/30일 중 고를 수 있습니다. REPORT-02엔 애초에 period 쿼리 파라미터가
 * 없어서(S-19의 REPORT-01과 다름 — TBD-11 참고) 서버 요청은 항상 그대로 한 번만 하고,
 * 응답으로 받은 전체 graph/events에서 화면단에서 최근 N일만 잘라 보여줍니다. 이벤트도
 * 그래프에 안 보이는 오래된 항목은 같이 숨겨서 "이 기간 동안의 이벤트"로 보이게
 * 맞췄습니다.
 */
export function MetricDetailScreen() {
  const route = useRoute<RouteProp<DetailStackParamList, 'MetricDetail'>>();
  const insets = useSafeAreaInsets();

  // SegmentToggle은 T extends string만 받아서(base 컴포넌트 공용 제약), 기간은
  // 문자열로 들고 있다가 쓸 때 숫자로 바꿉니다. 기본값 30은 서버가 원래 내려주던
  // "최근 30일" 범위와 맞춥니다.
  const [periodOption, setPeriodOption] = useState<'7' | '14' | '30'>('30');
  const displayPeriod = Number(periodOption) as 7 | 14 | 30;

  const { data, isLoading, isError, refetch } = useReportInsight(route.params.insightId);

  if (isLoading) {
    return <LoadingState variant="spinner" style={styles.centerFill} />;
  }

  if (isError || !data) {
    return <ErrorState variant="network" onRetry={() => refetch()} style={styles.centerFill} />;
  }

  const displayedGraph = data.graph.slice(-displayPeriod);
  const earliestVisibleDate = displayedGraph[0]?.date;
  const visibleEvents = earliestVisibleDate
    ? data.events.filter((event) => event.date >= earliestVisibleDate)
    : data.events;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space[5] }]}
    >
      <Text style={styles.eyebrow}>{TYPE_LABEL[data.type]}</Text>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.subtitle}>{data.subtitle}</Text>

      <SegmentToggle
        options={[
          { value: '7', label: '7일' },
          { value: '14', label: '14일' },
          { value: '30', label: '30일' },
        ]}
        value={periodOption}
        onChange={setPeriodOption}
        style={styles.periodToggle}
      />

      <Card padding={4} style={styles.graphCard}>
        <TrendGraph points={displayedGraph} variant="line" />
      </Card>

      <Text style={styles.sectionTitle}>주요 이벤트</Text>

      {visibleEvents.length > 0 ? (
        <View style={styles.eventList}>
          {visibleEvents.map((event, index) => (
            <View key={`${event.date}-${index}`} style={styles.eventRow}>
              <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
              <View style={styles.eventBody}>
                <View style={styles.eventLabelRow}>
                  <Text style={styles.eventLabel}>{event.label}</Text>
                  {event.confidence === 'OBSERVING' && (
                    <View style={styles.observingBadge}>
                      <Text style={styles.observingText}>확인 중</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.eventImpact}>{event.impact}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="아직 눈에 띄는 이벤트가 없어요"
          description="기록이 더 쌓이면 관련 이벤트를 찾아드려요."
        />
      )}
    </ScrollView>
  );
}

function formatEventDate(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
  },
  content: {
    padding: space[5],
    paddingBottom: space[8],
    gap: space[3],
    backgroundColor: color.bg,
    flexGrow: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: color.brand700,
  },
  title: {
    ...typography.display,
    color: color.ink900,
  },
  subtitle: {
    ...typography.body,
    color: color.ink600,
  },
  graphCard: {
    marginTop: space[3],
  },
  periodToggle: {
    marginTop: space[2],
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
    marginTop: space[4],
  },
  eventList: {
    gap: space[4],
  },
  eventRow: {
    flexDirection: 'row',
    gap: space[3],
  },
  eventDate: {
    ...typography.caption,
    color: color.ink600,
    width: 44,
  },
  eventBody: {
    flex: 1,
    gap: space[1],
  },
  eventLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  eventLabel: {
    ...typography.body,
    fontWeight: '600',
    color: color.ink900,
  },
  eventImpact: {
    ...typography.body,
    color: color.ink600,
  },
  observingBadge: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: color.ink300,
  },
  observingText: {
    fontSize: 11,
    fontWeight: '600',
    color: color.ink900,
  },
});

// MetricDetailScreen.tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { EventBandChart } from '@/components/chart/EventBandChart';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { IconBack } from '@/components/icons';
import { useReportInsight } from '@/api/queries/report';
import { DetailStackParamList } from '@/app/routes';
import {
  color,
  gradient,
  gradientDirection,
  metricAccent,
  reportCardShadow,
  reportColor,
  space,
} from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';
import type { InsightDetail, InsightEvent, MetricKey } from '@/types/report';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const METRIC_INDEX_LABEL: Record<MetricKey, string> = {
  trouble: '트러블 지수',
  redness: '홍조 지수',
  pigmentation: '색소잡티 지수',
  pores: '모공 지수',
};

/**
 * S-20 요인 상세 (Figma 컬러 최종본 P8CmHDZp7z0dKiHByEzuLx, node 281:801/281:922 실측).
 * REPORT-02(GET /reports/insights/{insightId}) 기준. S-19에서 인사이트 행을 눌러 들어옵니다.
 *
 * 화면 구조: 흰 헤더(뒤로가기 + 요인명 + "…수치와의 상관관계" + 기간 변화 배지) 위에
 * 연보라 배경, 그 위에 카드 3개 —
 *   1) "{지표} 추이 (최근 N일)" + 평균/현재 + 이벤트 밴드 차트 + 범례
 *   2) AI 분석 요약 (연보라→연핑크 그라데이션 카드)
 *   3) 상관 이벤트 (아이콘 + 날짜·라벨 + impact + 변화량 배지)
 *
 * ⚠️ 데이터 출처 메모 — REPORT-02 응답엔 아래 값들이 없어서 클라이언트에서 파생합니다
 * (관리자 결정, 2026-08-17: 계산·파싱 가능한 건 채우고 관리 팁만 백엔드 요청):
 *   - 기간 변화(+3) / 평균 / 현재 → `graph`에서 직접 계산합니다.
 *   - 이벤트 배지(+16, 안정) → `impact` 문장 끝의 부호 있는 숫자를 파싱합니다
 *     ("사용 2일 뒤 트러블 수치 +16" → "+16"). 숫자가 없으면(OBSERVING 등 단정하지
 *     않는 문구) confidence로 "안정"/"확인 중"을 대신 씁니다.
 *   - 이벤트 아이콘(🧴/✅) → 배지가 숫자면 성분/노출 이벤트(🧴), 아니면 안정 구간(✅)으로
 *     근사합니다. 원본 필드가 없어 정확한 구분은 아닙니다.
 *   - 💡 관리 팁 → 파싱·계산 어느 쪽으로도 만들 수 없는 완전 신규 텍스트라 REPORT-02엔
 *     아직 필드가 없습니다. 지금은 목업(api/mock/report.ts)만 `tip` 값을 채우고,
 *     값이 없으면(실서버) 섹션 자체가 사라집니다. 백엔드 필드 추가 요청:
 *     docs/backend-request-report02-detail-fields.md
 */
export function MetricDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'MetricDetail'>>();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useReportInsight(route.params.insightId);

  const navBar = (
    <View style={[styles.nav, { paddingTop: insets.top + space[3] }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        hitSlop={8}
        style={styles.navBackButton}
      >
        <IconBack size={18} color={color.textSub} />
      </Pressable>
      <Text style={styles.navTitle}>요인 자세히 보기</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.headerSection}>{navBar}</View>
        <LoadingState variant="spinner" style={styles.centerFill} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.screen}>
        <View style={styles.headerSection}>{navBar}</View>
        <ErrorState variant="network" onRetry={() => refetch()} style={styles.centerFill} />
      </View>
    );
  }

  const accent = metricAccent[data.metric];
  const stats = deriveStats(data);
  // Figma 헤더 배지 — 값이 오르면 caution(빨강), 내리면 safe(초록). 지표 4종은
  // "낮을수록 좋음"이라 상승이 나쁜 방향입니다.
  const changeUp = stats.change !== null && stats.change > 0;
  const changeAccent = changeUp ? reportColor.caution : reportColor.safe;

  const eventDates = data.events.map((event) => event.date);
  const points = data.graph.map((point) => ({
    date: point.date,
    score: point.nightScore ?? point.morningScore,
  }));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          {navBar}
          <View style={styles.headerBody}>
            <View style={styles.headerTitleBlock}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerEmoji}>{data.type === 'ENVIRONMENT' ? '☀️' : '⚠️'}</Text>
                <Text style={styles.headerTitle}>{data.title}</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                {METRIC_INDEX_LABEL[data.metric].replace(' 지수', '')} 수치와의 상관관계
              </Text>
            </View>
            {stats.change !== null && (
              <View style={[styles.changeBadge, { backgroundColor: tint(changeAccent) }]}>
                <Text style={[styles.changeBadgeLabel, { color: changeAccent }]}>
                  {stats.dayCount}일 변화
                </Text>
                <Text style={[styles.changeBadgeValue, { color: changeAccent }]}>
                  {stats.change > 0 ? '+' : ''}
                  {stats.change}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 1) 추이 차트 카드 */}
        <View style={styles.cardWrap}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>
                {METRIC_INDEX_LABEL[data.metric]} 추이 (최근 {stats.dayCount}일)
              </Text>
              <View style={styles.chartStats}>
                {stats.average !== null && (
                  <Text style={styles.chartStatText}>
                    평균 <Text style={{ color: accent }}>{stats.average}</Text>
                  </Text>
                )}
                {stats.current !== null && (
                  <Text style={styles.chartStatText}>
                    현재 <Text style={{ color: accent }}>{stats.current}</Text>
                  </Text>
                )}
              </View>
            </View>

            <EventBandChart
              points={points}
              accentColor={accent}
              eventDates={eventDates}
              style={styles.chart}
            />

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: accent }]} />
                <Text style={styles.legendText}>{METRIC_INDEX_LABEL[data.metric]}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: accent, opacity: 0.35 }]} />
                <Text style={styles.legendText}>{data.title} 발생일</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2) AI 분석 요약 */}
        <View style={styles.cardWrap}>
          <LinearGradient
            colors={gradient.iconBoxSoft}
            start={gradientDirection.badge.start}
            end={gradientDirection.badge.end}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>AI 분석 요약</Text>
            <Text style={styles.summaryText}>{data.subtitle}</Text>
          </LinearGradient>
        </View>

        {/* 3) 상관 이벤트 */}
        <View style={styles.cardWrap}>
          <View style={styles.eventCard}>
            <Text style={styles.eventCardTitle}>상관 이벤트</Text>
            {data.events.length > 0 ? (
              <View style={styles.eventList}>
                {data.events.map((event, index) => (
                  <EventRow
                    key={`${event.date}-${index}`}
                    event={event}
                    isLast={index === data.events.length - 1}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="calendar"
                title="아직 눈에 띄는 이벤트가 없어요"
                description="기록이 더 쌓이면 관련 이벤트를 찾아드려요."
              />
            )}
          </View>
        </View>
        {/* 4) 관리 팁 — REPORT-02에 필드가 없어서 값이 있을 때만(현재는 목업) 그립니다.
            실서버 연동 시 undefined로 와서 섹션이 자동으로 사라집니다. */}
        {data.tip ? (
          <View style={styles.cardWrap}>
            <View style={styles.tipCard}>
              <Text style={styles.tipLabel}>💡 관리 팁</Text>
              <Text style={styles.tipText}>{data.tip}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EventRow({ event, isLast }: { event: InsightEvent; isLast: boolean }) {
  const badge = deriveEventBadge(event);
  const badgeAccent = badge.isIncrease ? reportColor.caution : reportColor.safe;
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventIconColumn}>
        <View style={[styles.eventIconBox, { backgroundColor: tint(badgeAccent) }]}>
          <Text style={styles.eventIcon}>{badge.isIncrease ? '🧴' : '✅'}</Text>
        </View>
        {!isLast && <View style={styles.eventConnector} />}
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventLabel}>
          {formatEventDate(event.date)} — {event.label}
        </Text>
        <Text style={styles.eventImpact}>{event.impact}</Text>
      </View>
      <View style={[styles.eventBadge, { backgroundColor: tint(badgeAccent) }]}>
        <Text style={[styles.eventBadgeText, { color: badgeAccent }]}>{badge.text}</Text>
      </View>
    </View>
  );
}

/**
 * graph에서 기간 변화·평균·현재를 계산합니다(REPORT-02에 해당 필드가 없어서 —
 * 화면 주석의 "데이터 출처 메모" 참고). 결측(null) 슬롯은 계산에서 빼고, 유효한
 * 값이 2개 미만이면 change를 null로 둬서 배지를 아예 숨깁니다.
 */
function deriveStats(detail: InsightDetail): {
  dayCount: number;
  average: number | null;
  current: number | null;
  change: number | null;
} {
  const scores = detail.graph
    .map((point) => point.nightScore ?? point.morningScore)
    .filter((score): score is number => score !== null);

  if (scores.length === 0) {
    return { dayCount: detail.graph.length, average: null, current: null, change: null };
  }
  const average = Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
  const current = scores[scores.length - 1];
  const change = scores.length >= 2 ? current - scores[0] : null;
  return { dayCount: detail.graph.length, average, current, change };
}

/**
 * 이벤트 배지 — impact 문장 끝의 부호 있는 숫자를 파싱합니다
 * ("사용 2일 뒤 트러블 수치 +16" → "+16"). 숫자가 없으면 confidence로 대체합니다.
 * ⚠️ 원본 필드가 아니라 문구 파싱이라 백엔드가 문장 형식을 바꾸면 깨집니다 —
 * 필드 추가 요청은 docs/backend-request-report02-detail-fields.md 참고.
 */
function deriveEventBadge(event: InsightEvent): { text: string; isIncrease: boolean } {
  const match = event.impact.match(/([+-]\s?\d+)(?!.*\d)/);
  if (match) {
    const normalized = match[1].replace(/\s/g, '');
    return { text: normalized, isIncrease: normalized.startsWith('+') };
  }
  return {
    text: event.confidence === 'OBSERVED' ? '안정' : '확인 중',
    isIncrease: false,
  };
}

function formatEventDate(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

/** Figma는 배지·아이콘 박스 배경을 accent의 옅은 알파로 씁니다. */
function tint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
  centerFill: {
    flex: 1,
  },
  content: {
    paddingBottom: space[8],
  },
  headerSection: {
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingBottom: space[5],
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  navBackButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: adjustFontSize(12),
    ...weightFamily('semibold'),
    color: color.textSub,
  },
  headerBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[3],
    paddingTop: space[5],
  },
  headerTitleBlock: {
    flex: 1,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  headerEmoji: {
    fontSize: adjustFontSize(18),
  },
  headerTitle: {
    fontSize: adjustFontSize(20),
    lineHeight: 30,
    ...weightFamily('bold'),
    color: color.textInk,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  changeBadge: {
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: 14,
  },
  changeBadgeLabel: {
    fontSize: adjustFontSize(11),
    ...weightFamily('semibold'),
    marginBottom: 2,
  },
  changeBadgeValue: {
    fontSize: adjustFontSize(20),
    lineHeight: 26,
    ...weightFamily('bold'),
  },
  cardWrap: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
  },
  chartCard: {
    backgroundColor: color.bg,
    borderRadius: 22,
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[4],
    ...reportCardShadow.strong,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  chartTitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('bold'),
    color: color.textInk,
    flexShrink: 1,
  },
  chartStats: {
    flexDirection: 'row',
    gap: space[3],
  },
  chartStatText: {
    fontSize: adjustFontSize(11),
    ...weightFamily('semibold'),
    color: color.textSub,
  },
  chart: {
    marginTop: space[3],
  },
  legendRow: {
    flexDirection: 'row',
    gap: space[4],
    marginTop: space[3],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.surfaceLavenderPale,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  summaryCard: {
    borderRadius: 18,
    padding: space[4],
  },
  summaryLabel: {
    fontSize: adjustFontSize(11),
    ...weightFamily('bold'),
    color: color.brand500,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: adjustFontSize(13),
    lineHeight: 18,
    ...weightFamily('semibold'),
    color: color.textInk,
  },
  eventCard: {
    backgroundColor: color.bg,
    borderRadius: 22,
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[4],
    ...reportCardShadow.soft,
  },
  eventCardTitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  eventList: {
    marginTop: space[4],
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingVertical: 14,
  },
  eventIconColumn: {
    alignItems: 'center',
  },
  eventIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIcon: {
    fontSize: adjustFontSize(16),
  },
  eventConnector: {
    width: 1,
    height: 16,
    marginTop: 6,
    backgroundColor: color.borderDividerFaint,
  },
  eventBody: {
    flex: 1,
    gap: 2,
  },
  eventLabel: {
    fontSize: adjustFontSize(13),
    lineHeight: 19,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  eventImpact: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  eventBadgeText: {
    fontSize: adjustFontSize(12),
    ...weightFamily('bold'),
  },
  tipCard: {
    backgroundColor: color.bg,
    borderRadius: 18,
    paddingHorizontal: space[5],
    paddingVertical: space[4],
    ...reportCardShadow.soft,
  },
  tipLabel: {
    fontSize: adjustFontSize(11),
    ...weightFamily('bold'),
    color: color.brand500,
    marginBottom: 8,
  },
  tipText: {
    fontSize: adjustFontSize(13),
    lineHeight: 21,
    ...weightFamily('medium'),
    color: color.textInk,
  },
});

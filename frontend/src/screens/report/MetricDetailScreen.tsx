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
import { AppIcon, AppIconName, IconBack } from '@/components/icons';
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
import type { InsightDetail, InsightEvent, InsightEventKind, MetricKey } from '@/types/report';

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
 *   1) "{지표} 추이 (최근 N일)" + subtitle 메타 줄 + 평균/현재 + 이벤트 밴드 차트 + 범례
 *   2) AI 분석 요약 (연보라→연핑크 그라데이션 카드, `summary`가 있을 때만)
 *   3) 상관 이벤트 (아이콘 + 날짜·라벨 + impact + 변화량 배지)
 *   4) 관리 팁 (`tip`이 있을 때만)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-08-17(세션 12) — 백엔드가 ADR 0027·0028로 필드를 추가해서 **클라이언트 파싱을
 * 전부 제거**했습니다. 세션 11의 임시 로직과 달라진 점:
 *
 *   - 이벤트 배지 → `event.delta`(부호 있는 정수)를 그대로 씁니다. 예전엔 `impact`
 *     문장 끝의 숫자를 정규식으로 뽑았는데, 백엔드가 문구를 바꾸면 깨지는 구조였습니다.
 *     `delta`는 `impact`와 **같은 판정을 공유**해서(REPORT-02 BR7) 문구가 "확인 중"인데
 *     배지에 수치가 뜨는 조합이 나오지 않습니다.
 *   - 이벤트 아이콘 → `event.eventKind`로 분기합니다(productBottle 성분 첫 사용 /
 *     sunny 자외선 급증). 2026-08-17(세션 15) 이모지에서 42종 아이콘 세트로 교체.
 *     예전의 "배지가 숫자면 🧴, 아니면 ✅" 근사는 지웠습니다 — ✅에 해당하던 "안정 구간"
 *     이벤트는 애초에 서버가 도출하지 않는 유형이었습니다(ADR 0013 §2).
 *   - AI 분석 요약 → `summary`. 예전엔 `subtitle`을 썼는데, ADR 0027이 `subtitle`을
 *     메타 문구("최근 30일 · 이벤트와 상관관계")로 확정해서 자리가 갈렸습니다.
 *     `subtitle`은 관리자 결정으로 차트 카드 제목 아래 메타 줄에 표시합니다.
 *   - 관리 팁 → `tip`. ai-server 생성이라 실패 시 null이고, 그때 섹션이 사라집니다.
 *
 * 여전히 클라이언트가 계산하는 값: **기간 변화(+3) / 평균 / 현재.** 백엔드가 필드 추가를
 * 거절했습니다(ADR 0027 "만들지 않기로 한 것") — 서버가 같은 값을 다시 계산하면 모닝·
 * 나이트 중 어느 쪽을 기준으로 잡든 `nightScore ?? morningScore`로 접어 그리는 화면
 * 수치와 미묘하게 어긋나기 때문입니다. `graph` 하나를 정본으로 둡니다.
 * ─────────────────────────────────────────────────────────────────────────────
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
  // Figma 헤더 배지 — 지표 4종은 "높을수록 좋음"이므로(2026-08-18 확정) 값이 오르면
  // safe(초록), 내리면 caution(빨강)입니다. Figma는 반대 방향을 전제로 그려졌습니다.
  const changeUp = stats.change !== null && stats.change > 0;
  const changeAccent = changeUp ? reportColor.safe : reportColor.caution;

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
                <AppIcon
                  name={data.type === 'ENVIRONMENT' ? 'sunny' : 'warning'}
                  size={20}
                  color={data.type === 'ENVIRONMENT' ? reportColor.amber : reportColor.caution}
                />
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
              <View style={styles.chartTitleBlock}>
                <Text style={styles.chartTitle}>
                  {METRIC_INDEX_LABEL[data.metric]} 추이 (최근 {stats.dayCount}일)
                </Text>
                {/* 서버 subtitle은 기간 길이를 알리는 메타 문구입니다(ADR 0027) —
                    분석 요약이 아니라 여기 제목 아래에 붙입니다(관리자 결정). */}
                {data.subtitle ? <Text style={styles.chartMeta}>{data.subtitle}</Text> : null}
              </View>
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

        {/* 2) AI 분석 요약 — F-ANALYSIS-01이 저장해 둔 분석 요약 문장(ADR 0027).
            저장된 값이 없으면 null로 와서 섹션이 사라집니다. */}
        {data.summary ? (
          <View style={styles.cardWrap}>
            <LinearGradient
              colors={gradient.iconBoxSoft}
              start={gradientDirection.badge.start}
              end={gradientDirection.badge.end}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>AI 분석 요약</Text>
              <Text style={styles.summaryText}>{data.summary}</Text>
            </LinearGradient>
          </View>
        ) : null}

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
        {/* 4) 관리 팁 — ai-server 생성이라 호출 실패·타임아웃 시 null입니다(ADR 0028).
            팁은 상세 화면의 전제 조건이 아니라서 없으면 섹션만 사라집니다. */}
        {data.tip ? (
          <View style={styles.cardWrap}>
            <View style={styles.tipCard}>
              <View style={styles.tipLabelRow}>
                <AppIcon name="tip" size={13} color={color.brand500} />
                <Text style={styles.tipLabel}>관리 팁</Text>
              </View>
              <Text style={styles.tipText}>{data.tip}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** 아이콘은 도출 유형으로만 정합니다 — 배지 수치 유무로 추정하지 않습니다(ADR 0027). */
const EVENT_KIND_ICON: Record<InsightEventKind, AppIconName> = {
  INGREDIENT_USAGE: 'productBottle',
  UV_SPIKE: 'sunny',
};

function EventRow({ event, isLast }: { event: InsightEvent; isLast: boolean }) {
  const badge = deriveEventBadge(event);
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventIconColumn}>
        <View style={[styles.eventIconBox, { backgroundColor: tint(badge.accent) }]}>
          <AppIcon name={EVENT_KIND_ICON[event.eventKind]} size={16} color={badge.accent} />
        </View>
        {!isLast && <View style={styles.eventConnector} />}
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventLabel}>
          {formatEventDate(event.date)} — {event.label}
        </Text>
        <Text style={styles.eventImpact}>{event.impact}</Text>
      </View>
      <View style={[styles.eventBadge, { backgroundColor: tint(badge.accent) }]}>
        <Text style={[styles.eventBadgeText, { color: badge.accent }]}>{badge.text}</Text>
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
 * 이벤트 배지 — `delta`를 그대로 씁니다(ADR 0027). 문구 파싱은 하지 않습니다.
 *
 * `delta`가 null인 경우는 서버가 단정하지 않기로 한 자리입니다 — `impact`도 같은 판정으로
 * "확인 중" 문구가 되므로(REPORT-02 BR7) 배지에도 수치 대신 "확인 중"을 씁니다. 자외선
 * 이벤트는 변화량 근거 자체가 없어 항상 이쪽입니다.
 *
 * 지표 4종은 "높을수록 좋음"이므로(2026-08-18 확정) delta가 양수면 개선(safe),
 * 음수면 악화(caution)입니다.
 */
function deriveEventBadge(event: InsightEvent): { text: string; accent: string } {
  if (event.delta === null) {
    return { text: '확인 중', accent: color.textMuted };
  }
  const improved = event.delta > 0;
  return {
    text: `${improved ? '+' : ''}${event.delta}`,
    accent: improved ? reportColor.safe : reportColor.caution,
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
    // 제목 아래 메타 줄이 붙어 왼쪽이 2줄이 되므로 위쪽 정렬입니다.
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[2],
  },
  chartTitleBlock: {
    flexShrink: 1,
    gap: 2,
  },
  chartTitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  chartMeta: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textMuted,
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
  tipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  tipLabel: {
    fontSize: adjustFontSize(11),
    ...weightFamily('bold'),
    color: color.brand500,
  },
  tipText: {
    fontSize: adjustFontSize(13),
    lineHeight: 21,
    ...weightFamily('medium'),
    color: color.textInk,
  },
});

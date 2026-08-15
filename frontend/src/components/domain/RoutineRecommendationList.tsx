import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/base/Card';
import { EmptyState } from '@/components/state/EmptyState';
import { color, gradient, radius, space, typography } from '@/theme';
import type { TimeSlot } from '@/app/routes';
import type { RoutineRecommendationItem } from '@/types/home';
import { weightFamily } from '@/theme/typography';

type RoutineRecommendationListProps = {
  timeSlot: TimeSlot;
  items: RoutineRecommendationItem[];
  /** 등록된 제품이 하나도 없는 신규 사용자용 빈 상태 액션 (F-HOME-04 BR5) */
  onEmptyAction?: () => void;
  /**
   * 밤 홈처럼 어두운 배경 위에 이 컴포넌트를 직접 올릴 때 true — 섹션 타이틀만 흰색으로
   * 바뀝니다. 항목 카드는 항상 흰 배경(Card 컴포넌트)이라 카드 안 텍스트(이름/이유)는
   * 영향받지 않습니다 (관리자 요청, 2026-08-11 — 밤 홈 배경이 진한 보라로 바뀌면서
   * 타이틀이 안 보였던 문제).
   */
  darkBackground?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SECTION_TITLE: Record<TimeSlot, string> = {
  MORNING: '오늘 모닝루틴 추천',
  NIGHT: '오늘 나이트루틴 추천',
};

// 목업(HOME01=낮 "우선", HOME02=밤 "권장") 기준 — 1순위(rank===1) 항목에만 붙는 pill 문구.
// 백엔드에 별도 우선순위 플래그가 없어서 rank===1 여부로 판단합니다(Checkpoint 9-D).
const RANK_BADGE_LABEL: Record<TimeSlot, string> = {
  MORNING: '우선',
  NIGHT: '권장',
};

/**
 * 루틴 추천 리스트. 낮 홈(MORNING)·밤 홈(NIGHT) 공용 컴포넌트입니다.
 * 명세서 F-HOME-04 BR2: 제품명만 나열하지 않고 항목마다 순위 + 근거 문구를 함께 보여줍니다.
 */
export function RoutineRecommendationList({
  timeSlot,
  items,
  onEmptyAction,
  darkBackground = false,
  style,
}: RoutineRecommendationListProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, darkBackground && styles.titleOnDark]}>
        {SECTION_TITLE[timeSlot]}
      </Text>

      {items.length === 0 ? (
        <EmptyState
          title="아직 등록된 제품이 없어요"
          description="제품을 등록하면 오늘 추천 루틴을 볼 수 있어요."
          actionLabel={onEmptyAction ? '제품 등록하러 가기' : undefined}
          onAction={onEmptyAction}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const isTop = item.rank === 1;
            return (
              <Card key={item.productId} padding={4} style={styles.row}>
                {isTop ? (
                  <LinearGradient
                    colors={gradient.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rankBadge}
                  >
                    <Text style={styles.rankTextTop}>{item.rank}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.rankBadge, styles.rankBadgeNeutral]}>
                    <Text style={styles.rankText}>{item.rank}</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.reason} numberOfLines={2}>
                    {item.reason}
                  </Text>
                </View>
                {isTop && (
                  <LinearGradient
                    colors={gradient.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.priorityPill}
                  >
                    <Text style={styles.priorityPillText}>{RANK_BADGE_LABEL[timeSlot]}</Text>
                  </LinearGradient>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[3],
  },
  title: {
    ...typography.h2,
    color: color.ink900,
  },
  titleOnDark: {
    color: color.bg,
  },
  list: {
    gap: space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 비우선(rank 2 이상) 배지 — brand 컬러가 보라로 바뀌면서 전부 보라색이면 "우선"과
  // 구분이 안 돼서, 중립 회색(ink300 톤)으로 분리했습니다 (Checkpoint 9-D).
  rankBadgeNeutral: {
    backgroundColor: 'rgba(183, 188, 194, 0.25)',
  },
  rankText: {
    ...typography.micro,
    color: color.ink600,
  },
  rankTextTop: {
    ...typography.micro,
    color: color.bg,
  },
  priorityPill: {
    paddingHorizontal: space[2],
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  priorityPillText: {
    ...typography.micro,
    color: color.bg,
    ...weightFamily('bold'),
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  reason: {
    ...typography.caption,
    color: color.ink600,
  },
});
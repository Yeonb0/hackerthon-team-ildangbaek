import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
import { EmptyState } from '@/components/state/EmptyState';
import { color, radius, space, typography } from '@/theme';
import type { TimeSlot } from '@/app/routes';
import type { RoutineRecommendationItem } from '@/types/home';

type RoutineRecommendationListProps = {
  timeSlot: TimeSlot;
  items: RoutineRecommendationItem[];
  /** 등록된 제품이 하나도 없는 신규 사용자용 빈 상태 액션 (F-HOME-04 BR5) */
  onEmptyAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

const SECTION_TITLE: Record<TimeSlot, string> = {
  MORNING: '오늘 모닝루틴 추천',
  NIGHT: '오늘 나이트루틴 추천',
};

/**
 * 루틴 추천 리스트. 낮 홈(MORNING)·밤 홈(NIGHT) 공용 컴포넌트입니다.
 * 명세서 F-HOME-04 BR2: 제품명만 나열하지 않고 항목마다 순위 + 근거 문구를 함께 보여줍니다.
 */
export function RoutineRecommendationList({
  timeSlot,
  items,
  onEmptyAction,
  style,
}: RoutineRecommendationListProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{SECTION_TITLE[timeSlot]}</Text>

      {items.length === 0 ? (
        <EmptyState
          title="아직 등록된 제품이 없어요"
          description="제품을 등록하면 오늘 추천 루틴을 볼 수 있어요."
          actionLabel={onEmptyAction ? '제품 등록하러 가기' : undefined}
          onAction={onEmptyAction}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Card key={item.productId} padding={4} style={styles.row}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.reason} numberOfLines={2}>
                  {item.reason}
                </Text>
              </View>
            </Card>
          ))}
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
    backgroundColor: color.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.micro,
    color: color.brand700,
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

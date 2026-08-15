// src/components/domain/InsightCard.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon, AppIconName } from '@/components/icons';
import { Card } from '@/components/base/Card';
import { color, space, typography } from '@/theme';
import type { InsightSummary } from '@/types/report';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type InsightCardProps = {
  insight: InsightSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

// INGREDIENT(flask)는 2026-08-12 추가분으로 교체 완료. ENVIRONMENT(partly-sunny-outline)는
// 날씨 아이콘 7종이 아직 안 와서 계속 Ionicons 유지 — AppIcon이 자동 폴백합니다.
const TYPE_CONFIG: Record<InsightSummary['type'], { label: string; icon: AppIconName }> = {
  INGREDIENT: { label: '성분 요인', icon: 'flask' },
  ENVIRONMENT: { label: '환경 요인', icon: 'partly-sunny-outline' },
};

/**
 * F-REPORT-02 인사이트 카드. type(성분/환경)에 따라 아이콘·라벨을 구분하고(BR3),
 * confidence가 OBSERVING이면 "확인 중" 배지를 달아 단정적 문구가 아님을 알립니다(BR5).
 * 탭하면 S-20(요인 상세)으로 연결합니다(BR4) — 이동은 호출부(ReportScreen)가 담당합니다.
 */
export function InsightCard({ insight, onPress, style }: InsightCardProps) {
  const config = TYPE_CONFIG[insight.type];
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card padding={4} style={style}>
        <View style={styles.header}>
          <View style={styles.typeRow}>
            <AppIcon name={config.icon} size={14} color={color.brand700} />
            <Text style={styles.typeLabel}>{config.label}</Text>
          </View>
          {insight.confidence === 'OBSERVING' && (
            <View style={styles.observingBadge}>
              <Text style={styles.observingText}>확인 중</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.description}>{insight.description}</Text>
        <Text style={styles.link}>요인 자세히 보기 →</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  typeLabel: {
    fontSize: adjustFontSize(13),
    ...weightFamily('semibold'),
    color: color.brand700,
  },
  observingBadge: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: color.ink300,
  },
  observingText: {
    fontSize: adjustFontSize(11),
    ...weightFamily('semibold'),
    color: color.ink900,
  },
  title: {
    ...typography.h2,
    color: color.ink900,
    marginTop: space[2],
  },
  description: {
    ...typography.body,
    color: color.ink600,
    marginTop: space[1],
  },
  link: {
    fontSize: adjustFontSize(12),
    ...weightFamily('semibold'),
    color: color.brand700,
    marginTop: space[2],
  },
});

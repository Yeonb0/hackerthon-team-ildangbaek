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
const TYPE_ICON: Record<InsightSummary['type'], AppIconName> = {
  INGREDIENT: 'flask',
  ENVIRONMENT: 'partly-sunny-outline',
};

/**
 * F-REPORT-02 인사이트 카드.
 *
 * 2026-08-17 — Figma 컬러 최종본(210:2437) 실측 기준으로 배지 내용을 바꿨습니다.
 * REPORT-01 응답은 `title`에 이미 짧은 구체 요인명("레티놀"/"자외선" 등)을,
 * `description`에 전체 문장을 담아 보내고 있어서(docs/api_명세서.md REPORT-01 샘플
 * 확인) 타입/API 변경 없이 화면 배치만 바꿨습니다 — 예전엔 `title`을 큰 제목처럼,
 * `description`을 본문처럼 썼는데 이제 반대로 `title`을 요인명 배지, `description`을
 * 제목급 문장으로 씁니다.
 *
 * ⚠️ 배지 색: Figma 목업은 인사이트마다 다른 강조색(레티놀=주의/빨강,
 * 히알루론산=안전/초록 등)을 쓰지만, 이건 `type`(성분/환경)만으로는 구분이 안 되고
 * (히알루론산도 INGREDIENT인데 초록) API에 이 색을 정할 근거 필드(긍/부정 등)가 없어서
 * 임의로 지어내지 않았습니다. 지금은 타입과 무관하게 브랜드 퍼플 단색으로 통일
 * 했습니다 — 근거 필드(예: sentiment)가 생기면 그때 지표별 색을 입히세요.
 */
export function InsightCard({ insight, onPress, style }: InsightCardProps) {
  const icon = TYPE_ICON[insight.type];
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card padding={4} style={style}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <AppIcon name={icon} size={16} color={color.brand700} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{insight.title}</Text>
              </View>
              {insight.confidence === 'OBSERVING' && (
                <View style={styles.observingBadge}>
                  <Text style={styles.observingText}>확인 중</Text>
                </View>
              )}
            </View>
            <Text style={styles.description}>{insight.description}</Text>
            <Text style={styles.link}>요인 자세히 보기 →</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: space[3],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: space[1],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  badge: {
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: color.brand50,
  },
  badgeText: {
    fontSize: adjustFontSize(10),
    ...weightFamily('bold'),
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
  description: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  link: {
    fontSize: adjustFontSize(12),
    ...weightFamily('semibold'),
    color: color.brand700,
  },
});

// src/components/domain/InsightCard.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, reportColor, space } from '@/theme/tokens';
import type { InsightSummary } from '@/types/report';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type InsightCardProps = {
  insight: InsightSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * F-REPORT-02 인사이트 행 (Figma 컬러 최종본 210:1829 "AI 인사이트" 섹션 실측).
 *
 * 2026-08-17 — Card로 감싼 개별 카드에서, 흰 배경 섹션 안의 구분선 있는 행으로
 * 바뀌었습니다(Figma 210:2033). 배지 = 구체 요인명(`title`), 본문 = 전체 문장
 * (`description`), 하단에 "요인 자세히 보기 →" 링크.
 *
 * 아이콘·색상 매핑(관리자 결정, 2026-08-17): API에 긍/부정을 직접 나타내는 필드가
 * 없어서 `type` + `confidence` 조합으로 근사합니다 —
 *   ENVIRONMENT           → ☀️ amber   (자외선·습도 등 환경 요인)
 *   INGREDIENT + OBSERVED → ⚠️ caution (반복 확인된 성분 패턴 = 대체로 주의 신호)
 *   INGREDIENT + OBSERVING→ 💧 safe    (아직 확인 중 = 단정하지 않는 톤)
 * Figma 목업의 3색(레티놀 빨강 / 자외선 주황 / 히알루론산 초록)과 결과가 일치하지만,
 * "INGREDIENT+OBSERVED는 항상 나쁜 패턴"이라는 보장은 API에 없습니다 — 개선 패턴이
 * OBSERVED로 올라오면 빨강으로 표시됩니다. 근거 필드(예: sentiment/direction)가
 * 생기면 그걸로 교체하세요.
 */
type InsightTone = { emoji: string; accent: string };

function toneFor(insight: InsightSummary): InsightTone {
  if (insight.type === 'ENVIRONMENT') return { emoji: '☀️', accent: reportColor.amber };
  if (insight.confidence === 'OBSERVING') return { emoji: '💧', accent: reportColor.safe };
  return { emoji: '⚠️', accent: reportColor.caution };
}

/** Figma는 아이콘 박스·배지 배경을 accent의 9% 알파로 씁니다(rgba(255,107,91,0.09) 등). */
function tint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.09)`;
}

export function InsightCard({ insight, onPress, style }: InsightCardProps) {
  const tone = toneFor(insight);
  const tinted = tint(tone.accent);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${insight.title} 요인 자세히 보기`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, style]}
    >
      <View style={[styles.iconBox, { backgroundColor: tinted }]}>
        <Text style={styles.emoji}>{tone.emoji}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: tinted }]}>
            <Text style={[styles.badgeText, { color: tone.accent }]}>{insight.title}</Text>
          </View>
        </View>
        <Text style={styles.description}>{insight.description}</Text>
        <Text style={styles.link}>요인 자세히 보기 →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space[3],
    paddingVertical: space[4],
  },
  rowPressed: {
    opacity: 0.6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: adjustFontSize(16),
  },
  body: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: adjustFontSize(10),
    ...weightFamily('bold'),
  },
  description: {
    fontSize: adjustFontSize(13),
    lineHeight: 18,
    ...weightFamily('semibold'),
    color: color.textInk,
  },
  link: {
    fontSize: adjustFontSize(11.5),
    ...weightFamily('semibold'),
    color: color.brand500,
  },
});

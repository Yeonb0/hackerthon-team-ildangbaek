import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type CategoryFilterBarProps = {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  /** categories의 원본 값(예: 'TONER')을 화면에 보여줄 라벨(예: '토너')로 바꿉니다. 없으면 원본 그대로. */
  getLabel?: (category: string) => string;
  style?: StyleProp<ViewStyle>;
};

/**
 * S-11 "저장된 제품" 아래 카테고리 필터(관리자님 요청, 2026-08-10). "초기화" 칩은 가로
 * 스크롤 영역 밖에 고정해두고, 나머지 카테고리 칩만 옆으로 드래그해서 봅니다 —
 * "초기화 버튼은 고정" 요구사항 그대로입니다.
 */
export function CategoryFilterBar({
  categories,
  selected,
  onSelect,
  getLabel,
  style,
}: CategoryFilterBarProps) {
  if (categories.length === 0) return null;

  return (
    <View style={[styles.row, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="필터 초기화"
        onPress={() => onSelect(null)}
        style={[styles.chip, styles.resetChip, selected === null && styles.chipActive]}
      >
        <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>초기화</Text>
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const active = selected === category;
          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={getLabel ? getLabel(category) : category}
              onPress={() => onSelect(category)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {getLabel ? getLabel(category) : category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  scrollContent: {
    flexDirection: 'row',
    gap: space[2],
  },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink300,
    backgroundColor: color.bg,
  },
  resetChip: {
    borderColor: color.brand700,
  },
  chipActive: {
    backgroundColor: color.brand700,
    borderColor: color.brand700,
  },
  chipText: {
    fontSize: adjustFontSize(13),
    ...weightFamily('semibold'),
    color: color.ink600,
  },
  chipTextActive: {
    color: color.white,
  },
});

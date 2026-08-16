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
 * S-11 "저장된 제품" 아래 카테고리 필터(관리자님 요청, 2026-08-10). "전체" 칩은 가로
 * 스크롤 영역 밖에 고정해두고, 나머지 카테고리 칩만 옆으로 드래그해서 봅니다 —
 * "칩은 고정" 요구사항 그대로입니다.
 *
 * 스타일 Figma 정합(2026-08-15, RecordProduct-Library 59:8263) — 기존 "초기화" 라벨을
 * "전체"로 바꾸고(동작은 동일, onSelect(null)), 테두리 있던 흰 배경 칩을 테두리 없는
 * 라벤더(surfaceLavenderSoft) 배경으로, 활성 칩은 브랜드 퍼플 배경으로 교체했습니다.
 * 그라데이션은 이번에 "바로 기록"/"기록 완료" 버튼에만 쓰기로 확정(관리자님 지시,
 * 2026-08-15)돼서, Figma가 활성 칩에 그라데이션을 쓰고 있어도 여기는 단색(brand500)만 씁니다.
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
        accessibilityLabel="전체 보기"
        onPress={() => onSelect(null)}
        style={[styles.chip, selected === null && styles.chipActive]}
      >
        <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>전체</Text>
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
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.surfaceLavenderSoft,
  },
  chipActive: {
    backgroundColor: color.brand500,
  },
  chipText: {
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textInk,
  },
  chipTextActive: {
    ...weightFamily('medium'),
    color: color.white,
  },
});

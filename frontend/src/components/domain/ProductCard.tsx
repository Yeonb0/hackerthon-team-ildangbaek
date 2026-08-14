import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconImagePlaceholder, IconList } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';

type ProductCardProps = {
  brand: string;
  name: string;
  category: string;
  /** 실제 이미지 로딩은 아직 미구현 — 디자인 에셋/이미지 파이프라인 붙이기 전까지 항상 placeholder */
  imageUrl?: string | null;
  /** S-12 검색 결과의 '저장됨' 배지처럼, 짧은 상태 라벨이 필요할 때만 채웁니다. */
  badgeLabel?: string;
  /**
   * 선택(체크) 상태 — S-11 "저장된 제품" 체크 기록에 씁니다. 배경색만 바꿔서 선택을
   * 표시합니다(containerSelected) — 왼쪽은 체크 아이콘 대신 항상 제품 사진(placeholder)을
   * 보여줍니다(관리자님 요청, 2026-08-10 — 처음엔 체크/원 아이콘으로 바꿔치기했는데,
   * 사진을 계속 보여주고 배경색만으로 선택을 알리는 쪽으로 변경).
   */
  selected?: boolean;
  /**
   * 우측에 "성분 보기" 버튼을 추가로 보여줍니다(관리자님 요청, 2026-08-10) — 체크/즉시저장
   * 방식으로 바뀌면서 저장된 제품의 성분을 다시 볼 방법이 없어졌던 걸 보완합니다. S-14로
   * 이동만 시키고, 실제 기록 저장은 그 화면의 "기록 완료" 버튼을 눌러야 일어납니다.
   */
  onViewIngredients?: () => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 가로로 긴 제품 카드. 사진/브랜드/제품명/종류.
 * 제품명은 2줄에서 말줄임 처리합니다.
 */
export function ProductCard({
  brand,
  name,
  category,
  imageUrl,
  badgeLabel,
  selected,
  onViewIngredients,
  onPress,
  style,
}: ProductCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected && styles.containerSelected,
        pressed && onPress && styles.pressed,
        style,
      ]}
    >
      <View style={styles.thumbnail}>
        {/* TODO: 이미지 파이프라인 붙이면 imageUrl로 <Image> 교체. 지금은 항상 placeholder 아이콘 */}
        <IconImagePlaceholder size={22} color={color.ink300} />
      </View>
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>
          {brand}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.categoryTag}>
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
        </View>
      </View>
      {badgeLabel || onViewIngredients ? (
        <View style={styles.rightArea}>
          {badgeLabel ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
          {onViewIngredients ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="성분 보기"
              onPress={onViewIngredients}
              hitSlop={8}
              style={styles.ingredientButton}
            >
              <IconList size={13} color={color.brand700} />
              <Text style={styles.ingredientButtonText}>성분 보기</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.bg,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[3],
  },
  pressed: {
    opacity: 0.7,
  },
  containerSelected: {
    backgroundColor: color.brand50,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: space[1],
  },
  brand: {
    fontSize: 12,
    ...weightFamily('regular'),
    color: color.ink600,
  },
  name: {
    fontSize: 14,
    ...weightFamily('semibold'),
    color: color.ink900,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: color.brand100,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: 1,
    marginTop: 2,
  },
  category: {
    fontSize: 11,
    color: color.brand700,
    ...weightFamily('semibold'),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: color.brand50,
  },
  badgeText: {
    fontSize: 11,
    ...weightFamily('semibold'),
    color: color.brand700,
  },
  rightArea: {
    alignItems: 'flex-end',
    gap: space[1],
  },
  ingredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  ingredientButtonText: {
    fontSize: 11,
    ...weightFamily('semibold'),
    color: color.brand700,
  },
});
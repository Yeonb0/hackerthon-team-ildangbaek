import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconCheck, IconCircleEmpty, IconImagePlaceholder, IconList } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

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
  /**
   * 오른쪽에 원형 체크박스를 보여줍니다(관리자님 실기기 확인, 2026-08-15 — 배경색만으로는
   * 선택 여부가 잘 안 보인다는 버그 리포트). RoutineAddProductScreen처럼 "여러 개 체크해서
   * 한 번에 처리"하는 화면에서만 켭니다 — 기존 ProductRecordScreen "저장된 제품" 목록은
   * 배경색 방식 그대로 유지(관리자님이 이미 확인한 동작이라 별도 지시 전까지 안 건드림).
   *
   * 2026-08-15(세션5) 추가 수정(관리자님 실기기 확인 — 체크박스 아이콘만으로는 여전히 선택
   * 표시가 잘 안 보임) — showCheckbox가 true면 선택 시 카드 전체에 테두리(brand500)를
   * 둘러서 훨씬 뚜렷하게 보이도록 했습니다. 체크 아이콘은 보조 표시로 계속 남겨둡니다.
   */
  showCheckbox?: boolean;
  /**
   * 'card'(기본) — 카드 하나마다 흰 배경 + 둥근 모서리(다른 화면 대부분 이 방식).
   * 'plain' — 배경/모서리를 없애 부모가 만든 단일 흰 카드 컨테이너 안에 나란히 놓이는
   * 방식(Figma 정합, 2026-08-15 — ProductRecordScreen "저장된 제품" 리스트 전용).
   * 부모가 카드 사이 구분선을 그리므로 이 컴포넌트는 배경/라운딩을 그리지 않습니다.
   */
  variant?: 'card' | 'plain';
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
  showCheckbox = false,
  variant = 'card',
  style,
}: ProductCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        variant === 'card' ? styles.container : styles.containerPlain,
        showCheckbox && variant === 'plain' && styles.checkboxRowBase,
        selected && (showCheckbox ? styles.containerCheckboxSelected : styles.containerSelected),
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
      {showCheckbox ? (
        <View style={styles.checkbox}>
          {selected ? (
            <View style={styles.checkboxChecked}>
              <IconCheck size={14} color={color.white} />
            </View>
          ) : (
            <IconCircleEmpty size={22} color={color.ink300} />
          )}
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
  containerPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: space[3],
    gap: space[3],
  },
  // 2026-08-15(세션5) — showCheckbox 모드 전용 선택 표시(관리자님 지시 이력: 배경색/체크
  // 아이콘만으로 잘 안 보여서 테두리로, 그다음 카드에 꽉 차게, 그다음 눌렀다 뗄 때 크기가
  // 미묘하게 달라지는 문제까지). 마지막 버그 원인 — 테두리·margin·padding을 "선택됐을 때만"
  // 추가했더니, 선택 여부에 따라 실제 박스 크기(테두리 두께만큼)가 달라져서 탭할 때마다
  // 미세하게 커졌다 작아졌다 했습니다. 그래서 이 자리(margin/padding/border 두께)는
  // showCheckbox면 선택 여부와 상관없이 항상 동일하게 잡아두고, 선택 시엔 오직 색상만
  // (투명 → brand500 테두리 / brand50 배경) 바꿔서 크기가 절대 안 변하게 했습니다.
  checkboxRowBase: {
    marginHorizontal: -space[3],
    paddingHorizontal: space[3],
    borderWidth: 1.5,
    borderRadius: radius.md,
    borderColor: 'transparent',
  },
  containerSelected: {
    backgroundColor: color.brand50,
  },
  containerCheckboxSelected: {
    borderColor: color.brand500,
    backgroundColor: color.brand50,
  },
  thumbnail: {
    width: 56,
    height: 56,
    flexShrink: 0,
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
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
  },
  name: {
    fontSize: adjustFontSize(14),
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
    fontSize: adjustFontSize(11),
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
    fontSize: adjustFontSize(11),
    ...weightFamily('semibold'),
    color: color.brand700,
  },
  rightArea: {
    flexShrink: 0,
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
    fontSize: adjustFontSize(11),
    ...weightFamily('semibold'),
    color: color.brand700,
  },
  checkbox: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
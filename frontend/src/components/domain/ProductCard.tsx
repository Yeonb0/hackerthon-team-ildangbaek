import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, radius, space } from '@/theme/tokens';

type ProductCardProps = {
  brand: string;
  name: string;
  category: string;
  /** 실제 이미지 로딩은 아직 미구현 — 디자인 에셋/이미지 파이프라인 붙이기 전까지 항상 placeholder */
  imageUrl?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 가로로 긴 제품 카드. 사진/브랜드/제품명/종류.
 * 제품명은 2줄에서 말줄임 처리합니다.
 */
export function ProductCard({ brand, name, category, imageUrl, onPress, style }: ProductCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && onPress && styles.pressed, style]}
    >
      <View style={styles.thumbnail}>
        {/* TODO: 이미지 파이프라인 붙이면 imageUrl로 <Image> 교체. 지금은 항상 placeholder 아이콘 */}
        <Ionicons name="image-outline" size={22} color={color.ink300} />
      </View>
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>
          {brand}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {category}
        </Text>
      </View>
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
    color: color.ink600,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink900,
  },
  category: {
    fontSize: 12,
    color: color.ink600,
  },
});

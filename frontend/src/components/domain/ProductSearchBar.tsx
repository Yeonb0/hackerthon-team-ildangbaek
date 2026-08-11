import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, radius, space } from '@/theme/tokens';

type ProductSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onScanPress: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 상시 노출 검색창(F-PRODUCT-01 BR2). 우측 아이콘은 검색어 유무로 교체됩니다 —
 * 검색어 없음 → 스캔 아이콘(누르면 카메라로 이동), 검색어 있음 → 지우기 아이콘(BR3).
 * S-11/12뿐 아니라 F-CHECK-02(S-21)의 검색 모드에서도 그대로 재사용할 컴포넌트라
 * ProductRecordScreen 밖으로 분리해뒀습니다.
 */
export function ProductSearchBar({
  value,
  onChangeText,
  onScanPress,
  placeholder = '제품명을 검색해보세요',
  style,
}: ProductSearchBarProps) {
  const hasText = value.length > 0;
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={18} color={color.ink300} style={styles.leadingIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.ink300}
        style={styles.input}
        maxLength={20}
        returnKeyType="search"
        accessibilityLabel="제품 검색"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasText ? '검색어 지우기' : '스캔으로 찾기'}
        onPress={hasText ? () => onChangeText('') : onScanPress}
        hitSlop={8}
        style={styles.trailingButton}
      >
        <Ionicons
          name={hasText ? 'close-circle' : 'barcode-outline'}
          size={20}
          color={hasText ? color.ink600 : color.brand700}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
    backgroundColor: color.bg,
    gap: space[2],
  },
  leadingIcon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: color.ink900,
    height: '100%',
  },
  trailingButton: {
    padding: space[1],
  },
});

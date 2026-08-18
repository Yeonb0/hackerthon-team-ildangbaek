import React, { forwardRef } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { AppTextInput } from '@/components/base/AppTextInput';
import { IconBarcode, IconClose, IconSearch } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

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
 *
 * 2026-08-15 — forwardRef로 내부 TextInput을 노출합니다(예: 빈 상태에서 검색창에
 * 바로 포커스를 주고 싶은 경우 등, 호출부가 필요할 때 ref를 넘겨 쓸 수 있게).
 */
export const ProductSearchBar = forwardRef<TextInput, ProductSearchBarProps>(function ProductSearchBar(
  { value, onChangeText, onScanPress, placeholder = '제품명을 검색해보세요', style },
  ref
) {
  const hasText = value.length > 0;
  return (
    <View style={[styles.container, style]}>
      <IconSearch size={18} color={color.ink300} style={styles.leadingIcon} />
      <AppTextInput
        ref={ref}
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
        {hasText ? (
          // Ionicons close-circle(원+X)에 대응하는 원형 버전이 없어 icon-close(원 없는 X)로 교체
          // (checkmark-circle→check와 같은 원칙, Checkpoint 9-B)
          <IconClose size={20} color={color.ink600} />
        ) : (
          <IconBarcode size={20} color={color.brand700} />
        )}
      </Pressable>
    </View>
  );
});

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
    fontSize: adjustFontSize(15),
    // 2026-08-15 — TextInput은 fontFamily를 명시해야 입력 글씨와 placeholder가
    // 앱 글꼴을 따릅니다(검색창만 다른 글꼴로 남던 원인).
    ...weightFamily('regular'),
    color: color.ink900,
    height: '100%',
  },
  trailingButton: {
    padding: space[1],
  },
});

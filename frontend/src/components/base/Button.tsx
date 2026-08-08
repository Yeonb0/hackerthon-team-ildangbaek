import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { color, radius, space } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  /** true인 동안 onPress를 호출하지 않습니다 — 중복 탭 방지 (F-SYSTEM-02) */
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * 공통 버튼. variant: primary / secondary / ghost.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyle.container,
        isDisabled && styles.disabled,
        pressed && !isDisabled && variantStyle.pressed,
        style,
      ]}
    >
      {/*
        로딩 중에도 텍스트를 그대로 렌더링(투명하게)해서 버튼 너비/높이를 유지합니다.
        텍스트를 스피너로 아예 교체하면 내용물이 짧아져 버튼 크기가 줄어드는
        레이아웃 흔들림이 생기기 때문입니다 (구조적 문제, 디자인 문제 아님).
      */}
      <Text style={[styles.label, variantStyle.label, loading && styles.hiddenLabel]}>
        {label}
      </Text>
      {loading && (
        <ActivityIndicator
          style={styles.spinnerOverlay}
          size="small"
          color={variant === 'primary' ? color.bg : color.brand700}
        />
      )}
    </Pressable>
  );
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { container: ViewStyle; pressed: ViewStyle; label: TextStyle }
> = {
  primary: {
    container: { backgroundColor: color.brand500 },
    pressed: { backgroundColor: color.brand700 },
    label: { color: color.bg },
  },
  secondary: {
    container: {
      backgroundColor: color.bg,
      borderWidth: 1,
      borderColor: color.brand500,
    },
    pressed: { backgroundColor: color.brand50 },
    label: { color: color.brand700 },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    pressed: { opacity: 0.6 },
    label: { color: color.ink900 },
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: space[6],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  hiddenLabel: {
    opacity: 0,
  },
  spinnerOverlay: {
    position: 'absolute',
  },
});
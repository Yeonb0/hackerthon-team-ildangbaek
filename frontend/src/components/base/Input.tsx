// src/components/base/Input.tsx
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** COMMON_VALIDATION_FAILED 등에서 온 필드별 에러 문구. 있으면 인라인으로 표시 (풀스크린 ErrorState 아님) */
  error?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function Input({ label, error, style, ...textInputProps }: InputProps) {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={color.textMuted}
        {...textInputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// 2026-08-15 — Figma Input/Text 실측값 반영.
//  · 테두리 ink300(#B7BCC2 회색) → borderStrong(#9B8CF5 보라)  ← 관리자 결정 2번
//  · 높이 48 → 52, radius md(16) → sm(12)
//  · 라벨 13 semibold ink600 → 11 medium textSub(#A79FC2)
//  · 입력 글씨 regular → bold (Figma card-title 스타일)
//
// TextInput은 fontFamily를 명시해야 입력 글씨·placeholder가 앱 글꼴을 따릅니다.
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textSub,
    marginBottom: space[1] + 2, // Figma Label pb 6
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: space[4],
    fontSize: adjustFontSize(16),
    ...weightFamily('bold'),
    color: color.textInk,
    backgroundColor: color.bg,
  },
  inputError: {
    borderColor: color.statusCaution,
  },
  errorText: {
    marginTop: space[1],
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.statusCaution,
  },
});

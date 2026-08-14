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
        placeholderTextColor={color.ink300}
        {...textInputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// 2026-08-15 — TextInput도 fontFamily를 명시해야 입력 글씨·placeholder가 앱 글꼴을
// 따릅니다. 지정하지 않으면 OS 기본 글꼴로 남습니다(입력칸만 다른 글꼴로 보이던 원인).
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: adjustFontSize(13),
    ...weightFamily('semibold'),
    color: color.ink600,
    marginBottom: space[2],
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    fontSize: adjustFontSize(16),
    ...weightFamily('regular'),
    color: color.ink900,
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

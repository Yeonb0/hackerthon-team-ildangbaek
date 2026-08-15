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

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: color.ink600,
    marginBottom: space[2],
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    fontSize: 16,
    color: color.ink900,
    backgroundColor: color.bg,
  },
  inputError: {
    borderColor: color.statusCaution,
  },
  errorText: {
    marginTop: space[1],
    fontSize: 12,
    color: color.statusCaution,
  },
});
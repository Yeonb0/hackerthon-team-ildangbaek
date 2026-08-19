// src/components/base/Input.tsx
import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { AppTextInput } from './AppTextInput';
import { IconEye, IconEyeOff } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** COMMON_VALIDATION_FAILED 등에서 온 필드별 에러 문구. 있으면 인라인으로 표시 (풀스크린 ErrorState 아님) */
  error?: string | null;
  style?: StyleProp<ViewStyle>;
  /**
   * 비밀번호 표시 토글을 숨깁니다(기본은 노출). `secureTextEntry`인 입력에만 의미가
   * 있습니다 — 결제 PIN처럼 어깨너머 노출이 더 위험한 입력을 위해 열어둔 문입니다.
   */
  hideVisibilityToggle?: boolean;
};

/**
 * 2026-08-19(세션 19, 관리자님 12번 항목) — 비밀번호 표시 토글.
 *
 * 화면마다 눈 아이콘을 붙이지 않고 **공용 Input이 알아서 처리**합니다.
 * `secureTextEntry`가 켜져 있으면 토글이 자동으로 생깁니다 — 지금 대상은 로그인 1곳과
 * 비밀번호 설정 2곳이고, 나중에 비밀번호 입력이 늘어도 화면 코드를 안 고쳐도 됩니다.
 *
 * ⚠️ 안드로이드에서 `secureTextEntry`를 껐다 켜면 입력 글꼴이 기기 기본으로 되돌아가는
 * RN 이슈가 알려져 있습니다. 여기서는 **입력을 다시 마운트하지 않습니다** — `key`로
 * 강제 재마운트하면 글꼴은 확실히 지켜지지만 **포커스가 풀려 키보드가 내려갑니다.**
 * 타이핑 도중 눈을 누르는 게 이 기능의 주 사용법이라 그 대가가 훨씬 큽니다.
 * `AppTextInput`이 `fontFamily`를 매 렌더 스타일로 넘기고 있어 대개 유지되며, 실기기에서
 * 글꼴이 튀는 게 확인되면 그때 재마운트를 검토합니다.
 */
export function Input({
  label,
  error,
  style,
  hideVisibilityToggle = false,
  ...textInputProps
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = Boolean(textInputProps.secureTextEntry);
  const showToggle = isPassword && !hideVisibilityToggle;

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        {/* 안드로이드에서 placeholder만 기기 기본 글꼴로 나오는 RN 버그 때문에
            AppTextInput을 씁니다 (해당 파일 주석 참고). */}
        <AppTextInput
          style={[
            styles.input,
            showToggle ? styles.inputWithToggle : null,
            error ? styles.inputError : null,
          ]}
          placeholderTextColor={color.textMuted}
          {...textInputProps}
          secureTextEntry={isPassword && !visible}
        />
        {showToggle ? (
          <Pressable
            onPress={() => setVisible((prev) => !prev)}
            accessibilityRole="button"
            // 스크린리더는 "무엇이 보이는지"가 아니라 "누르면 무슨 일이 생기는지"를
            // 읽어줘야 합니다.
            accessibilityLabel={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
            accessibilityState={{ selected: visible }}
            hitSlop={8}
            style={styles.toggleButton}
          >
            {visible ? (
              <IconEyeOff size={20} color={color.textSub} />
            ) : (
              <IconEye size={20} color={color.textSub} />
            )}
          </Pressable>
        ) : null}
      </View>
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
  // 입력과 토글 버튼을 겹쳐 놓기 위한 기준 상자. 버튼을 흐름 안에 두면(가로 배치)
  // 에러 상태에서 테두리가 입력만 감싸지 않고 버튼까지 밀려납니다.
  field: {
    position: 'relative',
    justifyContent: 'center',
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
  // 토글이 있을 때만 오른쪽 여백을 넓힙니다 — 항상 넓히면 일반 입력의 글자가
  // 이유 없이 왼쪽으로 쏠립니다.
  inputWithToggle: {
    paddingRight: space[4] + 28,
  },
  toggleButton: {
    position: 'absolute',
    right: space[3],
    height: 52,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
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

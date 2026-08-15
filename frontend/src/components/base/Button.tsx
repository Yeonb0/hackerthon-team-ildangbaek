import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { color, gradient, gradientDirection, radius, shadow, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';

type ButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  /** 라벨 왼쪽에 그릴 아이콘 (소셜 로그인 버튼 등). 로딩 중엔 라벨과 함께 숨겨집니다. */
  icon?: ReactNode;
  /** true인 동안 onPress를 호출하지 않습니다 — 중복 탭 방지 (F-SYSTEM-02) */
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * 공통 버튼. variant: primary / secondary / outline / ghost.
 *
 * 2026-08-15 (관리자 결정: "화면에서 가장 주요한 버튼은 그라데이션")
 * primary가 단색 brand500 → Figma Button/Primary(라벤더→핑크 그라데이션 + CTA 그림자)로
 * 바뀌었습니다. 기존 'gradient' variant는 이제 primary와 동일하지만, 이미 이 이름으로
 * 호출하는 화면들이 있어서 별칭으로 남겨둡니다. 신규 코드는 primary를 쓰세요.
 *
 * 'outline'은 이번에 추가 — 흰 배경 + 연보라 테두리(#E3DDF5, Figma Google 버튼 기준).
 * 카카오/구글처럼 "흰 배경 + 브랜드 아이콘"이 필요한 소셜 버튼 전용입니다. 기존
 * 'secondary'(흰 배경 + 진보라 테두리 #9B8CF5)는 다른 화면에서 이미 쓰고 있어서
 * 그대로 두고 건드리지 않았습니다.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle = VARIANT_STYLES[variant];
  const isGradient = variant === 'primary' || variant === 'gradient';

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
        isGradient && !isDisabled && shadow.cta,
        isDisabled && styles.disabled,
        pressed && !isDisabled && variantStyle.pressed,
        style,
      ]}
    >
      {/*
        그라데이션은 배경색 하나로 못 표현해서 LinearGradient를 절대 위치로 깔고
        그 위에 라벨을 얹습니다. base 스타일의 overflow:hidden이 둥근 모서리 밖으로
        그라데이션이 삐져나가지 않게 잘라줍니다.
        (StyleSheet.absoluteFillObject는 이 프로젝트 환경에서 undefined를 반환해서
         absoluteFill을 씁니다.)

        2026-08-15 — 방향 재조정 (관리자 지적: "보라색이 너무 적음").
        기존 end.x=0.16(거의 수직) 조합은 RN LinearGradient의 start/end가 버튼의
        실제 px가 아니라 %(0~1) 기준이라, 폭 342 × 높이 54처럼 가로로 아주 긴
        버튼에서는 "수직에 가깝게" 지정해도 실제로는 대각선이 급격히 꺾여
        핑크 쪽 비중이 훨씬 커 보였습니다. gradientDirection.cta를 좌상단→우하단
        대각선(0,0 → 1,1)으로 바꿔서, 가로로 긴 버튼에서는 자연스럽게 좌(보라)→
        우(핑크)로 고르게 읽히도록 했습니다.
      */}
      {isGradient && (
        <LinearGradient
          colors={gradient.brand}
          start={gradientDirection.cta.start}
          end={gradientDirection.cta.end}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.content}>
        {icon && !loading ? <View style={styles.iconSlot}>{icon}</View> : null}
        {/*
          로딩 중에도 텍스트를 그대로 렌더링(투명하게)해서 버튼 너비/높이를 유지합니다.
        */}
        <Text style={[styles.label, variantStyle.label, loading && styles.hiddenLabel]}>
          {label}
        </Text>
      </View>
      {loading && (
        <ActivityIndicator
          style={styles.spinnerOverlay}
          size="small"
          color={isGradient ? color.bg : color.brand700}
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
    container: { backgroundColor: 'transparent' },
    pressed: { opacity: 0.85 },
    label: { color: color.bg },
  },
  secondary: {
    container: {
      backgroundColor: color.bg,
      borderWidth: 1,
      borderColor: color.borderStrong,
    },
    pressed: { backgroundColor: color.brand50 },
    label: { color: color.brand700 },
  },
  outline: {
    container: {
      backgroundColor: color.bg,
      borderWidth: 1,
      borderColor: color.borderDivider,
    },
    pressed: { backgroundColor: color.brand50 },
    label: { color: color.textInk },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    pressed: { opacity: 0.6 },
    label: { color: color.textSub },
  },
  // primary 별칭 (하위 호환)
  gradient: {
    container: { backgroundColor: 'transparent' },
    pressed: { opacity: 0.85 },
    label: { color: color.bg },
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingVertical: space[4],
    paddingHorizontal: space[6],
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  iconSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    // 2026-08-15 — 관리자 요청으로 15 → 17 확대.
    fontSize: adjustFontSize(17),
    ...weightFamily('semibold'),
  },
  hiddenLabel: {
    opacity: 0,
  },
  spinnerOverlay: {
    position: 'absolute',
  },
});
// src/components/chart/ProgressRing.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { color, gradient } from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type ProgressRingProps = {
  /** 0~1. 범위를 벗어난 값은 잘라냅니다. */
  progress: number;
  /** 원의 지름(px). */
  size?: number;
  strokeWidth?: number;
  /** 가운데 표시할 문구. 미지정 시 progress를 퍼센트로 그립니다. */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * S-17 AI 분석 중 화면의 원형 진행 링 (Figma `P8CmHDZp7z0dKiHByEzuLx` node 59:6472).
 *
 * 12시 방향에서 시작해 시계방향으로 채워집니다 — SVG 원은 3시 방향에서 시작하므로
 * `rotation={-90}`으로 돌립니다(Figma도 `-rotate-90`으로 같은 처리를 해뒀습니다).
 *
 * 링만 그라데이션이고 **가운데 숫자는 솔리드**입니다. 텍스트 자체를 그라데이션으로
 * 칠하려면 마스킹이 필요한데, MaskedView는 부팅 크래시 이력이 있어 이 프로젝트에서
 * 쓰지 않습니다(GradientNumber.tsx 주석 참고).
 */
export function ProgressRing({
  progress,
  size = 144,
  strokeWidth = 10,
  label,
  style,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View style={[{ width: size, height: size }, styles.wrap, style]}>
      {/* Svg를 절대배치로 깔고 숫자를 일반 흐름에 둡니다. 반대로(숫자를 절대배치
          오버레이로) 두면 숫자가 레이아웃에 참여하지 않아, 오버레이 스타일이 한 군데라도
          어긋나면 숫자만 조용히 사라집니다 — 실기기에서 실제로 안 보인 적이 있어
          의존을 없앴습니다. */}
      <Svg width={size} height={size} style={styles.ring}>
        <Defs>
          <LinearGradient id="progressRingFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient.brand[0]} />
            <Stop offset="1" stopColor={gradient.brand[1]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color.borderDividerFaint}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#progressRingFill)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <Text style={styles.label} allowFontScaling={false}>
        {label ?? `${Math.round(clamped * 100)}%`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  label: {
    fontSize: adjustFontSize(28),
    ...weightFamily('bold'),
    color: color.textInk,
  },
});
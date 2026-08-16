// src/components/base/GradientNumber.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { gradient } from '@/theme/tokens';
import { pinDisplayFont } from '@/theme/typography';

type GradientNumberProps = {
  value: number | string;
  fontSize: number;
  style?: StyleProp<TextStyle>;
};

/**
 * 리포트 홈 "종합 피부 점수" 큰 숫자 전용 (Figma 210:1850 실측 — 라벤더→핑크
 * 그라데이션 텍스트, 154deg). RN Text는 CSS 그라데이션을 못 받아서
 * @react-native-masked-view/masked-view로 텍스트 모양을 마스크 삼아 그 위에
 * LinearGradient를 얹는 방식입니다 (관리자 결정, 2026-08-17 — 솔리드 근사 대신 실제
 * 그라데이션 + 주아체(BMJUA) 적용).
 *
 * ⚠️ 이 화면 전용입니다 — 새 네이티브 의존성이라 다음 EAS Dev Build부터 반영됩니다.
 * ⚠️ BMJUA는 °/℃ 글리프가 비어 있지만(fontFamily.ts 참고) 이 자리는 숫자만 그리므로
 * 영향 없습니다.
 */
export function GradientNumber({ value, fontSize, style }: GradientNumberProps) {
  const textStyle: TextStyle = {
    fontSize,
    lineHeight: fontSize,
    ...pinDisplayFont('bmjua'),
  };

  return (
    <MaskedView
      style={styles.maskContainer}
      maskElement={<Text style={[textStyle, style]}>{value}</Text>}
    >
      {/* 마스크 아래 실제 그라데이션. 마스크와 동일한 텍스트를 투명하게 한 번 더 깔아
          레이아웃 크기(width/height)를 확보합니다 — MaskedView는 자식 크기를 그대로
          씁니다. */}
      <Text style={[textStyle, style, styles.hiddenSizer]}>{value}</Text>
      <LinearGradient
        colors={gradient.brand}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  maskContainer: {
    flexDirection: 'row',
  },
  hiddenSizer: {
    opacity: 0,
  },
});

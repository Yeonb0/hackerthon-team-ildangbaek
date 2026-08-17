// src/components/base/GradientNumber.tsx
import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { color } from '@/theme/tokens';
import { pinDisplayFont } from '@/theme/typography';

type GradientNumberProps = {
  value: number | string;
  fontSize: number;
  style?: StyleProp<TextStyle>;
};

/**
 * 리포트 홈 "종합 피부 점수" 큰 숫자 전용 (Figma 210:1850 실측 — 원래는 라벤더→핑크
 * 그라데이션 텍스트, 154deg).
 *
 * 2026-08-17 — @react-native-masked-view/masked-view로 실제 그라데이션을 구현했다가
 * 되돌립니다. 실기기(Android)에서 앱이 부팅 시점부터 레드박스/로그 하나 없이 흰
 * 화면만 뜨는 문제가 있었는데, 이 컴포넌트가 App.tsx → RootNavigator →
 * MainTabNavigator → ReportScreen → ReportSummaryCard 경로에서 **정적 import**로
 * 걸려 있어서(리포트 탭이 지연 마운트라도 모듈 자체는 부팅 시 평가됨), MaskedView
 * 네이티브 모듈 쪽 문제가 있었다면 화면이 뜨기도 전에 조용히 죽을 수 있는 구조였습니다.
 * 근본 원인을 실기기 로그(logcat)로 직접 확인하진 못했지만, 원인 후보를 지우기 위해
 * 우선 되돌립니다 — 그라데이션 대신 brand500 솔리드 색 + BMJUA(주아체)만 유지.
 * package.json의 masked-view 의존성도 같이 제거했습니다. 흰 화면이 이걸로 해결되면
 * 원인이 맞았던 거고, 그래도 재현되면 다른 원인을 더 봐야 합니다.
 */
export function GradientNumber({ value, fontSize, style }: GradientNumberProps) {
  const textStyle: TextStyle = {
    fontSize,
    lineHeight: fontSize,
    color: color.brand500,
    ...pinDisplayFont('bmjua'),
  };

  return <Text style={[textStyle, style]}>{value}</Text>;
}
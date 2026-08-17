// src/components/base/GradientNumber.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { color, gradient, gradientDirection } from '@/theme/tokens';
import { pinDisplayFont } from '@/theme/typography';

type GradientNumberProps = {
  value: number | string;
  fontSize: number;
  /** 원의 지름(px). 미지정 시 fontSize의 2배로 자동 계산됩니다. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 리포트 홈 "종합 피부 점수" 큰 숫자 전용 (Figma 210:1850 실측 — 원래는 라벤더→핑크
 * 그라데이션 텍스트, 154deg).
 *
 * 2026-08-17 (세션 10) — @react-native-masked-view/masked-view로 텍스트 자체를
 * 마스킹하는 방식으로 구현했다가 되돌렸습니다. 실기기(Android)에서 앱이 부팅
 * 시점부터 레드박스/로그 하나 없이 흰 화면만 뜨는 문제가 있었는데, 이 컴포넌트가
 * App.tsx → RootNavigator → MainTabNavigator → ReportScreen → ReportSummaryCard
 * 경로에서 정적 import로 걸려 있어서(리포트 탭이 지연 마운트라도 모듈 자체는
 * 부팅 시 평가됨), MaskedView 네이티브 모듈 쪽 문제가 있었다면 화면이 뜨기도
 * 전에 조용히 죽을 수 있는 구조였습니다.
 *
 * 2026-08-17 (세션 11) — 관리자 결정: 텍스트 마스킹 대신, 기록 홈 월간 캘린더의
 * "오늘" 원(RecordCalendar.todayCircle)과 동일한 패턴으로 전환합니다. 그라데이션은
 * LinearGradient가 원형 배경(View)에만 칠하고, 숫자는 그 위에 흰색(color.bg)
 * 솔리드 Text로 얹습니다 — 텍스트 자체를 마스킹하지 않으므로 MaskedView 네이티브
 * 모듈이 전혀 필요 없고, 정적 import 경로에도 새 네이티브 의존성이 남지 않습니다.
 */
export function GradientNumber({ value, fontSize, size, style }: GradientNumberProps) {
  const diameter = size ?? fontSize * 2;

  const circleStyle: ViewStyle = {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textStyle: TextStyle = {
    fontSize,
    lineHeight: fontSize,
    color: color.bg, // 원 위 흰 글씨
    ...pinDisplayFont('bmjua'),
  };

  return (
    <LinearGradient
      colors={gradient.brand}
      start={gradientDirection.badge.start}
      end={gradientDirection.badge.end}
      style={[circleStyle, styles.shadow, style]}
    >
      <Text style={textStyle} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // 원이 카드 배경 위에서 붕 떠 보이지 않도록 옅은 그림자만 추가 (버튼 shadow.cta와
  // 별개의 더 옅은 값 — 배지는 CTA만큼 강조가 필요 없음).
  shadow: {
    shadowColor: '#9B8CF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
});
import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';

type CardProps = ViewProps & {
  /** space 토큰 키. 기본 5 (20). */
  padding?: keyof typeof space;
  style?: StyleProp<ViewStyle>;
};

/**
 * 불투명 흰 배경 + 그림자 카드.
 *
 * 2026-08-14 관리자님 지적으로 반투명(rgba 0.82) → 불투명(color.bg)으로 변경 — 뒤
 * 배경이 살짝 비쳐 보이면서 그림자랑 겹쳐 "가운데는 하얗고 테두리는 뿌옇게" 보이는
 * 문제가 있었습니다. 예전엔 글래스모피즘(블러) 대체 목적으로 반투명을 썼었는데
 * (안드로이드 큰 카드에 블러 쓰면 성능 이슈 — 로드맵 Phase 2 결정), 그 목적 없이도
 * 불투명 흰색 + 그림자만으로 카드 구분은 충분해서 반투명을 걷어냈습니다.
 *
 * 2026-08-15 — 그림자를 Figma S-05(ProfileComplete) 카드 실측값으로 전역 교체
 * (opacity 0.30→0.1, offset 4→6, blur 12→18). 관리자 결정: 공용 컴포넌트 자체를
 * 바꾸는 방식으로 진행 — 이 컴포넌트를 쓰는 다른 화면들 카드 그림자도 같이
 * 옅어집니다.
 */
export function Card({ padding = 5, style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.base, { padding: space[padding] }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: color.bg,
    borderRadius: radius.lg,
    shadowColor: color.brand500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 2, // Android
  },
});
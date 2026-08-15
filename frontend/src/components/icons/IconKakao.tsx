// src/components/icons/IconKakao.tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE } from './types';

/**
 * 카카오 로그인 버튼 전용 브랜드 아이콘.
 *
 * 2026-08-15 — 관리자님이 전달한 실제 카카오 말풍선 아이콘(노란 원 + 어두운 말풍선,
 * 꼬리가 왼쪽 아래로 빠지는 형태) 기준으로 재작업. 이전 버전(작은 원 아이콘 + 텍스트
 * 라인 장식)은 근사치였는데, 이번엔 업로드된 이미지의 비율을 그대로 벡터화했습니다.
 *
 * ⚠️ 다른 아이콘 42종과 달리 `color` prop을 받지 않습니다 — 카카오 브랜드 색(#FEE500
 * 배경, #3C1E1E 말풍선)이 고정이라 currentColor 패턴을 적용하면 안 됩니다.
 */
export function IconKakao({ size = ICON_DEFAULT_SIZE, style }: Omit<IconProps, 'color'>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Circle cx="12" cy="12" r="12" fill="#FEE500" />
      <Path
        d="M12.15 6.3c-3.6 0-6.52 2.28-6.52 5.1 0 1.8 1.2 3.39 3.03 4.29-.13.47-.49 1.77-.56 2.05-.09.34.13.34.27.25.11-.08 1.72-1.15 2.42-1.62.44.06.9.09 1.36.09 3.6 0 6.52-2.28 6.52-5.1 0-2.82-2.92-5.1-6.52-5.1Z"
        fill="#3C1E1E"
      />
    </Svg>
  );
}
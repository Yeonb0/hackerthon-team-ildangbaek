// src/components/icons/IconWifiOff.tsx
// 원본은 Illustrator 내보내기(고정 검정 #000, 하단 점은 클래스 없이 고정 채우기)라
// Checkpoint 9-A에서 currentColor로 정규화했습니다 (관리자님 확인 2026-08-11).
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconWifiOff({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="M3.5,8.53c5.67-4.33,11.33-4.33,17,0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6.3,11.83c3.8-3,7.6-3,11.4,0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9.2,15.13c1.87-1.53,3.73-1.53,5.6,0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={18.13} r={1.1} fill={color} />
      <Path d="M4.47,4.29l15.06,15.07" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

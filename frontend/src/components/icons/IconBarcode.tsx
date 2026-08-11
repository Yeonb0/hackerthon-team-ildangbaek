// src/components/icons/IconBarcode.tsx
// 원본은 Illustrator 내보내기(고정 검정 #000, 모서리 1.8px / 바코드 선 1.5px 혼용)라
// Checkpoint 9-A에서 currentColor + 1.8px로 정규화했습니다 (관리자님 확인 2026-08-11).
import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconBarcode({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M4,7v-2c0-.55.45-1,1-1h2M20,7v-2c0-.55-.45-1-1-1h-2M4,17v2c0,.55.45,1,1,1h2M20,17v2c0,.55-.45,1-1,1h-2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={6.25} y1={8} x2={6.25} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={8.55} y1={8} x2={8.55} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={10.85} y1={8} x2={10.85} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={13.15} y1={8} x2={13.15} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={15.45} y1={8} x2={15.45} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={17.75} y1={8} x2={17.75} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

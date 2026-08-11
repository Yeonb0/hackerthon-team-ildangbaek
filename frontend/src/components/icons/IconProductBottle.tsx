// src/components/icons/IconProductBottle.tsx
// 원본은 Illustrator 내보내기(고정 검정 #000)라 currentColor로 정규화했습니다.
// 두께는 원본부터 1.8px로 이미 통일돼 있었습니다 (관리자님 확인 2026-08-11).
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconProductBottle({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Rect
        x={8.67}
        y={4.2}
        width={6}
        height={3.2}
        rx={1}
        ry={1}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M9.67,7.4h5v2.3c0,.5.2.9.5,1.3.7.8,1,1.7,1,2.9v4.3c0,.88-.72,1.6-1.6,1.6h-5.8c-.88,0-1.6-.72-1.6-1.6v-4.3c0-1.2.3-2.1,1-2.9.3-.4.5-.8.5-1.3v-2.3h1Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7.17,15.2h9.66" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

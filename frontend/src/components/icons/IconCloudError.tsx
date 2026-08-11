// src/components/icons/IconCloudError.tsx
// 원본은 Illustrator 내보내기(고정 검정 #000)라 currentColor로 정규화했습니다.
// 두께는 원본부터 1.8px로 이미 통일돼 있었습니다 (관리자님 확인 2026-08-11).
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconCloudError({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M7.44,18.02c-2.21.02-4.02-1.75-4.04-3.96-.02-2.01,1.45-3.71,3.44-4,.5-2.72,3.11-4.51,5.83-4.01,1.73.32,3.16,1.52,3.77,3.17,2.43.14,4.29,2.22,4.15,4.65-.14,2.43-2.22,4.29-4.65,4.15H7.44Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10.75,11.7l2.5,2.5M13.25,11.7l-2.5,2.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

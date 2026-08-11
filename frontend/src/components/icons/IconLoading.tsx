// src/components/icons/IconLoading.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconLoading({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="M20 12a8 8 0 1 1-2.34-5.66" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M20 5.5v4h-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

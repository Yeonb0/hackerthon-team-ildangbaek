// src/components/icons/IconPersonCircle.tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconPersonCircle({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={10.17} r={2.6} stroke={color} strokeWidth={1.8} />
      <Path d="M6.7,18.22c.81-2.93,3.84-4.64,6.77-3.83,1.86.52,3.31,1.97,3.83,3.83" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

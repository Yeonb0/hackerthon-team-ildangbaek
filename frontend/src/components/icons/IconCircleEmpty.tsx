// src/components/icons/IconCircleEmpty.tsx
import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconCircleEmpty({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

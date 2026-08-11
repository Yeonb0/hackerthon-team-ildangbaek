// src/components/icons/IconCalendar.tsx
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconCalendar({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Rect x={4} y={5.5} width={16} height={14.5} rx={2.3} stroke={color} strokeWidth={1.8} />
      <Path d="M4 10h16M8 3.5v3M16 3.5v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

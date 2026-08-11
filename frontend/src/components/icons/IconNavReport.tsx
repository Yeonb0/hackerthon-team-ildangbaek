// src/components/icons/IconNavReport.tsx
import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconNavReport({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Rect x={3.3} y={13} width={3.8} height={7} rx={1.2} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={10.1} y={8} width={3.8} height={12} rx={1.2} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={16.9} y={4} width={3.8} height={16} rx={1.2} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

// src/components/icons/IconImagePlaceholder.tsx
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconImagePlaceholder({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Rect x={3} y={4.5} width={18} height={15} rx={2.3} ry={2.3} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={8.2} cy={9} r={1.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4.25,18.85l4.56-4.88c.5-.55,1.38-.6,1.95-.11.02.02.05.04.07.06l2.44,2.39,2.76-3.05c.5-.55,1.37-.6,1.95-.12.06.05.12.11.18.18l2.55,3.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

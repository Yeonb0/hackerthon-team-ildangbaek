// src/components/icons/IconNavRecord.tsx
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconNavRecord({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Rect
        x={4}
        y={4}
        width={16}
        height={16}
        rx={5}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 11h8M8 15h5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

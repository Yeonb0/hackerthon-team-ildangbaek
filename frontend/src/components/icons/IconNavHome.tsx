// src/components/icons/IconNavHome.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconNavHome({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M3 11.5 12 4l9 7.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

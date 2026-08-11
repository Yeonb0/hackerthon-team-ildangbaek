// src/components/icons/IconFlask.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconFlask({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M9.5 3h5M10 3v5.8L5.3 17a2 2 0 0 0 1.75 3h9.9a2 2 0 0 0 1.75-3L14 8.8V3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7.8 14.5h8.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

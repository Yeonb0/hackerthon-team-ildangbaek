// src/components/icons/IconFaceScan.tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconFaceScan({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={11} r={3.2} stroke={color} strokeWidth={1.8} />
      <Path d="M8.7 16.3c.6-1.4 1.9-2.3 3.3-2.3s2.7.9 3.3 2.3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// src/components/icons/IconHelpCircle.tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconHelpCircle({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path
        d="M9.3,9.5c-.01-1.49,1.19-2.71,2.68-2.72,1.49-.01,2.71,1.19,2.72,2.68,0,1.03-.58,1.98-1.5,2.44-.75.4-1.2,1-1.2,1.9v.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={16.8} r={1} fill={color} />
    </Svg>
  );
}

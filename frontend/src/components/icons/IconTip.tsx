// src/components/icons/IconTip.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconTip({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="M9 17h6M10 20h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M12 3.5a6 6 0 0 0-3.2 11.1c.5.35.8.9.8 1.5v.4h4.8v-.4c0-.6.3-1.15.8-1.5A6 6 0 0 0 12 3.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

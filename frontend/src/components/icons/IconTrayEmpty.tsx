// src/components/icons/IconTrayEmpty.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconTrayEmpty({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="M3.5 13 6.3 5.8a1.4 1.4 0 0 1 1.3-.9h8.8a1.4 1.4 0 0 1 1.3.9L20.5 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M3.5 13v4.2A1.8 1.8 0 0 0 5.3 19h13.4a1.8 1.8 0 0 0 1.8-1.8V13h-4.4a1 1 0 0 0-.9.6l-.4 1a1 1 0 0 1-.9.6h-3.8a1 1 0 0 1-.9-.6l-.4-1a1 1 0 0 0-.9-.6H3.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

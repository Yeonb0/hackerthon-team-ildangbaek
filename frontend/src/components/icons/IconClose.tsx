// src/components/icons/IconClose.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconClose({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

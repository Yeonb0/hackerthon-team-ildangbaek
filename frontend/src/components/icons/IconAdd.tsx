// src/components/icons/IconAdd.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconAdd({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// src/components/icons/IconWarning.tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconWarning({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M12 7.5v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={16.3} r={1} fill={color} />
    </Svg>
  );
}

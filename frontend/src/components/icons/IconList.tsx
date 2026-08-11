// src/components/icons/IconList.tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconList({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Circle cx={4.7} cy={6.5} r={1.1} fill={color} />
      <Circle cx={4.7} cy={12} r={1.1} fill={color} />
      <Circle cx={4.7} cy={17.5} r={1.1} fill={color} />
      <Path d="M8.3 6.5h11.2M8.3 12h11.2M8.3 17.5h11.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

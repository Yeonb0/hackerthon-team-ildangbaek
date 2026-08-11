// src/components/icons/IconTrash.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconTrash({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="M4,7.1h16M9.5,7.1v-2c0-.55.45-1,1-1h3c.55,0,1,.45,1,1v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5,7.1l.8,12c.1,1.03.97,1.81,2,1.8h5.4c1.03,0,1.9-.77,2-1.8l.8-12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10.2,11v6M13.8,11v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// src/components/icons/IconMoon.tsx
// 디자이너 전달분 daynight-moon.svg (docs/icon-request-weather-daynight.md 회신) —
// 다른 42종과 동일하게 stroke="currentColor" 기반이라 그대로 정규화 없이 이식.
// DayNightIconToggle에서 필터/아웃라인 변형 없이 색상만으로 선택 상태를 구분합니다.
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconMoon({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M20 14.2A8.3 8.3 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

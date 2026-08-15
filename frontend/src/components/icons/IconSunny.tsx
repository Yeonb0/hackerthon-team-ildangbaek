// src/components/icons/IconSunny.tsx
// 디자이너 전달분 daynight-sun.svg (docs/icon-request-weather-daynight.md 회신) —
// 다른 42종과 동일하게 stroke="currentColor" 기반이라 그대로 정규화 없이 이식.
// DayNightIconToggle에서 필터/아웃라인 변형 없이 색상만으로 선택 상태를 구분합니다.
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconSunny({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Circle cx={12} cy={12} r={4.3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7 5.6 5.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

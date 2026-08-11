// src/components/icons/IconCelebrate.tsx
// 원본은 Illustrator 내보내기(별 1.6px, 반짝임 점 3개는 클래스 없이 고정 검정 채우기)라
// Checkpoint 9-A에서 별 1.8px + 점 fill=currentColor로 정규화했습니다 (관리자님 확인 2026-08-11).
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconCelebrate({ size = ICON_DEFAULT_SIZE, color = ICON_DEFAULT_COLOR, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M12,6.5l1,4.5,4.5,1-4.5,1-1,4.5-1-4.5-4.5-1,4.5-1,1-4.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={17.5} cy={6.14} r={1.1} fill={color} />
      <Circle cx={5} cy={16} r={1.3} fill={color} />
      <Circle cx={18.18} cy={19.08} r={1} fill={color} />
    </Svg>
  );
}

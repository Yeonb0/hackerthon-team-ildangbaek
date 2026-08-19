// src/components/icons/IconEyeOff.tsx
//
// 2026-08-19(세션 19, 관리자님 12번 항목 "비밀번호 보기 토글") 신설.
// IconEye와 같은 24 그리드·같은 선 굵기(1.8)로 그려서 토글할 때 두 상태의 무게가
// 흔들리지 않게 했습니다. 눈 모양은 그대로 두고 대각선만 얹는 방식입니다 —
// 아이콘이 통째로 바뀌면 깜빡이는 것처럼 보입니다.
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE, ICON_DEFAULT_COLOR } from './types';

export function IconEyeOff({
  size = ICON_DEFAULT_SIZE,
  color = ICON_DEFAULT_COLOR,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Path d="M4 20 20 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

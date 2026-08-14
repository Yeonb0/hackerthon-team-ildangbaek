// src/theme/index.ts

export * from './tokens';
// FontChoice / pinFont를 화면에서 '@/theme' 한 곳에서 가져올 수 있게 배럴에 포함합니다.
// (bootstrapFont.ts는 여기에 넣지 않습니다 — 부팅 게이트 전용이고, 배럴을 타면
//  typography가 같이 평가돼서 순서가 꼬입니다. typography.ts 상단 주석 참고.)
export * from './fontFamily';
export * from './typography';

import { color, radius, space } from './tokens';
import { typography } from './typography';


export const theme = {
  color,
  radius,
  space,
  typography,
} as const;

export type Theme = typeof theme;

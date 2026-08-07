// src/theme/index.ts

export * from './tokens';
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
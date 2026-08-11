// src/theme/tokens.ts

export const color = {
  brand50: '#EAF4FE',
  brand100: '#D3E9FD',
  brand500: '#6BB4F0',
  brand700: '#3E86C4',

  blush100: '#FDEBF0',
  blush500: '#F4A8BE',

  // 위험도 3단계 (맞음 / 지켜보는 중 / 주의 필요) — 디자인팀 확정값 오면 교체
  statusGood: '#4FB79A',
  statusWatch: '#F2B544',
  statusCaution: '#E8785B',

  ink900: '#1C1D1F',
  ink600: '#5F6469',
  ink300: '#B7BCC2',
  bg: '#FFFFFF',

  // S-16 얼굴 촬영처럼 카메라 화면을 풀블리드로 덮는 화면 전용. ink/bg 톤과 별개로
  // 항상 순수 검정 배경 + 흰 글자가 필요해서 분리했습니다 — 디자인 확정 전 placeholder.
  black: '#000000',
  white: '#FFFFFF',
  scrim60: 'rgba(0, 0, 0, 0.6)',
  scrim40: 'rgba(0, 0, 0, 0.4)',
} as const;

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;
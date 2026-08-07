// src/theme/typography.ts

// 폰트 최종 미확정 (디자인팀 대기 항목). 확정되면 expo-font로 로드 후 값만 채웁니다.
export const fontFamily = {
  regular: undefined as string | undefined,
  medium: undefined as string | undefined,
  semibold: undefined as string | undefined,
  bold: undefined as string | undefined,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const fontSize = {
  display: 28, // 홈/온보딩 대형 타이틀
  h1: 22,      // 섹션 타이틀
  h2: 18,      // 카드/서브 타이틀
  body: 15,    // 기본 본문
  caption: 13, // 보조 설명
  micro: 11,   // 태그, 배지
} as const;

export const lineHeight = {
  display: 36,
  h1: 30,
  h2: 26,
  body: 22,
  caption: 18,
  micro: 14,
} as const;

type TextStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight: (typeof fontWeight)[keyof typeof fontWeight];
};

export const typography: Record <
  'display' | 'h1' | 'h2' | 'body' | 'bodyStrong' | 'caption' | 'micro',
  TextStyle
> = {
  display:    { fontSize: fontSize.display, lineHeight: lineHeight.display, fontWeight: fontWeight.bold },
  h1:         { fontSize: fontSize.h1,      lineHeight: lineHeight.h1,      fontWeight: fontWeight.bold },
  h2:         { fontSize: fontSize.h2,      lineHeight: lineHeight.h2,      fontWeight: fontWeight.semibold },
  body:       { fontSize: fontSize.body,    lineHeight: lineHeight.body,    fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: fontSize.body,    lineHeight: lineHeight.body,    fontWeight: fontWeight.semibold },
  caption:    { fontSize: fontSize.caption, lineHeight: lineHeight.caption, fontWeight: fontWeight.regular },
  micro:      { fontSize: fontSize.micro,   lineHeight: lineHeight.micro,   fontWeight: fontWeight.medium },
};


// src/theme/typography.ts
//
// 2026-08-15 — 글꼴 기능 A안 적용. 기본 글꼴은 Pretendard(관리자 확정).
//
// ⚠️ 평가 시점에 활성 글꼴을 한 번 읽어 상수로 굳힙니다.
// 화면들이 모듈 최상단 StyleSheet.create()에서 `...typography.body`를 스프레드하기
// 때문에, 이 파일이 평가된 뒤에 활성 글꼴을 바꿔도 반영되지 않습니다. 그래서
// index.ts → src/app/Root.tsx가 저장값을 먼저 확정한 다음에야 App(그리고 화면들)을
// 동적 import 합니다. 이 순서를 깨고 부팅 게이트보다 먼저 이 모듈을 import하면
// 사용자가 뭘 골랐든 항상 Pretendard로 굳습니다.
//
// ⚠️ fontWeight를 더 이상 typography에 넣지 않습니다.
// Pretendard-SemiBold처럼 굵기별 파일을 지정한 상태에서 fontWeight까지 주면
// 안드로이드가 그 위에 합성(synthetic) 볼드를 한 번 더 얹어 과하게 두꺼워집니다.
// 굵기는 전부 패밀리명으로만 표현하고, 화면에서 굵기를 바꾸고 싶으면
// weightFamily('semibold')를 스프레드하세요.
import {
  DisplayFont,
  FontChoice,
  FontWeightKey,
  activeFontSizeOffset,
  displayFontFamily,
  fixedFontFamily,
  fontFamilyFor,
} from './fontFamily';

export const fontFamily = {
  regular: fontFamilyFor('regular'),
  medium: fontFamilyFor('medium'),
  semibold: fontFamilyFor('semibold'),
  bold: fontFamilyFor('bold'),
} as const;

/**
 * 글꼴별 크기 보정을 적용합니다 (fontFamily.ts의 FONT_SIZE_OFFSET).
 * 나눔스퀘어네오는 -1pt — Pretendard 기준으로 잡은 크기가 더 크게 보여서입니다.
 *
 * 화면에서 크기를 직접 지정할 때도 이걸 통과시켜야 글꼴 전환 시 같이 조정됩니다.
 *
 *   title: { fontSize: adjustFontSize(20), ...weightFamily('bold') }
 *
 * ⚠️ pinDisplayFont로 고정한 자리(주아체 등)에는 쓰지 마세요 — 사용자 글꼴 설정과
 * 무관한 자리라 같이 줄어들면 안 됩니다.
 * ⚠️ 하한 10pt로 막아둡니다. 보정값을 더 키웠을 때 micro(11)가 읽을 수 없게
 * 작아지는 걸 막기 위한 안전장치입니다.
 */
export const adjustFontSize = (size: number) => Math.max(10, size + activeFontSizeOffset());

/**
 * @deprecated 굵기는 fontFamily(파일명)로 표현합니다. 이 값을 스타일에 직접 넣으면
 * 안드로이드에서 합성 볼드가 겹칩니다. 기존 import 호환용으로만 남겨둡니다.
 */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const fontSize = {
  display: adjustFontSize(28), // 홈/온보딩 대형 타이틀
  h1: adjustFontSize(22),      // 섹션 타이틀
  h2: adjustFontSize(18),      // 카드/서브 타이틀
  body: adjustFontSize(15),    // 기본 본문
  caption: adjustFontSize(13), // 보조 설명
  micro: adjustFontSize(11),   // 태그, 배지
} as const;

// lineHeight는 보정하지 않습니다 — fontFamily.ts의 FONT_SIZE_OFFSET 주석 참고.
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
  fontFamily: string;
};

export const typography: Record<
  'display' | 'h1' | 'h2' | 'body' | 'bodyStrong' | 'caption' | 'micro',
  TextStyle
> = {
  display:    { fontSize: fontSize.display, lineHeight: lineHeight.display, fontFamily: fontFamily.bold },
  h1:         { fontSize: fontSize.h1,      lineHeight: lineHeight.h1,      fontFamily: fontFamily.bold },
  h2:         { fontSize: fontSize.h2,      lineHeight: lineHeight.h2,      fontFamily: fontFamily.semibold },
  body:       { fontSize: fontSize.body,    lineHeight: lineHeight.body,    fontFamily: fontFamily.regular },
  bodyStrong: { fontSize: fontSize.body,    lineHeight: lineHeight.body,    fontFamily: fontFamily.semibold },
  caption:    { fontSize: fontSize.caption, lineHeight: lineHeight.caption, fontFamily: fontFamily.regular },
  micro:      { fontSize: fontSize.micro,   lineHeight: lineHeight.micro,   fontFamily: fontFamily.medium },
};

/**
 * 굵기만 바꾸고 싶을 때. `fontWeight: '600'` 대신 이걸 씁니다.
 *
 *   completionText: { ...typography.caption, ...weightFamily('semibold') }
 */
export const weightFamily = (weight: FontWeightKey) => ({
  fontFamily: fontFamily[weight],
});

/**
 * 사용자 글꼴 설정과 무관하게 본문 글꼴 하나로 고정합니다.
 *
 *   logoText: { ...typography.display, ...pinFont('nanumSquareNeo', 'bold') },
 *
 * typography를 먼저 스프레드하고 pinFont를 뒤에 둬야 fontFamily가 덮어써집니다.
 * 값이 사용자 선택에 의존하지 않는 상수라, 모듈 최상단 StyleSheet.create() 안에서
 * 그대로 써도 안전합니다(재시작 없이도 항상 이 글꼴로 나옵니다).
 */
export const pinFont = (choice: FontChoice, weight: FontWeightKey = 'regular') => ({
  fontFamily: fixedFontFamily(choice, weight),
});

/**
 * 디스플레이 글꼴 고정. 숫자 지표·워드마크처럼 "이 글꼴이어야만 하는" 한 자리 전용입니다.
 *
 *   temperature: { fontSize: 40, lineHeight: 48, ...pinDisplayFont('bmjua') },
 *
 * ⚠️ 이 글꼴들은 굵기 파일이 하나뿐이라 fontWeight를 같이 주면 안 됩니다.
 * ⚠️ 크기에 adjustFontSize를 쓰지 마세요 — 사용자 글꼴 전환과 무관한 자리입니다.
 * ⚠️ 세로 중심선이 본문 글꼴과 달라서, 옆 요소와 baseline을 맞출 때는
 *    alignItems: 'center'가 아니라 실제 렌더를 보고 미세 조정이 필요할 수 있습니다.
 */
export const pinDisplayFont = (name: DisplayFont) => ({
  fontFamily: displayFontFamily(name),
});
// src/theme/fontFamily.ts
//
// 2026-08-15 — 글꼴 기능 A안. "지금 앱에 적용된 글꼴"을 들고 있는 최하위 모듈입니다.
//
// ⚠️ 이 파일은 의도적으로 아무것도 import 하지 않습니다.
// 부팅 게이트(src/app/Root.tsx)가 화면 모듈보다 먼저 이 모듈을 건드려야 하는데,
// 여기서 theme 배럴이나 storage를 끌어오면 그 순서가 꼬입니다. 저장소 읽기는
// bootstrapFont.ts가 담당합니다.

/** 사용자가 마이페이지에서 고를 수 있는 본문 글꼴. 굵기 4종을 모두 갖춰야 합니다. */
export type FontChoice = 'pretendard' | 'nanumSquareNeo';
export type FontWeightKey = 'regular' | 'medium' | 'semibold' | 'bold';

/**
 * App.tsx의 useFonts()에 등록하는 이름과 반드시 1:1로 일치해야 합니다.
 * 한쪽만 바꾸면 안드로이드는 조용히 기본 글꼴로 폴백하고, iOS는 그냥 무시합니다.
 */
export const FONT_FAMILIES: Record<FontChoice, Record<FontWeightKey, string>> = {
  pretendard: {
    regular: 'Pretendard-Regular',
    medium: 'Pretendard-Medium',
    semibold: 'Pretendard-SemiBold',
    bold: 'Pretendard-Bold',
  },
  nanumSquareNeo: {
    regular: 'NanumSquareNeo-Regular',
    medium: 'NanumSquareNeo-Medium',
    semibold: 'NanumSquareNeo-SemiBold',
    bold: 'NanumSquareNeo-Bold',
  },
};

/**
 * 글꼴별 크기 보정(pt). 같은 fontSize라도 글꼴마다 실제 글자가 차지하는 크기가 달라서,
 * 한쪽 기준으로 잡은 레이아웃이 다른 글꼴에서 커 보이거나 작아 보입니다.
 *
 * nanumSquareNeo: -2 — 나눔스퀘어네오가 Pretendard보다 크게 보인다는 관리자 판단
 * (2026-08-15). 값만 바꾸면 전체에 반영됩니다.
 *
 * ⚠️ lineHeight는 건드리지 않습니다. 줄 높이까지 같이 줄이면 나눔스퀘어네오의 큰
 * 글자 상자가 위아래로 잘릴 수 있어서, 여유를 남겨두는 쪽이 안전합니다.
 */
export const FONT_SIZE_OFFSET: Record<FontChoice, number> = {
  pretendard: -2,
  nanumSquareNeo: -4,
};

/**
 * 특정 자리에만 고정으로 쓰는 디스플레이 글꼴. 사용자 글꼴 설정의 영향을 받지 않습니다.
 * FontChoice와 분리한 이유: 굵기 파일이 한 종류뿐이라 본문 글꼴로 쓸 수 없고,
 * 애초에 "선택지"가 아니라 "이 자리 전용"이기 때문입니다.
 *
 *  - bmjua : 배달의민족 주아체(BMJUA_ttf.ttf). Regular 단일 weight.
 *            ⚠️ fontWeight를 같이 주지 마세요 — 안드로이드가 합성 볼드를 얹습니다.
 *            ⚠️ ° / ℃ 글리프가 비어 있습니다. 기호는 본문 글꼴로 빼세요.
 *            ⚠️ 크기 보정(adjustFontSize) 대상이 아닙니다 — 사용자 글꼴과 무관한 자리라
 *               같이 줄이면 안 됩니다.
 */
export type DisplayFont = 'bmjua';

export const DISPLAY_FONT_FAMILIES: Record<DisplayFont, string> = {
  bmjua: 'BMJUA',
};

// 2026-08-20(관리자 결정) — 기본 글꼴을 Pretendard → 나눔스퀘어네오로 변경.
// 마이페이지에서 Pretendard를 고른 사용자는 그대로 유지됩니다(아래 normalizeFontChoice).
export const DEFAULT_FONT_CHOICE: FontChoice = 'nanumSquareNeo';

/** fontStore와 bootstrapFont가 같은 키를 봐야 하므로 여기서 단일 정의합니다. */
export const FONT_STORAGE_KEY = 'skinteller.settings.fontChoice';

let activeFontChoice: FontChoice = DEFAULT_FONT_CHOICE;
let locked = false;

/**
 * ⚠️ 저장값을 **양쪽 다 명시적으로** 봐야 합니다. 예전에는 'nanumSquareNeo'만 확인하고
 * 나머지를 DEFAULT로 넘겼는데, 기본값이 나눔스퀘어네오가 된 지금 그 코드를 두면
 * 이미 Pretendard를 골라둔 사용자의 저장값이 조용히 무시됩니다.
 */
export function normalizeFontChoice(value: string | null | undefined): FontChoice {
  if (value === 'pretendard') return 'pretendard';
  if (value === 'nanumSquareNeo') return 'nanumSquareNeo';
  return DEFAULT_FONT_CHOICE;
}

/**
 * 부팅 게이트에서 단 한 번만 호출합니다. typography.ts가 평가되는 순간 이 값이
 * 상수로 굳기 때문에, 그 이후 호출은 아무 효과가 없습니다 — 그래서 lock 이후
 * 호출은 개발 중에 바로 눈치챌 수 있도록 경고를 남깁니다.
 */
export function setActiveFontChoice(choice: FontChoice): void {
  if (locked) {
    if (__DEV__) {
      console.warn(
        '[fontFamily] 이미 확정된 뒤에 setActiveFontChoice가 호출됐습니다. ' +
          '이 시점에는 화면 글꼴이 바뀌지 않습니다 (재시작 필요).',
      );
    }
    return;
  }
  activeFontChoice = choice;
}

export function lockActiveFontChoice(): void {
  locked = true;
}

export function getActiveFontChoice(): FontChoice {
  return activeFontChoice;
}

/** 사용자가 고른 글꼴 기준 패밀리명. typography.ts가 씁니다. */
export function fontFamilyFor(weight: FontWeightKey): string {
  return FONT_FAMILIES[activeFontChoice][weight];
}

/** 지금 글꼴의 크기 보정값(pt). typography.adjustFontSize()가 씁니다. */
export function activeFontSizeOffset(): number {
  return FONT_SIZE_OFFSET[activeFontChoice];
}

/** 사용자 선택과 무관하게 본문 글꼴 하나로 고정할 때. typography.pinFont() 참고. */
export function fixedFontFamily(choice: FontChoice, weight: FontWeightKey): string {
  return FONT_FAMILIES[choice][weight];
}

/** 디스플레이 글꼴 고정용. typography.pinDisplayFont() 참고. */
export function displayFontFamily(name: DisplayFont): string {
  return DISPLAY_FONT_FAMILIES[name];
}

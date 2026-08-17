// src/lib/profileLabels.ts
//
// 성별·피부타입 코드 → 한글 라벨.
//
// 원래 `api/mock/onboarding.ts` 안에만 있어서 화면에서 쓸 수 없었습니다(mock을 화면이
// import하면 실서버 모드에서도 목업 모듈이 번들에 딸려 들어옵니다). 마이페이지 부제가
// "26세 · 여성 · 지성·민감성 · 서울 강남구" 형태라 화면에서 코드→라벨 변환이 필요해져
// 공용 위치로 분리했습니다(2026-08-17).
//
// mock/onboarding.ts의 기존 상수는 그대로 두고 이 파일을 참조하도록 바꿨습니다 —
// 라벨이 두 곳에 따로 있으면 한쪽만 고쳐져서 화면마다 표기가 갈립니다.
import type { Gender, HormoneStatus, SkinTypeCode } from '@/types/onboarding';

export const GENDER_LABEL: Record<Gender, string> = {
  FEMALE: '여성',
  MALE: '남성',
  UNSPECIFIED: '선택 안 함',
};

export const SKIN_TYPE_LABEL: Record<SkinTypeCode, string> = {
  OILY: '지성',
  DRY: '건성',
  SENSITIVE: '민감성',
  UNKNOWN: '모르겠음',
};

export const HORMONE_LABEL: Record<HormoneStatus, string> = {
  MENSTRUATING: '생리',
  HORMONE_PILL: '호르몬약',
  HORMONE_INJECTION: '주사',
  MENOPAUSE: '폐경',
};

/** 서버가 모르는 코드를 내려줘도 화면이 깨지지 않게 원문을 그대로 돌려줍니다. */
export function skinTypeLabel(code: string): string {
  return SKIN_TYPE_LABEL[code as SkinTypeCode] ?? code;
}

/**
 * 마이페이지 부제 한 줄. 값이 없는 항목은 통째로 빠집니다 —
 * "· · 서울 강남구"처럼 구분점만 남는 상태를 막기 위해 배열로 모아서 join합니다.
 *
 * 성별이 UNSPECIFIED면 "선택 안 함"을 노출하지 않고 생략합니다. 프로필 요약에서
 * 사용자가 굳이 밝히지 않기로 한 항목을 다시 보여줄 이유가 없습니다.
 */
export function buildProfileSubtitle(input: {
  age?: number | null;
  gender?: Gender | null;
  skinTypes?: string[] | null;
  location?: string | null;
}): string {
  const parts: string[] = [];
  if (typeof input.age === 'number') parts.push(`${input.age}세`);
  if (input.gender && input.gender !== 'UNSPECIFIED') parts.push(GENDER_LABEL[input.gender]);
  if (input.skinTypes?.length) parts.push(input.skinTypes.map(skinTypeLabel).join('·'));
  if (input.location) parts.push(input.location);
  return parts.join(' · ');
}

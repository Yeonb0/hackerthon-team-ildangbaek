// src/types/onboarding.ts
// 명세서 §6 Enum 사전 기준. S-01/S-02/S-04에서 공용으로 씁니다.

export type Gender = 'FEMALE' | 'MALE' | 'UNSPECIFIED';

export type SkinTypeCode = 'OILY' | 'DRY' | 'SENSITIVE' | 'UNKNOWN';

export type HormoneStatus =
  | 'MENSTRUATING'
  | 'HORMONE_PILL'
  | 'HORMONE_INJECTION'
  | 'MENOPAUSE';

/** PATCH /users/me/onboarding/basic-info 요청 */
export interface BasicInfoInput {
  name: string;
  gender: Gender;
  age: number;
}

/** PATCH /users/me/onboarding/basic-info 응답 (result) */
export interface BasicInfoResult {
  nextStep: 'SKIN_TYPE';
  totalStepCount: number;
}

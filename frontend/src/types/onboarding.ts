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

/** PATCH /users/me/onboarding/skin-types 요청 */
export interface SkinTypeInput {
  skinTypes: SkinTypeCode[];
}

/** PATCH /users/me/onboarding/skin-types 응답 (result) */
export interface SkinTypeResult {
  nextStep: 'HORMONE' | 'COMPLETE';
}

/** PATCH /users/me/onboarding/hormone 요청. lastPeriodStartDate/averageCycleDays는 선택 */
export interface HormoneInput {
  hormoneStatus: HormoneStatus;
  lastPeriodStartDate?: string; // 'YYYY-MM-DD'
  averageCycleDays?: number;
}

/** PATCH /users/me/onboarding/hormone 응답 (result) */
export interface HormoneResult {
  nextStep: 'COMPLETE';
}

export interface OnboardingSummaryRow {
  label: string;
  value: string;
}

/** POST /users/me/onboarding/complete 응답 (result) */
export interface CompleteOnboardingResult {
  onboardingCompleted: true;
  summary: OnboardingSummaryRow[];
}

/** PATCH /users/me/notification 요청 (S-06, S-23 공용) */
export interface NotificationSettingInput {
  enabled: boolean;
}

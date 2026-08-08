// src/types/auth.ts

export type AuthProvider = 'KAKAO' | 'GOOGLE' | 'EMAIL';

export type OnboardingNextStep =
  | 'BASIC_INFO'
  | 'SKIN_TYPE'
  | 'HORMONE'
  | 'COMPLETE'
  | 'NONE';

/** POST /auth/login 응답 (result) */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  onboardingCompleted: boolean;
  nextStep: OnboardingNextStep;
}

/** GET /users/me/onboarding 응답 (result) */
export interface OnboardingStatus {
  onboardingCompleted: boolean;
  nextStep: OnboardingNextStep;
  currentStepIndex: number;
  totalStepCount: number;
  steps: {
    basicInfo: { completed: boolean; required: boolean };
    skinType: { completed: boolean; required: boolean };
    // 성별이 FEMALE이 아니면 서버가 이 필드 자체를 내려주지 않습니다 (ONBOARD-01 BR3)
    hormone?: { completed: boolean; required: boolean };
  };
}

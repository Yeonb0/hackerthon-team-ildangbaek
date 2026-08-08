// api/mock/auth.ts
// TODO: Phase 8 데모 시나리오 값으로 다시 확인 (지금은 "신규 사용자 로그인" 시나리오 고정값)
import type { LoginResult, OnboardingStatus } from '@/types/auth';

export const mockLoginResponse: LoginResult = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  isNewUser: true,
  onboardingCompleted: false,
  nextStep: 'BASIC_INFO',
};

export const mockOnboardingStatusResponse: OnboardingStatus = {
  onboardingCompleted: false,
  nextStep: 'BASIC_INFO',
  currentStepIndex: 1,
  totalStepCount: 2,
  steps: {
    basicInfo: { completed: false, required: true },
    skinType: { completed: false, required: true },
  },
};

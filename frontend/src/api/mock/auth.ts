// api/mock/auth.ts
import { getMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import type { LoginResult, OnboardingStatus } from '@/types/auth';

// 목업 로그인은 "매번 같은 가짜 사용자"를 흉내 냅니다. 이 사용자가 이전에 온보딩을
// 완료한 적 있는지를 mockPersistence로 확인해서 응답을 그때그때 다르게 만듭니다
// (그래야 로그인 직후 판단이랑, 새로고침 후 GET /users/me/onboarding 판단이 서로 안 어긋납니다).
export async function buildMockLoginResponse(): Promise<LoginResult> {
  const completed = await getMockOnboardingCompleted();
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    isNewUser: !completed,
    onboardingCompleted: completed,
    nextStep: completed ? 'NONE' : 'BASIC_INFO',
  };
}

export async function buildMockOnboardingStatusResponse(): Promise<OnboardingStatus> {
  const completed = await getMockOnboardingCompleted();

  if (completed) {
    return {
      onboardingCompleted: true,
      nextStep: 'NONE',
      currentStepIndex: 0,
      totalStepCount: 0,
      steps: {
        basicInfo: { completed: true, required: true },
        skinType: { completed: true, required: true },
      },
    };
  }

  return {
    onboardingCompleted: false,
    nextStep: 'BASIC_INFO',
    currentStepIndex: 1,
    totalStepCount: 2,
    steps: {
      basicInfo: { completed: false, required: true },
      skinType: { completed: false, required: true },
    },
  };
}

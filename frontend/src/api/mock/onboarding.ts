// api/mock/onboarding.ts
import type { BasicInfoResult } from '@/types/onboarding';

export const mockBasicInfoResult: BasicInfoResult = {
  nextStep: 'SKIN_TYPE',
  totalStepCount: 2, // 목업 로그인 시나리오가 성별 미지정이라 2. FEMALE로 테스트하려면 3으로 바꿔서 확인
};

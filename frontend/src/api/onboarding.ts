// src/api/onboarding.ts
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { mockBasicInfoResult } from '@/api/mock/onboarding';
import type { BasicInfoInput, BasicInfoResult } from '@/types/onboarding';

export async function saveBasicInfo(input: BasicInfoInput): Promise<BasicInfoResult> {
  if (USE_MOCK) {
    return mockBasicInfoResult;
  }
  return unwrap<BasicInfoResult>(apiClient.patch('/users/me/onboarding/basic-info', input));
}

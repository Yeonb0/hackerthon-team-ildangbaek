// src/api/onboarding.ts
//
// 진짜 흐름: 각 화면이 자기 필드만 모아서 그 화면 하나의 PATCH로 즉시 저장합니다.
// S-05(완료)는 새로 보낼 데이터가 없고, 서버가 이미 저장해둔 값들로 요약을 만들어 돌려줍니다.
// 그래서 클라이언트 어디에도 "여러 화면 입력을 모아뒀다가 한 번에 보내는" 로직이 없습니다.
//
// USE_MOCK=true일 때만 예외적으로 recordMockXxx()를 호출해 화면 간 입력을 기억해둡니다 —
// 실제 서버가 없는 목업 모드에서 완료 화면 요약이 항상 고정값만 나오면 테스트 체감이 떨어져서
// 붙인 목업 전용 편의 기능입니다 (api/mock/onboarding.ts 참고). 실서버 연동 시엔 전혀 안 쓰입니다.
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import {
  buildMockBasicInfoResult,
  buildMockCompleteResult,
  buildMockSkinTypeResult,
  mockHormoneResult,
  recordMockBasicInfo,
  recordMockHormone,
  recordMockSkinTypes,
} from '@/api/mock/onboarding';
import { setMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import type {
  BasicInfoInput,
  BasicInfoResult,
  CompleteOnboardingResult,
  HormoneInput,
  HormoneResult,
  SkinTypeInput,
  SkinTypeResult,
} from '@/types/onboarding';

export async function saveBasicInfo(input: BasicInfoInput): Promise<BasicInfoResult> {
  if (USE_MOCK) {
    recordMockBasicInfo(input);
    return buildMockBasicInfoResult();
  }
  return unwrap<BasicInfoResult>(apiClient.patch('/users/me/onboarding/basic-info', input));
}

export async function saveSkinTypes(input: SkinTypeInput): Promise<SkinTypeResult> {
  if (USE_MOCK) {
    recordMockSkinTypes(input);
    return buildMockSkinTypeResult();
  }
  return unwrap<SkinTypeResult>(apiClient.patch('/users/me/onboarding/skin-types', input));
}

export async function saveHormoneInfo(input: HormoneInput): Promise<HormoneResult> {
  if (USE_MOCK) {
    recordMockHormone(input);
    return mockHormoneResult;
  }
  return unwrap<HormoneResult>(apiClient.patch('/users/me/onboarding/hormone', input));
}

export async function completeOnboarding(): Promise<CompleteOnboardingResult> {
  if (USE_MOCK) {
    // 새로고침/앱 재시작 후에도 "완료된 상태"가 유지되도록 저장 (login/fetchOnboardingStatus 목업이 이 값을 읽습니다)
    await setMockOnboardingCompleted(true);
    return buildMockCompleteResult();
  }
  return unwrap<CompleteOnboardingResult>(apiClient.post('/users/me/onboarding/complete'));
}
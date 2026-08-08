// src/api/auth.ts
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { mockLoginResponse, mockOnboardingStatusResponse } from '@/api/mock/auth';
import type { AuthProvider, LoginResult, OnboardingStatus } from '@/types/auth';

/**
 * ⚠️ 임시 (Phase 3, 2026-08-08 관리자 결정)
 * 카카오/구글 실제 SDK 연동은 다음 주(백엔드 연동 시점) 예정입니다.
 * 그 전까지는 provider와 무관하게 고정 목업 토큰을 반환합니다.
 * 실제 연동 시 이 함수 내부만 교체하면 됩니다
 * (예: @react-native-seoul/kakao-login, @react-native-google-signin/google-signin).
 */
export async function getOAuthToken(_provider: AuthProvider): Promise<string> {
  return 'MOCK_OAUTH_TOKEN';
}

export async function login(provider: AuthProvider): Promise<LoginResult> {
  const oauthAccessToken = await getOAuthToken(provider);

  if (USE_MOCK) {
    return mockLoginResponse;
  }

  // USE_MOCK=false여도 getOAuthToken이 아직 목업 토큰입니다.
  // 실제 백엔드가 이 토큰을 검증하면 AUTH_LOGIN_FAILED가 날 수 있으니,
  // 백엔드 팀과 테스트용 provider/token 조합을 맞춰서 진행해주세요.
  return unwrap<LoginResult>(apiClient.post('/auth/login', { provider, oauthAccessToken }));
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  if (USE_MOCK) {
    return mockOnboardingStatusResponse;
  }
  return unwrap<OnboardingStatus>(apiClient.get('/users/me/onboarding'));
}

export async function logout(): Promise<void> {
  if (USE_MOCK) return;
  await unwrap<null>(apiClient.post('/auth/logout'));
}

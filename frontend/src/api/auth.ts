// src/api/auth.ts
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockLoginResponse, buildMockOnboardingStatusResponse } from '@/api/mock/auth';
import { setMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import { resetMockSession } from '@/api/mock/onboarding';
import { DEV_OAUTH_TOKEN } from '@/lib/devFlags';
import type { AuthProvider, LoginResult, OnboardingStatus } from '@/types/auth';

/**
 * ⚠️ 임시 (Phase 3, 2026-08-08 관리자 결정)
 * 카카오/구글 실제 SDK 연동은 백엔드 연동 이후 예정입니다.
 * 그 전까지는 provider와 무관하게 고정 목업 토큰을 반환합니다.
 * 실제 연동 시 이 함수 내부만 교체하면 됩니다
 * (예: @react-native-seoul/kakao-login, @react-native-google-signin/google-signin).
 *
 * ⚠️ 2026-08-18 — 이 값이 **어느 계정으로 로그인되는지를 결정합니다.**
 * 백엔드 AuthService.mockProviderUserId()가 `{provider}-{oauthAccessToken}`을
 * providerUserId로 쓰기 때문에, 값이 같으면 로그아웃 후 다시 로그인해도 같은 계정입니다.
 * 온보딩을 처음부터 다시 타려면 .env의 EXPO_PUBLIC_DEV_OAUTH_TOKEN만 바꾸면
 * 백엔드가 새 사용자를 만들어 줍니다(isNewUser=true, nextStep=BASIC_INFO).
 */
export async function getOAuthToken(_provider: AuthProvider): Promise<string> {
  return DEV_OAUTH_TOKEN || 'MOCK_OAUTH_TOKEN';
}

export async function login(provider: AuthProvider): Promise<LoginResult> {
  const oauthAccessToken = await getOAuthToken(provider);

  if (USE_MOCK) {
    return buildMockLoginResponse();
  }

  // 2026-08-18 확인 — 백엔드 AuthService는 현재 oauthAccessToken을 **검증하지 않고**
  // providerUserId 조립에만 씁니다(@NotBlank만 검사). 즉 목업 토큰 그대로 로그인이
  // 통과하고, 해당 조합이 처음이면 계정이 자동 생성됩니다(isNewUser=true).
  // 실제 OAuth 검증이 붙으면 그때부터 AUTH_LOGIN_FAILED가 날 수 있습니다.
  return unwrap<LoginResult>(apiClient.post('/auth/login', { provider, oauthAccessToken }));
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  if (USE_MOCK) {
    return buildMockOnboardingStatusResponse();
  }
  return unwrap<OnboardingStatus>(apiClient.get('/users/me/onboarding'));
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    // 다음 목업 로그인을 "새 사용자" 시나리오로 되돌립니다.
    await setMockOnboardingCompleted(false);
    resetMockSession();
    return;
  }
  await unwrap<null>(apiClient.post('/auth/logout'));
}
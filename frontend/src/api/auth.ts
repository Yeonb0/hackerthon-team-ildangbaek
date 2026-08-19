// src/api/auth.ts
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockLoginResponse, buildMockOnboardingStatusResponse } from '@/api/mock/auth';
import { setMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import { resetMockSession } from '@/api/mock/onboarding';
import { DEV_OAUTH_TOKEN } from '@/lib/devFlags';
import { getItem, setItem } from '@/lib/platformStorage';
import type { AuthProvider, LoginResult, OnboardingStatus } from '@/types/auth';

/**
 * 기기마다 한 번만 생성해 저장하는 목업 OAuth 토큰 키.
 * SecureStore 키 규칙(콜론 금지, 점 표기)을 따릅니다.
 */
const DEVICE_OAUTH_TOKEN_KEY = 'skinteller.dev.deviceOauthToken';

/** 저장소 읽기/쓰기가 실패해도 최소한 앱 세션 동안은 같은 계정을 유지하기 위한 캐시. */
let cachedDeviceToken: string | null = null;

/**
 * 암호학적 강도가 필요 없는 식별자입니다 — 백엔드가 서명 검증을 하지 않고
 * `{provider}-{oauthAccessToken}` 조합으로 사용자를 구분하는 데만 쓰기 때문입니다.
 * expo-crypto 같은 네이티브 모듈을 새로 추가하지 않으려고 JS만으로 만듭니다.
 */
function generateDeviceToken(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `device-${Date.now().toString(36)}-${random}`;
}

/**
 * ⚠️ 임시 (Phase 3, 2026-08-08 관리자 결정)
 * 카카오/구글 실제 SDK 연동은 백엔드 연동 이후 예정입니다.
 * 그 전까지는 provider와 무관하게 목업 토큰을 반환합니다.
 * 실제 연동 시 이 함수 내부만 교체하면 됩니다
 * (예: @react-native-seoul/kakao-login, @react-native-google-signin/google-signin).
 *
 * ⚠️ 이 값이 **어느 계정으로 로그인되는지를 결정합니다.**
 * 백엔드 AuthService.mockProviderUserId()가 `{provider}-{oauthAccessToken}`을
 * providerUserId로 쓰기 때문에, 값이 같으면 로그아웃 후 다시 로그인해도 같은 계정입니다.
 *
 * ⚠️ 2026-08-18 (iOS 팀 배포용 빌드, 관리자 결정 C안) — 예전에는 고정값
 * 'MOCK_OAUTH_TOKEN'을 반환했습니다. 그러면 **하나의 빌드를 여러 기기에 설치했을 때
 * 전원이 같은 계정에 붙습니다** — 첫 사용자가 온보딩을 마치면 나머지는 온보딩 화면을
 * 아예 못 보고, 같은 날짜·슬롯 기록이 서로를 덮어씁니다.
 * 그래서 기기 저장소에 값이 없으면 한 번 생성해 저장하고, 이후로는 그 값을 재사용합니다.
 * 기기 = 계정이 되며 로그아웃해도 유지됩니다.
 *
 * .env에 EXPO_PUBLIC_DEV_OAUTH_TOKEN을 명시하면 그 값이 우선합니다 — 관리자님이
 * 로컬에서 "값만 바꿔 새 계정으로 온보딩 재시작"하던 기존 흐름은 그대로 살아 있습니다.
 */
export async function getOAuthToken(_provider: AuthProvider): Promise<string> {
  // .env 명시값이 최우선 (기존 로컬 테스트 흐름 보존)
  if (DEV_OAUTH_TOKEN) return DEV_OAUTH_TOKEN;

  if (cachedDeviceToken) return cachedDeviceToken;

  try {
    const saved = await getItem(DEVICE_OAUTH_TOKEN_KEY);
    if (saved) {
      cachedDeviceToken = saved;
      return saved;
    }
  } catch {
    // 저장소 읽기 실패 — 아래에서 새로 만듭니다. 여기서 던지면 로그인 자체가 막힙니다.
  }

  const generated = generateDeviceToken();
  // 저장보다 캐시를 먼저 채웁니다 — setItem이 실패해도 앱 세션 동안은 계정이 유지됩니다.
  cachedDeviceToken = generated;
  try {
    await setItem(DEVICE_OAUTH_TOKEN_KEY, generated);
  } catch {
    // 저장 실패는 로그인을 막지 않습니다 (앱 재시작 시 새 계정이 될 수 있음).
  }
  return generated;
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

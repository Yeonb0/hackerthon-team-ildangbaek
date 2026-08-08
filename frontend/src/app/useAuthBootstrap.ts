// src/app/useAuthBootstrap.ts
//
// 앱 시작 시 1회 실행됩니다.
// authStore(zustand)는 메모리 상태라 앱 재시작 시 비어 있으므로,
// SecureStore에 저장된 토큰을 읽어와 authStore를 다시 채우고,
// GET /users/me/onboarding으로 "로그인 상태 유지되는지 + 온보딩 어디까지 했는지"를 한 번에 판정합니다.
//
// ⚠️ 이 훅은 store/authStore.ts를 "쓰는" 쪽이지, authStore.ts 안에 넣지 않았습니다.
// authStore.ts가 api/auth.ts를 import하면 api/auth.ts → api/client.ts → store/authStore.ts로
// 순환참조가 생기기 때문입니다 (Phase 1에서 authStore.ts를 client.ts보다 먼저 만든 이유와 동일한 문제).
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { secureTokenStorage } from '@/lib/secureTokenStorage';
import { fetchOnboardingStatus } from '@/api/auth';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';

export function useAuthBootstrap() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydrateError, setHydrateError] = useState<Error | null>(null);

  const setTokens = useAuthStore((state) => state.setTokens);
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);
  const setOnboardingNextStep = useAuthStore((state) => state.setOnboardingNextStep);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const bootstrap = useCallback(async () => {
    setHydrateError(null);

    const [accessToken, refreshToken] = await Promise.all([
      secureTokenStorage.getAccessToken(),
      secureTokenStorage.getRefreshToken(),
    ]);

    if (!accessToken || !refreshToken) {
      setIsHydrated(true);
      return;
    }

    // apiClient의 요청 인터셉터가 useAuthStore.getState()에서 accessToken을 읽으므로,
    // 아래 fetchOnboardingStatus 호출 전에 반드시 zustand 상태를 먼저 채워야 합니다.
    setTokens(accessToken, refreshToken);

    try {
      const status = await fetchOnboardingStatus();
      setOnboardingCompleted(status.onboardingCompleted);
      setOnboardingNextStep(status.onboardingCompleted ? null : status.nextStep);
      setIsHydrated(true);
    } catch (e) {
      const isAuthDead =
        e instanceof ApiError &&
        (e.code === ErrorCode.AUTH_INVALID_TOKEN || e.code === ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED);

      if (isAuthDead) {
        // client.ts가 이미 refresh를 시도했지만 실패한 상황 -> 로그아웃 처리, S-00으로
        clearAuth();
        setIsHydrated(true);
      } else {
        // 네트워크/서버 오류 -> 토큰은 지우지 않고 재시도 UI만 보여줍니다 (RootNavigator의 ErrorState)
        setHydrateError(e as Error);
        setIsHydrated(true);
      }
    }
  }, [setTokens, setOnboardingCompleted, setOnboardingNextStep, clearAuth]);

  useEffect(() => {
    // 앱 시작 시 1회만 실행되는 부트스트랩입니다 (상태 변화에 반응해 반복 실행되는 게 아님) —
    // "cascading render" 우려가 있는 패턴이 아니라서 아래 규칙만 의도적으로 끕니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isHydrated, hydrateError, retry: bootstrap };
}

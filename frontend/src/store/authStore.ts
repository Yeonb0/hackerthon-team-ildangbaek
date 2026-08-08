import { create } from 'zustand';
import { secureTokenStorage } from '@/lib/secureTokenStorage';
import type { OnboardingNextStep } from '@/types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  onboardingCompleted: boolean;
  /**
   * 온보딩 재개용 (F-AUTH-01 BR6: 마지막 미완료 단계부터 재개).
   * 로그인 직후(POST /auth/login) 또는 자동 로그인 판정(GET /users/me/onboarding) 양쪽에서 채워집니다.
   * onboardingCompleted가 true가 되면 null로 비웁니다.
   */
  onboardingNextStep: OnboardingNextStep | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setOnboardingNextStep: (step: OnboardingNextStep | null) => void;
  clearAuth: () => void; 
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  onboardingCompleted: false,
  onboardingNextStep: null,
  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    // client.ts의 401 refresh 성공 시에도 이 함수를 타므로,
    // 갱신된 토큰이 SecureStore에도 같이 반영됩니다 (기존에는 메모리에만 반영되던 부분).
    secureTokenStorage.setTokens(accessToken, refreshToken).catch(() => {
      // 저장 실패해도 메모리 상 로그인 상태는 유지 — 다음 앱 재시작 때만 영향
    });
  },
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  setOnboardingNextStep: (step) => set({ onboardingNextStep: step }),
  clearAuth: () => {
    set({
      accessToken: null,
      refreshToken: null,
      onboardingCompleted: false,
      onboardingNextStep: null,
    });
    secureTokenStorage.clear().catch(() => {});
  },
}));
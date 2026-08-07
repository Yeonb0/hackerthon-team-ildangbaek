import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  onboardingCompleted: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  onboardingCompleted: false,
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  clearAuth: () => set({ accessToken: null, refreshToken: null, onboardingCompleted: false }),
}));
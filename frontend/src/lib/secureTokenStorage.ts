// src/lib/secureTokenStorage.ts
// 로드맵 Phase 3-1 규칙: AsyncStorage가 아니라 expo-secure-store를 씁니다.
// authStore(zustand)는 메모리 상태라 앱을 완전히 종료하면 날아갑니다 —
// 이 모듈이 재실행 시 복원할 원본(source of truth)을 담당합니다.
//
// 웹에서의 localStorage 폴백은 lib/platformStorage.ts 참고 (expo-secure-store가 웹 미지원이라
// Platform.OS === 'web'일 때만 대체됨).
import { deleteItem, getItem, setItem } from '@/lib/platformStorage';

const ACCESS_TOKEN_KEY = 'skinteller.accessToken';
const REFRESH_TOKEN_KEY = 'skinteller.refreshToken';

export const secureTokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([setItem(ACCESS_TOKEN_KEY, accessToken), setItem(REFRESH_TOKEN_KEY, refreshToken)]);
  },

  async clear(): Promise<void> {
    await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
  },
};

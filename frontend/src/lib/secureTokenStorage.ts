// src/lib/secureTokenStorage.ts
// 로드맵 Phase 3-1 규칙: AsyncStorage가 아니라 expo-secure-store를 씁니다.
// authStore(zustand)는 메모리 상태라 앱을 완전히 종료하면 날아갑니다 —
// 이 모듈이 재실행 시 복원할 원본(source of truth)을 담당합니다.
//
// ⚠️ expo-secure-store는 웹을 지원하지 않습니다 (네이티브 전용 모듈 — 웹 구현체가 빈 스텁이라
// getItemAsync 호출 시 "getValueWithKeyAsync is not a function" 에러가 납니다).
// 브라우저 미리보기(expo start --web)로 개발/검증하는 경우가 많아서,
// 웹에서만 localStorage로 대체합니다. 실제 배포 대상인 iOS/Android는 그대로 SecureStore를 씁니다.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'skinteller.accessToken';
const REFRESH_TOKEN_KEY = 'skinteller.refreshToken';

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

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
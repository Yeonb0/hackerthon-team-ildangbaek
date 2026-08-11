// src/lib/platformStorage.ts
// 웹은 expo-secure-store를 지원하지 않아서(네이티브 전용 모듈) Platform.OS === 'web'일 때만
// localStorage로 대체하는 범용 get/set/delete입니다. secureTokenStorage.ts(실제 토큰)와
// api/mock/mockPersistence.ts(목업 전용 완료 플래그)가 이 모듈을 공통으로 씁니다.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

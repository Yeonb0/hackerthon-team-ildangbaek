// src/lib/reloadApp.ts
//
// 2026-08-15 — 글꼴 기능 A안. 글꼴 전환은 JS 번들을 다시 평가해야 반영되므로
// (typography.ts 주석 참고) 저장 직후 앱을 리로드합니다.
//
// 현재 지원 범위:
//  - web        : window.location.reload()
//  - dev build  : DevSettings.reload()  ← 해커톤 시연 경로
//  - 프로덕션    : 미지원. expo-updates를 붙이면 Updates.reloadAsync()로 대체 가능합니다.
//                 (지금은 canReloadApp()이 false를 반환하고, 호출부가 "다음 실행부터
//                  적용됩니다" 안내 팝업으로 폴백합니다.)
import { DevSettings, Platform } from 'react-native';

export function canReloadApp(): boolean {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined';
  }
  return __DEV__ && typeof DevSettings?.reload === 'function';
}

export function reloadApp(): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return;
  }
  if (__DEV__ && typeof DevSettings?.reload === 'function') {
    DevSettings.reload();
  }
}

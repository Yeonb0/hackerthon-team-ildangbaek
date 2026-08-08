// src/components/dev/DevResetButton.tsx
//
// 폰(Expo Go 등)에는 브라우저 콘솔이 없어서 localStorage를 못 지웁니다.
// 이 버튼은 __DEV__ 빌드에서만 항상 화면 위에 떠 있고, 누르면
// - authStore 초기화 (accessToken/refreshToken 등 SecureStore까지 같이 삭제 — authStore.clearAuth 내부에서 처리)
// - 온보딩 진행률 스토어 초기화
// - 목업 온보딩 완료 플래그 초기화
// 를 한 번에 처리합니다. 누르는 즉시 RootNavigator가 accessToken=null을 감지해서
// 자동으로 로그인 화면(S-00)으로 전환되므로, 앱을 다시 켤 필요가 없습니다.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { setMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import { resetMockSession } from '@/api/mock/onboarding';
import { color, radius, space } from '@/theme/tokens';

export function DevResetButton() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setTotalStepCount = useOnboardingStore((state) => state.setTotalStepCount);
  const [resetting, setResetting] = useState(false);

  if (!__DEV__) return null;

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await setMockOnboardingCompleted(false);
      setTotalStepCount(null);
      resetMockSession();
      clearAuth();
    } finally {
      setResetting(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="목업 상태 초기화 (개발용)"
      onPress={handleReset}
      disabled={resetting}
      style={styles.button}
    >
      <Text style={styles.label}>{resetting ? '초기화 중…' : '🧪 초기화'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: space[6],
    right: space[4],
    backgroundColor: color.ink900,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    opacity: 0.85,
    zIndex: 999,
    elevation: 999, // Android는 zIndex만으론 안 먹어서 elevation도 같이
  },
  label: {
    color: color.bg,
    fontSize: 12,
    fontWeight: '600',
  },
});
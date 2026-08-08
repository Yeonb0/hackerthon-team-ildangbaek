// src/screens/auth/LoginScreen.tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/base/Button';
import { useAuthStore } from '@/store/authStore';
import { login as loginApi } from '@/api/auth';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { AuthProvider } from '@/types/auth';

export function LoginScreen() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);
  const setOnboardingNextStep = useAuthStore((state) => state.setOnboardingNextStep);

  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (provider: AuthProvider) => {
    if (loadingProvider) return; // 중복 탭 방지 (F-SYSTEM-02)
    setErrorMessage(null);
    setLoadingProvider(provider);
    try {
      const result = await loginApi(provider);
      setTokens(result.accessToken, result.refreshToken);
      setOnboardingCompleted(result.onboardingCompleted);
      setOnboardingNextStep(result.onboardingCompleted ? null : result.nextStep);
      // 화면 이동은 여기서 하지 않습니다.
      // RootNavigator가 accessToken/onboardingCompleted 변화를 감지해서 자동으로 넘어갑니다.
    } catch {
      // AUTH_UNSUPPORTED_PROVIDER / AUTH_LOGIN_FAILED / 네트워크 오류 전부
      // 화면을 덮지 않고 인라인 문구로만 안내합니다.
      setErrorMessage('로그인에 실패했어요. 다시 시도해주세요.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.title}>skinteller</Text>
        <Text style={styles.subtitle}>성분과 피부 변화를 연결해서 기록해요</Text>
      </View>

      <View style={styles.buttonGroup}>
        <Button
          label="카카오로 시작하기"
          variant="primary"
          loading={loadingProvider === 'KAKAO'}
          onPress={() => handleLogin('KAKAO')}
        />
        <Button
          label="구글로 시작하기"
          variant="secondary"
          loading={loadingProvider === 'GOOGLE'}
          onPress={() => handleLogin('GOOGLE')}
        />
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {/* 데모/개발 안내 — 다음 주 실제 SDK 연동 후 제거 예정 */}
      <Text style={styles.mockNotice}>지금은 목업 로그인으로 동작합니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space[6],
    backgroundColor: color.bg,
  },
  brand: {
    alignItems: 'center',
    marginBottom: space[8],
  },
  title: {
    fontSize: s(32),
    fontWeight: '700',
    color: color.ink900,
    marginBottom: space[2],
  },
  subtitle: {
    fontSize: s(14),
    color: color.ink600,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: space[3],
  },
  errorText: {
    color: color.statusCaution,
    marginTop: space[4],
    fontSize: s(13),
  },
  mockNotice: {
    marginTop: space[6],
    fontSize: s(12),
    color: color.ink300,
  },
});

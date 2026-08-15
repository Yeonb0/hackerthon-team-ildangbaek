// src/screens/auth/LoginScreen.tsx
import { useState } from 'react';
import { View, Image, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/base/Button';
import { IconKakao, IconGoogle } from '@/components/icons';
import { useAuthStore } from '@/store/authStore';
import { login as loginApi } from '@/api/auth';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { AuthProvider } from '@/types/auth';
import { weightFamily } from '@/theme/typography';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
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
        <Image source={require('../../../assets/skinteller-logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.buttonGroup}>
        {/*
          2026-08-15 — 카카오/구글 = 흰 배경 + outline + 브랜드 아이콘, 이메일 = 그라데이션
          (관리자 결정). 기존엔 카카오/구글이 그라데이션 primary, 이메일이 outline이었던
          걸 정반대로 뒤집었습니다. Figma GUI 원본은 카카오 버튼 배경이 카카오 옐로우
          (#FEE500)인데, 관리자님이 명시적으로 "흰 배경"을 요청하셔서 구글과 동일한
          outline 스타일로 통일했습니다.
        */}
        <Button
          label="카카오로 시작하기"
          variant="outline"
          icon={<IconKakao size={20} />}
          loading={loadingProvider === 'KAKAO'}
          onPress={() => handleLogin('KAKAO')}
        />
        <Button
          label="구글로 시작하기"
          variant="outline"
          icon={<IconGoogle size={20} />}
          loading={loadingProvider === 'GOOGLE'}
          onPress={() => handleLogin('GOOGLE')}
        />
        <Button
          label="이메일로 로그인하기"
          variant="primary"
          onPress={() => navigation.navigate(AuthRoutes.EmailLogin)}
        />
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        style={styles.signupLink}
        onPress={() => navigation.navigate(AuthRoutes.EmailSignup)}
      >
        <Text style={styles.signupLinkText}>이메일로 회원가입</Text>
      </Pressable>

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
  logo: {
    width: s(290),
    height: s(290),
  },
  buttonGroup: {
    width: '100%',
    gap: space[3],
  },
  errorText: {
    color: color.statusCaution,
    marginTop: space[4],
    fontSize: s(13),
    ...weightFamily('regular'),
  },
  signupLink: {
    marginTop: space[5],
  },
  signupLinkText: {
    // 2026-08-15 — 관리자 요청으로 13 → 11 축소.
    fontSize: s(11),
    ...weightFamily('regular'),
    color: color.textSub,
    textDecorationLine: 'underline',
  },
  mockNotice: {
    marginTop: space[6],
    fontSize: s(12),
    ...weightFamily('regular'),
    color: color.ink300,
  },
});

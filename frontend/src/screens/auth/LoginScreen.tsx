// src/screens/auth/LoginScreen.tsx
import { useState } from 'react';
import { View, Image, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/base/Button';
import { useAuthStore } from '@/store/authStore';
import { login as loginApi } from '@/api/auth';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { AuthProvider } from '@/types/auth';

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
        {/*
          Checkpoint 9-C — 로고 안에 이미 영문 태그라인("TELL YOUR SKIN STORY")이 있어서
          기존 한글 부제("성분과 피부 변화를 연결해서 기록해요")는 중복으로 보여 삭제했습니다
          (관리자님 확인 2026-08-11). 아이콘용 크롭본은 디자인팀에서 받는 대로 별도 적용 예정 —
          여기 쓰는 건 전체 로고(마스코트+워드마크+태그라인) 원본입니다.
        */}
        <Image source={require('../../../assets/Skinteller-logo.png')} style={styles.logo} resizeMode="contain" />
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
          variant="primary"
          loading={loadingProvider === 'GOOGLE'}
          onPress={() => handleLogin('GOOGLE')}
        />
        {/*
          이메일 버튼은 카카오/구글과 달리 즉시 로그인하지 않고 AUTH-03(이메일 로그인)
          화면으로 이동합니다 — Figma AUTH-01 구조 기준 (Phase 11-A).
          디자인은 관리자님 요청으로 카카오/구글=필드형(primary), 이메일=아웃라인형(secondary)
          으로 통일했습니다 (2026-08-13).
        */}
        <Button
          label="이메일로 계속하기"
          variant="secondary"
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
  },
  signupLink: {
    marginTop: space[5],
  },
  signupLinkText: {
    fontSize: s(13),
    color: color.ink600,
    textDecorationLine: 'underline',
  },
  mockNotice: {
    marginTop: space[6],
    fontSize: s(12),
    color: color.ink300,
  },
});

// src/screens/auth/VerificationSuccessScreen.tsx — AUTH-06.1
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '@/components/base/Button';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { useAuthStore } from '@/store/authStore';
import { completeEmailSignup } from '@/api/emailAuth';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export function VerificationSuccessScreen() {
  const route = useRoute<RouteProp<AuthStackParamList, 'VerificationSuccess'>>();
  const { email, password } = route.params;

  const setTokens = useAuthStore((state) => state.setTokens);
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);
  const setOnboardingNextStep = useAuthStore((state) => state.setOnboardingNextStep);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleContinue = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await completeEmailSignup(email, password);
      setTokens(result.accessToken, result.refreshToken);
      setOnboardingCompleted(result.onboardingCompleted);
      setOnboardingNextStep(result.onboardingCompleted ? null : result.nextStep);
      // 화면 이동은 여기서 하지 않습니다 — RootNavigator가 accessToken 변화를 감지해
      // 자동으로 온보딩(S-01)으로 넘어갑니다 (LoginScreen과 동일 패턴).
    } catch (e) {
      // 2026-08-19(세션 20) — 실 API(POST /auth/email/signup) 교체로 서버가 구분해주는
      // 실패 사유가 생겼습니다. 전부 같은 문구로 뭉치면 사용자가 다음에 뭘 해야 할지
      // 알 수 없어서(로그인으로 갈지, 인증을 다시 받을지) 두 가지만 갈라 씁니다.
      if (e instanceof ApiError && e.code === ErrorCode.USER_ALREADY_EXISTS) {
        setSubmitError('이미 가입된 이메일이에요. 이메일 로그인으로 진행해주세요.');
      } else if (e instanceof ApiError && e.code === ErrorCode.COMMON_VALIDATION_FAILED) {
        // 서버는 인증 기록을 10분만 들고 있고, 서버가 재시작되면 그마저 사라집니다.
        setSubmitError('인증 유효시간이 지났어요. 인증을 다시 받아주세요.');
      } else {
        setSubmitError('가입 완료 처리에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>인증이 완료됐어요!</Text>

      {submitError ? <InlineErrorBanner message={submitError} style={styles.errorBanner} /> : null}

      <Button
        label="계속하기"
        variant="primary"
        loading={isSubmitting}
        onPress={handleContinue}
        style={styles.submitButton}
      />
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
  emoji: {
    fontSize: adjustFontSize(48),
    ...weightFamily('regular'),
    marginBottom: space[4],
  },
  title: {
    fontSize: adjustFontSize(20),
    ...weightFamily('bold'),
    color: color.ink900,
    textAlign: 'center',
  },
  errorBanner: {
    marginTop: space[4],
    width: '100%',
  },
  submitButton: {
    marginTop: space[8],
    width: '100%',
  },
});

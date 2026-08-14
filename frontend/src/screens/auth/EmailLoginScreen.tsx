// src/screens/auth/EmailLoginScreen.tsx — AUTH-03
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { IconBack } from '@/components/icons';
import { useAuthStore } from '@/store/authStore';
import { loginWithEmail } from '@/api/emailAuth';
import { isValidEmail } from '@/lib/emailAuthValidation';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';

export function EmailLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'EmailLogin'>>();
  const insets = useSafeAreaInsets();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);
  const setOnboardingNextStep = useAuthStore((state) => state.setOnboardingNextStep);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = isValidEmail(email) && password.length > 0 && !isSubmitting;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await loginWithEmail(email.trim(), password);
      setTokens(result.accessToken, result.refreshToken);
      setOnboardingCompleted(result.onboardingCompleted);
      setOnboardingNextStep(result.onboardingCompleted ? null : result.nextStep);
      // LoginScreen과 동일 — RootNavigator가 accessToken 변화를 감지해 자동 전환합니다.
    } catch {
      setErrorMessage('로그인에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={8}
          style={styles.navBackButton}
        >
          <IconBack size={22} color={color.ink900} />
        </Pressable>
      </View>
      <View style={styles.container}>
      <Text style={styles.title}>이메일로 로그인</Text>

      <View style={styles.form}>
        <Input
          label="이메일"
          value={email}
          onChangeText={setEmail}
          placeholder="example@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Input
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
          textContentType="password"
        />

        {/*
          TODO(Phase 11 이후): 비밀번호 재설정 플로우는 이번 스코프에 없어서(관리자 확정 범위
          밖) 우선 비활성 텍스트로만 둡니다. 필요해지면 별도 체크포인트로 논의 필요.
        */}
        <Text style={styles.forgotPassword}>비밀번호를 잊었나요?</Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Button
        label="로그인"
        variant="primary"
        loading={isSubmitting}
        onPress={handleLogin}
        style={styles.submitButton}
      />

      <Pressable
        style={styles.signupLink}
        onPress={() => navigation.navigate(AuthRoutes.EmailSignup)}
      >
        <Text style={styles.signupLinkText}>이메일로 회원가입</Text>
      </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  navBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[6],
    backgroundColor: color.bg,
  },
  title: {
    fontSize: 20,
    ...weightFamily('bold'),
    color: color.ink900,
    marginBottom: space[6],
    textAlign: 'center',
  },
  form: {
    gap: space[4],
  },
  forgotPassword: {
    fontSize: 13,
    ...weightFamily('regular'),
    color: color.ink300,
    textAlign: 'right',
  },
  errorText: {
    color: color.statusCaution,
    marginTop: space[4],
    fontSize: 13,
    ...weightFamily('regular'),
  },
  submitButton: {
    marginTop: space[6],
  },
  signupLink: {
    marginTop: space[6],
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 13,
    ...weightFamily('regular'),
    color: color.ink600,
    textDecorationLine: 'underline',
  },
});

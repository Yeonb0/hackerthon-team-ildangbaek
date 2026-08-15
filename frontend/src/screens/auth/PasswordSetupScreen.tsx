// src/screens/auth/PasswordSetupScreen.tsx — AUTH-05 (회원가입 2단계: 비밀번호 설정)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { IconBack } from '@/components/icons';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { sendVerificationCode } from '@/api/emailAuth';
import { isValidPassword } from '@/lib/emailAuthValidation';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export function PasswordSetupScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'PasswordSetup'>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<AuthStackParamList, 'PasswordSetup'>>();
  const { email } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isFormatValid = isValidPassword(password);
  const isMatching = password.length > 0 && password === confirmPassword;
  const showFormatError = password.length > 0 && !isFormatValid;
  const showMatchError = confirmPassword.length > 0 && !isMatching;
  const canSubmit = isFormatValid && isMatching && !isSubmitting;

  const handleNext = async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      // AUTH-06 진입 전 인증코드를 발송해둡니다 (재전송 쿨다운도 이 시점부터 시작).
      await sendVerificationCode(email);
      navigation.navigate(AuthRoutes.EmailVerification, { email, password });
    } catch {
      setSubmitError('인증코드 발송에 실패했어요. 다시 시도해주세요.');
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
      <Text style={styles.title}>비밀번호 설정</Text>
      <Text style={styles.subtitle}>영문·숫자 포함 8자 이상</Text>

      <View style={styles.form}>
        <Input
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
          textContentType="newPassword"
          error={showFormatError ? '영문·숫자 포함 8자 이상 입력해주세요.' : null}
        />
        <Input
          label="비밀번호 확인"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="비밀번호 확인"
          secureTextEntry
          textContentType="newPassword"
          error={showMatchError ? '비밀번호가 일치하지 않아요.' : null}
        />
      </View>

      {submitError ? <InlineErrorBanner message={submitError} style={styles.errorBanner} /> : null}

      <Button
        label="다음"
        variant="primary"
        loading={isSubmitting}
        disabled={!canSubmit}
        onPress={handleNext}
        style={styles.submitButton}
      />
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
    height: 68,
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
    fontSize: adjustFontSize(20),
    ...weightFamily('bold'),
    color: color.ink900,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
    marginTop: space[2],
    marginBottom: space[6],
  },
  form: {
    gap: space[4],
  },
  errorBanner: {
    marginTop: space[4],
  },
  submitButton: {
    marginTop: space[6],
  },
});

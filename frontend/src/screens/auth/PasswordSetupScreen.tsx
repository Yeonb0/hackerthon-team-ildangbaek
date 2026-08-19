// src/screens/auth/PasswordSetupScreen.tsx — AUTH-05 (회원가입 2단계: 비밀번호 설정)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { KeyboardAvoidingScreen } from '@/components/base/KeyboardAvoidingScreen';
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
      <KeyboardAvoidingScreen contentContainerStyle={styles.container}>
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
      </KeyboardAvoidingScreen>
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
    // ⚠️ ScrollView의 contentContainer라 flex:1이 아니라 flexGrow:1입니다
    // (flex:1이면 내용이 화면 높이에 묶여 스크롤이 죽습니다).
    flexGrow: 1,
    // 2026-08-19(세션 19, 관리자님 11번 항목) — 예전엔 justifyContent:'center'로 세로
    // 가운데 정렬이라, 뒤로가기 바 아래로 한참 내려간 자리에서 입력이 시작됐습니다.
    // 위쪽 정렬로 바꿔 제목이 헤더 바로 아래에 붙습니다.
    //
    // ⚠️ 'flex-start'를 쓰지 않고 아예 지운 이유 — 기본값이 이미 'flex-start'이고,
    // 명시하면 "일부러 위로 붙였다"는 의도가 아래 paddingTop과 중복돼 읽힙니다.
    paddingHorizontal: space[6],
    // 헤더(뒤로가기)와 제목 사이 간격. 위아래 여백을 따로 두는 이유는, 키보드가 올라와
    // 남는 높이가 줄었을 때 마지막 요소가 화면 끝에 붙지 않게 하기 위함입니다.
    paddingTop: space[4],
    paddingBottom: space[6],
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

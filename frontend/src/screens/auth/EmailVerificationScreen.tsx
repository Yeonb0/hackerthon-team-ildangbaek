// src/screens/auth/EmailVerificationScreen.tsx — AUTH-06
import { useEffect, useState } from 'react';
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
import { getResendRemainingSeconds, sendVerificationCode, verifyEmailCode } from '@/api/emailAuth';
import { isValidVerificationCode } from '@/lib/emailAuthValidation';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export function EmailVerificationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<AuthStackParamList, 'EmailVerification'>>();
  const { email, password } = route.params;

  const [code, setCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // 화면 진입 시 실제 남은 쿨다운을 조회 (PasswordSetup에서 발송한 시점 기준).
  useEffect(() => {
    // 서버가 이메일별로 쿨다운을 관리하므로 email을 넘깁니다(세션 20 실 API 교체).
    // 실패해도 화면을 막지 않습니다 — 0초가 되어 재전송 버튼이 활성화될 뿐입니다.
    getResendRemainingSeconds(email).then(setRemainingSeconds).catch(() => setRemainingSeconds(0));
    // email은 route param이라 이 화면 생애주기 동안 바뀌지 않습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1초마다 카운트다운. 0이 되면 재전송 버튼이 활성화됩니다.
  // (매초 setRemainingSeconds가 바뀌어도 인터벌을 재생성하지 않도록 isCountingDown으로만 의존)
  const isCountingDown = remainingSeconds > 0;
  useEffect(() => {
    if (!isCountingDown) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCountingDown]);

  const canVerify = isValidVerificationCode(code) && !isVerifying;
  const canResend = remainingSeconds <= 0 && !isResending;

  const handleVerify = async () => {
    if (!canVerify) return;
    setVerifyError(null);
    setIsVerifying(true);
    try {
      const success = await verifyEmailCode(email, code);
      if (success) {
        navigation.replace(AuthRoutes.VerificationSuccess, { email, password });
      } else {
        navigation.replace(AuthRoutes.VerificationFail, { email, password });
      }
    } catch {
      // 2026-08-19(세션 20) — 실 API로 바꾸면서 생긴 분기입니다. 네트워크·서버 오류는
      // "코드가 틀렸다"가 아니므로 실패 화면(AUTH-06.2)으로 보내면 안 됩니다.
      // 입력값을 유지한 채 이 화면에서 다시 시도하게 둡니다.
      setVerifyError('인증에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setIsResending(true);
    try {
      await sendVerificationCode(email);
      setRemainingSeconds(await getResendRemainingSeconds(email));
    } finally {
      setIsResending(false);
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
      <Text style={styles.title}>이메일 인증</Text>
      <Text style={styles.subtitle}>{email}로 보낸 6자리 코드를 입력해주세요</Text>

      <Input
        value={code}
        onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
      />

      <Pressable
        style={styles.resendRow}
        onPress={handleResend}
        disabled={!canResend}
        accessibilityState={{ disabled: !canResend }}
      >
        <Text style={styles.resendText}>
          코드를 못 받았나요?{' '}
          <Text style={canResend ? styles.resendActive : styles.resendInactive}>
            {canResend ? '재전송' : `재전송 (${remainingSeconds}초 후)`}
          </Text>
        </Text>
      </Pressable>

      {verifyError ? (
        <InlineErrorBanner message={verifyError} style={styles.errorBanner} />
      ) : null}

      <Button
        label="인증 완료"
        variant="primary"
        loading={isVerifying}
        disabled={!canVerify}
        onPress={handleVerify}
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
  errorBanner: {
    marginTop: space[4],
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
  resendRow: {
    marginTop: space[4],
    alignItems: 'center',
  },
  resendText: {
    fontSize: adjustFontSize(13),
    ...weightFamily('regular'),
    color: color.ink600,
  },
  resendActive: {
    color: color.brand700,
    ...weightFamily('bold'),
    textDecorationLine: 'underline',
  },
  resendInactive: {
    color: color.ink300,
  },
  submitButton: {
    marginTop: space[6],
  },
});

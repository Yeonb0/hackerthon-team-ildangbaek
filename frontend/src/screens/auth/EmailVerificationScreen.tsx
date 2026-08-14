// src/screens/auth/EmailVerificationScreen.tsx — AUTH-06
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { IconBack } from '@/components/icons';
import { getResendRemainingSeconds, sendVerificationCode, verifyEmailCode } from '@/api/emailAuth';
import { isValidVerificationCode } from '@/lib/emailAuthValidation';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';

export function EmailVerificationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<AuthStackParamList, 'EmailVerification'>>();
  const { email, password } = route.params;

  const [code, setCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // 화면 진입 시 실제 남은 쿨다운을 조회 (PasswordSetup에서 발송한 시점 기준).
  useEffect(() => {
    getResendRemainingSeconds().then(setRemainingSeconds);
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
    setIsVerifying(true);
    try {
      const success = await verifyEmailCode(email, code);
      if (success) {
        navigation.replace(AuthRoutes.VerificationSuccess, { email, password });
      } else {
        navigation.replace(AuthRoutes.VerificationFail, { email, password });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setIsResending(true);
    try {
      await sendVerificationCode(email);
      setRemainingSeconds(await getResendRemainingSeconds());
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
      <View style={styles.container}>
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

      <Button
        label="인증 완료"
        variant="primary"
        loading={isVerifying}
        disabled={!canVerify}
        onPress={handleVerify}
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
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
    fontSize: 13,
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

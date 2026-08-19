// src/screens/auth/EmailSignupScreen.tsx — AUTH-04 (회원가입 1단계: 이메일)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { KeyboardAvoidingScreen } from '@/components/base/KeyboardAvoidingScreen';
import { Input } from '@/components/base/Input';
import { IconBack } from '@/components/icons';
import { isValidEmail } from '@/lib/emailAuthValidation';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export function EmailSignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'EmailSignup'>>();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const trimmedEmail = email.trim();
  const isValid = isValidEmail(trimmedEmail);
  const showError = touched && email.length > 0 && !isValid;

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    navigation.navigate(AuthRoutes.PasswordSetup, { email: trimmedEmail });
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
      <Text style={styles.title}>이메일로 회원가입</Text>

      <Input
        label="이메일"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setTouched(false);
        }}
        onBlur={() => setTouched(true)}
        placeholder="example@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={showError ? '이메일 형식을 확인해주세요.' : null}
      />

      <Button label="다음" variant="primary" disabled={!isValid} onPress={handleNext} style={styles.submitButton} />

      <Pressable style={styles.loginLink} onPress={() => navigation.navigate(AuthRoutes.EmailLogin)}>
        <Text style={styles.loginLinkText}>이미 계정이 있으신가요? 로그인하기</Text>
      </Pressable>
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
    marginBottom: space[6],
    textAlign: 'center',
  },
  submitButton: {
    marginTop: space[6],
  },
  loginLink: {
    marginTop: space[6],
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: adjustFontSize(13),
    ...weightFamily('regular'),
    color: color.ink600,
    textDecorationLine: 'underline',
  },
});

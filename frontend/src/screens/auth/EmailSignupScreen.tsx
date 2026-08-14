// src/screens/auth/EmailSignupScreen.tsx — AUTH-04 (회원가입 1단계: 이메일)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { IconBack } from '@/components/icons';
import { isValidEmail } from '@/lib/emailAuthValidation';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';

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
      <View style={styles.container}>
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
  submitButton: {
    marginTop: space[6],
  },
  loginLink: {
    marginTop: space[6],
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 13,
    ...weightFamily('regular'),
    color: color.ink600,
    textDecorationLine: 'underline',
  },
});

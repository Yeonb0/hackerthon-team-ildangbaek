// src/screens/auth/EmailSignupScreen.tsx — AUTH-04 (회원가입 1단계: 이메일)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { isValidEmail } from '@/lib/emailAuthValidation';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';

export function EmailSignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'EmailSignup'>>();

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[6],
    backgroundColor: color.bg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
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
    color: color.ink600,
    textDecorationLine: 'underline',
  },
});

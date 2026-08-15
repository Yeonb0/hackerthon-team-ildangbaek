// src/screens/auth/VerificationFailScreen.tsx — AUTH-06.2
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '@/components/base/Button';
import { sendVerificationCode } from '@/api/emailAuth';
import { AuthRoutes, AuthStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';

export function VerificationFailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'VerificationFail'>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'VerificationFail'>>();
  const { email, password } = route.params;

  const [isResending, setIsResending] = useState(false);

  const goToVerification = () => {
    navigation.replace(AuthRoutes.EmailVerification, { email, password });
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      await sendVerificationCode(email);
      goToVerification();
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>코드가 맞지 않아요</Text>
      <Text style={styles.subtitle}>입력한 인증코드를 다시 확인해주세요</Text>

      <View style={styles.buttonGroup}>
        <Button label="재전송" variant="primary" loading={isResending} onPress={handleResend} />
        <Button label="다시 입력" variant="secondary" onPress={goToVerification} />
      </View>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: color.ink900,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: color.ink600,
    textAlign: 'center',
    marginTop: space[2],
    marginBottom: space[8],
  },
  buttonGroup: {
    width: '100%',
    gap: space[3],
  },
});

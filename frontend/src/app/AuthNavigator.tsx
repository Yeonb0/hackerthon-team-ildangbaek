// src/app/AuthNavigator.tsx
// Phase 11-A — AuthStackParamList에 이메일 인증 플로우가 추가되면서 LoginScreen 단독 렌더링
// 대신 중첩 스택 네비게이터가 필요해졌습니다 (OnboardingNavigator와 동일한 구조).
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthRoutes, AuthStackParamList } from './routes';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { EmailLoginScreen } from '@/screens/auth/EmailLoginScreen';
import { EmailSignupScreen } from '@/screens/auth/EmailSignupScreen';
import { PasswordSetupScreen } from '@/screens/auth/PasswordSetupScreen';
import { EmailVerificationScreen } from '@/screens/auth/EmailVerificationScreen';
import { VerificationSuccessScreen } from '@/screens/auth/VerificationSuccessScreen';
import { VerificationFailScreen } from '@/screens/auth/VerificationFailScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={AuthRoutes.Login}>
      <Stack.Screen name={AuthRoutes.Login} component={LoginScreen} />
      <Stack.Screen name={AuthRoutes.EmailLogin} component={EmailLoginScreen} />
      <Stack.Screen name={AuthRoutes.EmailSignup} component={EmailSignupScreen} />
      <Stack.Screen name={AuthRoutes.PasswordSetup} component={PasswordSetupScreen} />
      <Stack.Screen name={AuthRoutes.EmailVerification} component={EmailVerificationScreen} />
      <Stack.Screen name={AuthRoutes.VerificationSuccess} component={VerificationSuccessScreen} />
      <Stack.Screen name={AuthRoutes.VerificationFail} component={VerificationFailScreen} />
    </Stack.Navigator>
  );
}
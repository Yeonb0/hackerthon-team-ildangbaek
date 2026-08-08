import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { RootStackParamList, OnboardingRoutes, OnboardingStackParamList } from './routes';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { useAuthBootstrap } from './useAuthBootstrap';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import type { OnboardingNextStep } from '@/types/auth';

import CatalogScreen from '@/screens/dev/CatalogScreen';
import { SHOW_CATALOG } from '@/lib/devFlags';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NEXT_STEP_TO_ONBOARDING_ROUTE: Partial<
  Record<OnboardingNextStep, keyof OnboardingStackParamList>
> = {
  BASIC_INFO: OnboardingRoutes.BasicInfo,
  SKIN_TYPE: OnboardingRoutes.SkinType,
  HORMONE: OnboardingRoutes.Hormone,
  COMPLETE: OnboardingRoutes.OnboardingComplete,
};

export function RootNavigator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);
  const onboardingNextStep = useAuthStore((s) => s.onboardingNextStep);
  const { isHydrated, hydrateError, retry } = useAuthBootstrap();

  // ↓ 이 3줄 추가 — 항상 함수 맨 위, 다른 로직보다 먼저
  if (SHOW_CATALOG) {
    return <CatalogScreen />;
  }

  // 앱 시작 시 GET /users/me/onboarding 자체가 네트워크/서버 오류로 실패한 경우.
  // 스플래시 단계라 잃을 입력이 없으므로 풀스크린 ErrorState + 재시도를 그대로 씁니다.
  if (isHydrated && hydrateError) {
    return <ErrorState variant="network" onRetry={retry} />;
  }

  if (!isHydrated) {
    return <LoadingState variant="spinner" />;
  }

  const initialOnboardingRoute = onboardingNextStep
    ? NEXT_STEP_TO_ONBOARDING_ROUTE[onboardingNextStep]
    : undefined;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!accessToken ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : !onboardingCompleted ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingNavigator initialRouteName={initialOnboardingRoute} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
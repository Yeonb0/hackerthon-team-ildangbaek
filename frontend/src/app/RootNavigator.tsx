import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { RootStackParamList } from './routes';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '@/screens/auth/LoginScreen';

import CatalogScreen from '@/screens/dev/CatalogScreen';
import { SHOW_CATALOG } from '@/lib/devFlags';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);

  // ↓ 이 3줄 추가 — 항상 함수 맨 위, 다른 로직보다 먼저
  if (SHOW_CATALOG) {
    return <CatalogScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!accessToken ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : !onboardingCompleted ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
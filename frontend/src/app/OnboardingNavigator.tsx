import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingRoutes, OnboardingStackParamList } from './routes';
import { BasicInfoScreen } from '@/screens/onboarding/BasicInfoScreen';
import { SkinTypeScreen } from '@/screens/onboarding/SkinTypeScreen';
import { HormoneScreen } from '@/screens/onboarding/HormoneScreen';
import { OnboardingCompleteScreen } from '@/screens/onboarding/OnboardingCompleteScreen';
import { NotificationPermissionScreen } from '@/screens/onboarding/NotificationPermissionScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={OnboardingRoutes.BasicInfo} component={BasicInfoScreen} />
      <Stack.Screen name={OnboardingRoutes.SkinType} component={SkinTypeScreen} />
      <Stack.Screen name={OnboardingRoutes.Hormone} component={HormoneScreen} />
      <Stack.Screen name={OnboardingRoutes.OnboardingComplete} component={OnboardingCompleteScreen} />
      <Stack.Screen name={OnboardingRoutes.NotificationPermission} component={NotificationPermissionScreen} />
    </Stack.Navigator>
  );
}
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingRoutes, OnboardingStackParamList } from './routes';
import { BasicInfoScreen } from '@/screens/onboarding/BasicInfoScreen';
import { SkinTypeScreen } from '@/screens/onboarding/SkinTypeScreen';
import { HormoneScreen } from '@/screens/onboarding/HormoneScreen';
import { OnboardingCompleteScreen } from '@/screens/onboarding/OnboardingCompleteScreen';
import { NotificationPermissionScreen } from '@/screens/onboarding/NotificationPermissionScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

type Props = {
  /**
   * 재로그인 시 마지막 미완료 단계부터 재개하기 위한 시작 화면 (F-AUTH-01 BR6).
   * 미지정 시 기본값(BasicInfo)부터 — 신규 사용자 최초 진입 케이스.
   */
  initialRouteName?: keyof OnboardingStackParamList;
};

export function OnboardingNavigator({ initialRouteName }: Props) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName ?? OnboardingRoutes.BasicInfo}
    >
      <Stack.Screen name={OnboardingRoutes.BasicInfo} component={BasicInfoScreen} />
      <Stack.Screen name={OnboardingRoutes.SkinType} component={SkinTypeScreen} />
      <Stack.Screen name={OnboardingRoutes.Hormone} component={HormoneScreen} />
      <Stack.Screen name={OnboardingRoutes.OnboardingComplete} component={OnboardingCompleteScreen} />
      <Stack.Screen name={OnboardingRoutes.NotificationPermission} component={NotificationPermissionScreen} />
    </Stack.Navigator>
  );
}
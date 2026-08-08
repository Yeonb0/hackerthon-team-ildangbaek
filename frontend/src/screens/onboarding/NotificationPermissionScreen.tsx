// src/screens/onboarding/NotificationPermissionScreen.tsx
//
// ⚠️ expo-notifications는 안 씁니다. SDK 53부터 Expo Go(특히 Android)에서 원격 푸시 관련 기능이
// 빠졌는데, 문제는 이 패키지를 import만 해도 내부 자동 등록 로직(DevicePushTokenAutoRegistration)이
// 실행되면서 "[runtime not ready]" 크래시가 납니다. requestPermissionsAsync()만 쓰려 해도
// 패키지 전체를 import해야 해서 피할 수 없었습니다. 개발 빌드(EAS build)로 넘어가면 그때
// 실제 OS 권한 요청을 다시 붙이면 됩니다 — 지금은 앱 내부 알림 설정만 저장합니다
// (명세서 BR4: OS 권한과 앱 내부 설정은 어차피 별도로 관리하는 값이라 구조상 문제는 없습니다).
//
// F-ONBOARD-06 규칙 요약:
// 1) 화면 진입만으로 권한 팝업을 강제 호출하지 않는다 — 애초에 팝업을 안 띄우니 자동 충족.
// 2) 앱 내부 알림 설정(enabled)과 OS 권한 상태는 별도로 관리한다.
// 4) 알림 거부/미설정이 핵심 기능 이용을 막으면 안 된다.
// 5) 온보딩 완료 플래그(authStore)는 이 화면의 두 버튼에서 최종적으로 바뀝니다.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { saveNotificationSetting } from '@/api/notification';
import { useAuthStore } from '@/store/authStore';
import { color, radius, space } from '@/theme/tokens';
import { s } from '@/lib/scale';

export function NotificationPermissionScreen() {
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);
  const setOnboardingNextStep = useAuthStore((state) => state.setOnboardingNextStep);

  const [isSaving, setIsSaving] = useState(false);

  const finishOnboarding = () => {
    setOnboardingCompleted(true);
    setOnboardingNextStep(null);
    // 화면 이동은 여기서 하지 않습니다 — RootNavigator가 onboardingCompleted 변화를 감지해서
    // Onboarding 스택 전체를 Main 탭으로 교체합니다 (뒤로가기로 온보딩에 못 돌아옴).
  };

  const handleAllow = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // 저장 실패해도 온보딩 진행은 막지 않습니다 — 알림 설정은 나중에 마이페이지(S-23)에서도 바꿀 수 있어서
      // 여기서 막을 만큼 치명적이지 않습니다.
      await saveNotificationSetting({ enabled: true });
    } catch {
      // 조용히 무시
    } finally {
      setIsSaving(false);
    }
    finishOnboarding();
  };

  const handleSkip = () => {
    // API 호출 없이 그냥 건너뜁니다 (BR3).
    finishOnboarding();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="notifications" size={32} color={color.brand500} />
      </View>

      <Text style={styles.title}>알림을 받을까요?</Text>
      <Text style={styles.description}>
        기록을 깜빡했을 때 알려드려요.{'\n'}언제든 마이페이지에서 바꿀 수 있어요.
      </Text>

      <Card style={styles.previewCard}>
        <View style={styles.previewIcon}>
          <Ionicons name="notifications" size={16} color={color.bg} />
        </View>
        <View style={styles.previewTextGroup}>
          <Text style={styles.previewTitle}>skinteller</Text>
          <Text style={styles.previewBody}>오늘 나이트 루틴 기록을 잊지 않으셨나요?</Text>
        </View>
      </Card>

      <Button
        label="알림 허용하기"
        variant="primary"
        loading={isSaving}
        onPress={handleAllow}
        style={styles.allowButton}
      />
      <Button
        label="괜찮아요, 나중에"
        variant="ghost"
        onPress={handleSkip}
        style={styles.skipButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
    backgroundColor: color.bg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[4],
  },
  title: {
    fontSize: s(22),
    fontWeight: '700',
    color: color.ink900,
    marginBottom: space[2],
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: color.ink600,
    textAlign: 'center',
    marginBottom: space[6],
  },
  previewCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: color.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextGroup: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: color.ink900,
  },
  previewBody: {
    fontSize: 13,
    color: color.ink600,
    marginTop: space[1],
  },
  allowButton: {
    width: '100%',
    marginTop: space[8],
  },
  skipButton: {
    width: '100%',
    marginTop: space[2],
  },
});
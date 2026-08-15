// src/screens/onboarding/NotificationPermissionScreen.tsx
//
// Phase 12 — Development Build 전환(Phase 11-B)이 끝나서 expo-notifications를 복원했습니다.
// 예전 주석: "Expo Go에서 import만 해도 크래시" 문제는 Expo Go 한정 이슈라 Development Build에서는
// 재발하지 않습니다. 실제 OS 권한 팝업은 "알림 허용하기"를 눌렀을 때만 뜨고, 화면 진입 시점엔
// 호출하지 않습니다 (F-ONBOARD-06 규칙 1 그대로 유지).
//
// ⚠️ 로컬에서 이 화면을 테스트하려면 admin이 프로젝트 루트에서 한 번
// `npx expo install expo-notifications` 를 돌려야 합니다 — package.json에 아래에서 임시로
// 넣어둔 버전이 있지만, SDK 57 기준 정확한 버전은 expo install이 맞춰주는 값을 신뢰하는 게
// 안전합니다. 네이티브 모듈이 새로 추가되는 거라 다음 EAS 빌드도 다시 돌려야 실기기에 반영됩니다.
//
// F-ONBOARD-06 규칙 요약:
// 1) 화면 진입만으로 권한 팝업을 강제 호출하지 않는다 — 버튼 탭 시에만 호출.
// 2) 앱 내부 알림 설정(enabled)과 OS 권한 상태는 별도로 관리한다 — 그래서 서버에는 실제
//    granted 여부(status === 'granted')를 보내고, OS가 거부해도 온보딩 자체는 막지 않습니다.
// 4) 알림 거부/미설정이 핵심 기능 이용을 막으면 안 된다.
// 5) 온보딩 완료 플래그(authStore)는 이 화면의 두 버튼에서 최종적으로 바뀝니다.
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { IconBell } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { saveNotificationSetting } from '@/api/notification';
import { useAuthStore } from '@/store/authStore';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

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
      // 실제 OS 알림 권한 팝업 — 사용자가 이미 한 번 결정했으면(허용/거부) OS가 팝업 없이
      // 기존 상태를 즉시 돌려줍니다.
      //
      // 2026-08-13: package.json의 expo-notifications 버전이 잘못 박혀 있었던 문제
      // (~0.32.13, Expo SDK 57과 안 맞는 구버전 넘버링 — 올바른 값은 ~57.0.10)를 바로잡은
      // 뒤로는 타입이 정상 인식돼서 캐스팅 없이 바로 씁니다.
      const { status, granted } = await Notifications.requestPermissionsAsync();
      // 저장 실패해도 온보딩 진행은 막지 않습니다 — 알림 설정은 나중에 마이페이지(S-23)에서도 바꿀 수 있어서
      // 여기서 막을 만큼 치명적이지 않습니다.
      await saveNotificationSetting({ enabled: granted || status === 'granted' });
    } catch {
      // 조용히 무시 — 권한 요청 실패도 온보딩을 막지 않습니다 (BR4)
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
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <IconBell size={36} color={color.brand500} />
        </View>

        <Text style={styles.title}>기록 알림을 받을까요?</Text>
        <Text style={styles.description}>
          기록을 깜빡했을 때 알려드려요.{'\n'}언제든 마이페이지에서 바꿀 수 있어요.
        </Text>

        <Card style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Image
              source={require('../../../assets/skinteller-logo-icon-source.png')}
              style={styles.previewIconImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.previewTextGroup}>
            <View style={styles.previewHeaderRow}>
              <Text style={styles.previewTitle}>스킨텔러</Text>
              <Text style={styles.previewTime}>오전 8시</Text>
            </View>
            <Text style={styles.previewBody}>
              오늘 아침 기록 아직 안 하셨어요!{'\n'}지금 바로 기록하고 피부 변화를 추적해보세요 ✨
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceLavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[4],
  },
  title: {
    fontSize: adjustFontSize(22),
    ...weightFamily('bold'),
    color: color.textInk,
    marginBottom: space[2],
    textAlign: 'center',
  },
  description: {
    fontSize: adjustFontSize(14),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
    marginBottom: space[6],
  },
  previewCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewIconImage: {
    width: '100%',
    height: '100%',
  },
  previewTextGroup: {
    flex: 1,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  previewTime: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textMuted,
  },
  previewBody: {
    fontSize: adjustFontSize(12.5),
    ...weightFamily('medium'),
    color: color.textSub,
    marginTop: space[1],
  },
  footer: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    paddingBottom: space[8],
  },
  allowButton: {
    width: '100%',
  },
  skipButton: {
    width: '100%',
    marginTop: space[2],
  },
});
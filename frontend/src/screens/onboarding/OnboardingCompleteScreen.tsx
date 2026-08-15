// src/screens/onboarding/OnboardingCompleteScreen.tsx
//
// 이 화면은 진입하자마자 POST /users/me/onboarding/complete를 호출합니다 (요약 데이터를
// 얻는 유일한 방법이라서요 — 명세서 BR4: 라벨·값 조합을 서버가 완성해서 내려주고
// 클라이언트는 Enum→한글 변환 로직을 갖지 않습니다).
//
// ⚠️ authStore.onboardingCompleted는 "기록 시작하기"를 눌러도 아직 안 바뀝니다.
// 명세서 흐름상 S-05 다음에 S-06(알림 허용)이 한 단계 더 있고, 루트 스택 교체(Onboarding→Main)는
// S-06을 통과해야 일어납니다. 그래서 이 버튼은 온보딩 스택 안에서 NotificationPermission으로
// "이동"만 하고, 실제 완료 플래그는 S-06의 버튼에서 바꿉니다.
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconCheck } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { completeOnboarding } from '@/api/onboarding';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { useAuthStore } from '@/store/authStore';
import { OnboardingRoutes, OnboardingStackParamList } from '@/app/routes';
import { color, space, gradient, gradientDirection, shadow } from '@/theme/tokens';
import type { OnboardingSummaryRow } from '@/types/onboarding';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export function OnboardingCompleteScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingComplete'>>();
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);
  const setOnboardingNextStep = useAuthStore((state) => state.setOnboardingNextStep);

  const [summary, setSummary] = useState<OnboardingSummaryRow[] | null>(null);
  const [loadError, setLoadError] = useState<'network' | 'server' | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await completeOnboarding();
      setSummary(result.summary);
    } catch (e) {
      if (e instanceof ApiError && e.code === ErrorCode.ONBOARD_ALREADY_COMPLETED) {
        // 방어적 케이스 — 이미 완료된 상태로 다시 들어온 경우. 보여줄 요약이 없으니
        // S-06을 거칠 이유도 없어서, 이 케이스만 예외적으로 바로 완료 처리합니다.
        setOnboardingCompleted(true);
        setOnboardingNextStep(null);
        return;
      }
      // ApiError가 아니면 응답 자체를 못 받은 네트워크 오류, ApiError면 서버가 응답한 실패
      // (예: ONBOARD_STEP_NOT_ALLOWED 방어적 케이스, COMMON_SERVER_ERROR)
      setLoadError(e instanceof ApiError ? 'server' : 'network');
    }
  }, [setOnboardingCompleted, setOnboardingNextStep]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    navigation.navigate(OnboardingRoutes.NotificationPermission);
  };

  if (loadError) {
    return <ErrorState variant={loadError} onRetry={load} />;
  }

  if (!summary) {
    return <LoadingState variant="spinner" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <LinearGradient
          colors={gradient.brand}
          start={gradientDirection.badge.start}
          end={gradientDirection.badge.end}
          style={[styles.iconBadge, shadow.badge]}
        >
          <IconCheck size={36} color={color.white} />
        </LinearGradient>

        <Text style={styles.title}>계정 생성 완료!</Text>
        <Text style={styles.description}>
          이제부터 피부 기록을 시작하고{'\n'}성분 프로파일을 완성해나가요
        </Text>

        <Card style={styles.summaryCard}>
          {summary.map((row, index) => (
            <View
              key={row.label}
              style={[styles.summaryRow, index === summary.length - 1 && styles.summaryRowLast]}
            >
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          label="기록 시작하기"
          variant="primary"
          onPress={handleStart}
          style={styles.startButton}
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
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[8],
  },
  title: {
    // Figma는 Pretendard Black(900)인데, 프로젝트에 등록된 굵기 파일이
    // regular/medium/semibold/bold 4종뿐이라 900 파일이 없습니다. 가장 굵은
    // bold로 근사 처리했습니다 — fontWeight를 얹어 합성 볼드로 흉내내는 건
    // 안드로이드에서 더 두꺼워지는 부작용이 있어서 하지 않았습니다.
    fontSize: adjustFontSize(26),
    ...weightFamily('bold'),
    color: color.textInk,
    marginBottom: space[2],
    textAlign: 'center',
  },
  description: {
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
    marginBottom: space[6],
  },
  summaryCard: {
    width: '100%',
    padding: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space[4],
    paddingHorizontal: space[6],
    borderBottomWidth: 0.76,
    borderBottomColor: color.borderDividerFaint,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  summaryValue: {
    fontSize: adjustFontSize(14),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  footer: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    paddingBottom: space[8],
  },
  startButton: {
    width: '100%',
  },
});
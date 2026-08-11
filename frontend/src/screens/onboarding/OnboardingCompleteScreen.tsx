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
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { OnboardingSummaryRow } from '@/types/onboarding';

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
      <IconCheck size={64} color={color.brand500} style={styles.icon} />

      <Text style={styles.title}>프로파일이 완성되었어요</Text>
      <Text style={styles.description}>
        입력해주신 정보를 바탕으로{'\n'}피부 변화와 성분 반응을 분석해드릴게요.
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

      <Button
        label="기록 시작하기"
        variant="primary"
        onPress={handleStart}
        style={styles.startButton}
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
  icon: {
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
  summaryCard: {
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.ink300,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: color.ink600,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink900,
  },
  startButton: {
    width: '100%',
    marginTop: space[8],
  },
});

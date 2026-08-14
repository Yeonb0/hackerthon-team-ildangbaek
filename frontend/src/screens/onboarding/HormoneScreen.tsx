// src/screens/onboarding/HormoneScreen.tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Chip } from '@/components/base/Chip';
import { DateField } from '@/components/base/DateField';
import { WheelPicker } from '@/components/base/WheelPicker';
import { ProgressBar } from '@/components/base/ProgressBar';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { IconBack } from '@/components/icons';
import { saveHormoneInfo } from '@/api/onboarding';
import { ApiError, getFieldErrors } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { getTodayDateString } from '@/lib/date';
import { useOnboardingStore } from '@/store/onboardingStore';
import { OnboardingRoutes, OnboardingStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { HormoneStatus } from '@/types/onboarding';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

// 주사(HORMONE_INJECTION)는 관리자 결정으로 일단 숨김 처리 — 추후 기능으로 보류.
// 타입(types/onboarding.ts)에는 그대로 남겨뒀으니 나중에 이 배열에 한 줄만 추가하면 됩니다.
const HORMONE_OPTIONS: { value: HormoneStatus; label: string }[] = [
  { value: 'MENSTRUATING', label: '생리' },
  { value: 'HORMONE_PILL', label: '호르몬약' },
  // { value: 'HORMONE_INJECTION', label: '주사' }, // 추후 추가 예정
  { value: 'MENOPAUSE', label: '폐경' },
];

/** 상태별로 날짜 필드가 묻는 의미가 다릅니다 — 자연 생리 주기 vs 호르몬약 복용 스케줄 */
function getDateFieldLabel(status: HormoneStatus | null): string {
  return status === 'HORMONE_PILL' ? '최근 휴약기 시작일 (선택)' : '최근 생리 시작일 (선택)';
}

const CYCLE_MIN = 20;
const CYCLE_MAX = 45;
const CYCLE_DEFAULT = 28;

// S-04는 온보딩 플로우의 세 번째 화면 (FEMALE만 진입, currentStepIndex 고정)
const CURRENT_STEP_INDEX = 3;

export function HormoneScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Hormone'>>();
  const insets = useSafeAreaInsets();

  const totalStepCount = useOnboardingStore((state) => state.totalStepCount);

  const [hormoneStatus, setHormoneStatus] = useState<HormoneStatus | null>(null);
  const [lastPeriodStartDate, setLastPeriodStartDate] = useState<string | null>(null);
  const [averageCycleDays, setAverageCycleDays] = useState(CYCLE_DEFAULT);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // MENOPAUSE는 최근 시작일·평균 주기가 의미 없음 (F-ONBOARD-03 BR7)
  const showCycleFields = hormoneStatus !== null && hormoneStatus !== 'MENOPAUSE';
  // 평균 주기는 "최근 생리(휴약기) 시작일"이 있어야 기준점이 생기는 값이라, 날짜를
  // 아직 안 골랐으면 기본값(28일)이 마치 실제 입력인 것처럼 보이지 않게 필드 자체를
  // 숨깁니다 — 날짜 선택 후에만 나타남 (관리자 요청, 2026-08-11).

  const goToComplete = () => navigation.navigate(OnboardingRoutes.OnboardingComplete);

  const handleSkip = () => {
    // 이 화면의 PATCH를 호출하지 않고 바로 완료 화면으로 — 건너뛰어도 온보딩은 정상 완료됩니다
    // (ONBOARD-04 BR3: skip 전용 API가 따로 없고, 호출 자체를 안 하면 건너뛴 것으로 처리)
    goToComplete();
  };

  const handleSubmit = async () => {
    if (isSaving || !hormoneStatus) return;

    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      await saveHormoneInfo({
        hormoneStatus,
        ...(showCycleFields && lastPeriodStartDate ? { lastPeriodStartDate, averageCycleDays } : {}),
      });
      goToComplete();
    } catch (e) {
      if (e instanceof ApiError && e.code === ErrorCode.COMMON_VALIDATION_FAILED) {
        setFieldErrors(getFieldErrors(e));
      } else {
        // ONBOARD_HORMONE_NOT_APPLICABLE(방어적 케이스) 포함 — 화면을 덮지 않고 배너만
        setSaveError('저장에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const progress = totalStepCount ? CURRENT_STEP_INDEX / totalStepCount : 0.7;

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={8}
          style={styles.navBackButton}
        >
          <IconBack size={22} color={color.ink900} />
        </Pressable>
      </View>
      <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ProgressBar
          progress={progress}
          current={totalStepCount ? CURRENT_STEP_INDEX : undefined}
          total={totalStepCount ?? undefined}
          style={styles.progressBar}
        />

        <Text style={styles.title}>생리·호르몬 정보를 알려주세요</Text>
        <Text style={styles.subtitle}>
          피부 변화 분석에 활용돼요. 지금 넘어가도 괜찮아요.
        </Text>

        <View style={styles.chipRow}>
          {HORMONE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={hormoneStatus === option.value}
              onPress={() => setHormoneStatus(option.value)}
            />
          ))}
        </View>

        {showCycleFields && (
          <View style={styles.section}>
            <DateField
              label={getDateFieldLabel(hormoneStatus)}
              placeholder="날짜 선택"
              value={lastPeriodStartDate}
              onChange={setLastPeriodStartDate}
              maxDate={getTodayDateString()}
              error={fieldErrors.lastPeriodStartDate}
            />

            {lastPeriodStartDate && (
              <View style={styles.cycleField}>
                <Text style={styles.sectionLabel}>평균 주기 (선택)</Text>
                <WheelPicker
                  orientation="horizontal"
                  value={averageCycleDays}
                  onChange={setAverageCycleDays}
                  min={CYCLE_MIN}
                  max={CYCLE_MAX}
                  formatLabel={(v) => `${v}일`}
                />
                {fieldErrors.averageCycleDays ? (
                  <Text style={styles.fieldError}>{fieldErrors.averageCycleDays}</Text>
                ) : null}
              </View>
            )}
          </View>
        )}

        {saveError && (
          <InlineErrorBanner
            message={saveError}
            onRetry={handleSubmit}
            style={styles.errorBanner}
          />
        )}

        <Button
          label="저장하고 계속하기"
          variant="primary"
          loading={isSaving}
          disabled={!hormoneStatus}
          onPress={handleSubmit}
          style={styles.submitButton}
        />
        <Button
          label="나중에 설정하기"
          variant="ghost"
          onPress={handleSkip}
          style={styles.skipButton}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  navBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    flexGrow: 1,
    padding: space[6],
  },
  progressBar: {
    marginBottom: space[6],
  },
  title: {
    fontSize: s(22),
    ...weightFamily('bold'),
    color: color.ink900,
    marginBottom: space[1],
  },
  subtitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('regular'),
    color: color.ink600,
    marginBottom: space[6],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  section: {
    marginTop: space[6],
    gap: space[4],
  },
  sectionLabel: {
    fontSize: adjustFontSize(13),
    ...weightFamily('semibold'),
    color: color.ink600,
    marginBottom: space[2],
  },
  cycleField: {
    marginTop: space[2],
  },
  fieldError: {
    marginTop: space[1],
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.statusCaution,
  },
  errorBanner: {
    marginTop: space[6],
  },
  submitButton: {
    marginTop: space[8],
  },
  skipButton: {
    marginTop: space[2],
  },
});
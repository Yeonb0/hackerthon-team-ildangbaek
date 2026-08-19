// src/screens/onboarding/HormoneScreen.tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

  const totalStepCount = useOnboardingStore((state) => state.totalStepCount);
  const setHormoneInput = useOnboardingStore((state) => state.setHormoneInput);

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
    // 뒤로 갔다가 건너뛰는 경로가 있어서, 이전에 저장해둔 값이 요약에 남지 않도록 비웁니다.
    setHormoneInput(null);
    goToComplete();
  };

  const handleSubmit = async () => {
    if (isSaving || !hormoneStatus) return;

    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      const input = {
        hormoneStatus,
        ...(showCycleFields && lastPeriodStartDate ? { lastPeriodStartDate, averageCycleDays } : {}),
      };
      await saveHormoneInfo(input);
      // 완료 화면 요약용 — 서버 요약에 호르몬 행이 없어서 클라이언트가 보강합니다
      // (lib/hormoneSummary.ts 주석 참고). 저장 성공 후에만 기록합니다.
      setHormoneInput(input);
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 — BasicInfoScreen(S-01)과 동일한 구조·스타일로 통일 (관리자 지시, 2026-08-15) */}
      <View style={styles.header}>
        <View style={styles.backSlot}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={12}
          >
            <IconBack size={24} color={color.textInk} />
          </Pressable>
        </View>

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
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
      </ScrollView>

      <View style={styles.footer}>
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingHorizontal: space[6],
    paddingBottom: space[2],
  },
  backSlot: {
    height: 30, // 관리자 지정값 (2026-08-15) — 뒤로가기 버튼 표준 스타일
    justifyContent: 'flex-start',
  },
  flex: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    flexGrow: 1,
    paddingTop: space[8],
    paddingHorizontal: space[6],
    paddingBottom: space[6],
  },
  progressBar: {
    marginTop: space[3],
    marginBottom: space[4],
  },
  title: {
    fontSize: adjustFontSize(22),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  subtitle: {
    marginTop: space[1],
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textSub,
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
  footer: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    paddingBottom: space[8],
  },
  submitButton: {
    width: '100%',
  },
  skipButton: {
    width: '100%',
    marginTop: space[2],
  },
});
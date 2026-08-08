// src/screens/onboarding/SkinTypeScreen.tsx
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/base/Button';
import { OptionCard } from '@/components/base/OptionCard';
import { ProgressBar } from '@/components/base/ProgressBar';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { saveSkinTypes } from '@/api/onboarding';
import { ApiError, getFieldErrors } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { useOnboardingStore } from '@/store/onboardingStore';
import { OnboardingRoutes, OnboardingStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { SkinTypeCode } from '@/types/onboarding';

const SKIN_TYPE_OPTIONS: { value: SkinTypeCode; title: string; description: string }[] = [
  { value: 'OILY', title: '지성', description: '유분이 많고 쉽게 번들거려요' },
  { value: 'DRY', title: '건성', description: '당기고 각질이 잘 생겨요' },
  { value: 'SENSITIVE', title: '민감성', description: '쉽게 붉어지거나 따가워요' },
  { value: 'UNKNOWN', title: '모르겠음', description: '다른 항목과 함께 선택할 수 없어요' },
];

// S-02는 온보딩 플로우의 두 번째 화면 (currentStepIndex 고정)
const CURRENT_STEP_INDEX = 2;

export function SkinTypeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'SkinType'>>();

  const totalStepCount = useOnboardingStore((state) => state.totalStepCount);

  const [selected, setSelected] = useState<SkinTypeCode[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const toggle = (value: SkinTypeCode) => {
    setFieldError(null);
    setSelected((prev) => {
      if (value === 'UNKNOWN') {
        // '모르겠음' 선택 -> 나머지 전부 해제하고 단독 선택 (F-ONBOARD-02 BR2)
        return prev.includes('UNKNOWN') ? [] : ['UNKNOWN'];
      }
      // 다른 항목 선택 -> '모르겠음'이 있었다면 해제하고 새 항목만 반영 (BR3)
      const withoutUnknown = prev.filter((v) => v !== 'UNKNOWN');
      const isSelected = withoutUnknown.includes(value);
      return isSelected
        ? withoutUnknown.filter((v) => v !== value)
        : [...withoutUnknown, value];
    });
  };

  const canSubmit = selected.length >= 1;

  const handleSubmit = async () => {
    if (isSaving || !canSubmit) return;
    setIsSaving(true);
    setSaveError(null);
    setFieldError(null);

    try {
      const result = await saveSkinTypes({ skinTypes: selected });
      if (result.nextStep === 'HORMONE') {
        navigation.navigate(OnboardingRoutes.Hormone);
      } else {
        navigation.navigate(OnboardingRoutes.OnboardingComplete);
      }
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.code === ErrorCode.ONBOARD_SKIN_TYPE_REQUIRED ||
          e.code === ErrorCode.ONBOARD_SKIN_TYPE_CONFLICT)
      ) {
        const errors = getFieldErrors(e);
        setFieldError(errors.skinTypes ?? e.message);
      } else {
        // 500대/네트워크 오류 — 화면을 덮지 않고 배너만 (입력값 보존, F-SYSTEM-03)
        setSaveError('저장에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const progress = totalStepCount ? CURRENT_STEP_INDEX / totalStepCount : 0.4;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ProgressBar
        progress={progress}
        current={totalStepCount ? CURRENT_STEP_INDEX : undefined}
        total={totalStepCount ?? undefined}
        style={styles.progressBar}
      />

      <Text style={styles.title}>피부 타입을 알려주세요</Text>
      <Text style={styles.subtitle}>중복 선택할 수 있어요</Text>

      <View style={styles.optionList}>
        {SKIN_TYPE_OPTIONS.map((option) => {
          const isUnknownSelected = selected.includes('UNKNOWN');
          const isThisSelected = selected.includes(option.value);
          // '모르겠음'이 선택된 상태에서는 나머지 옵션을 비활성 처리 (선택은 toggle로 여전히 가능하지만
          // 명세상 "선택 불가 상태"이므로 시각적으로 눌러도 의미 없는 상태임을 알려줌)
          const disabled = isUnknownSelected && option.value !== 'UNKNOWN';

          return (
            <OptionCard
              key={option.value}
              title={option.title}
              description={option.description}
              selected={isThisSelected}
              disabled={disabled}
              onPress={() => toggle(option.value)}
            />
          );
        })}
      </View>

      {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}

      {saveError && (
        <InlineErrorBanner message={saveError} onRetry={handleSubmit} style={styles.errorBanner} />
      )}

      <Button
        label="다음"
        variant="primary"
        loading={isSaving}
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: space[6],
    backgroundColor: color.bg,
  },
  progressBar: {
    marginBottom: space[6],
  },
  title: {
    fontSize: s(22),
    fontWeight: '700',
    color: color.ink900,
    marginBottom: space[1],
  },
  subtitle: {
    fontSize: 13,
    color: color.ink600,
    marginBottom: space[6],
  },
  optionList: {
    gap: space[3],
  },
  fieldError: {
    marginTop: space[3],
    fontSize: 12,
    color: color.statusCaution,
  },
  errorBanner: {
    marginTop: space[6],
  },
  submitButton: {
    marginTop: space[8],
  },
});

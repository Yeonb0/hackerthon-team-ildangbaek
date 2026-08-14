// src/screens/onboarding/BasicInfoScreen.tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { Chip } from '@/components/base/Chip';
import { WheelPicker } from '@/components/base/WheelPicker';
import { ProgressBar } from '@/components/base/ProgressBar';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { saveBasicInfo } from '@/api/onboarding';
import { ApiError, getFieldErrors } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { useOnboardingStore, calcTotalStepCount } from '@/store/onboardingStore';
import { OnboardingRoutes, OnboardingStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { Gender } from '@/types/onboarding';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: '여성' },
  { value: 'MALE', label: '남성' },
  { value: 'UNSPECIFIED', label: '선택 안 함' },
];

const NAME_MAX_LENGTH = 10;
const AGE_MIN = 10;
const AGE_MAX = 100;
const AGE_DEFAULT = 20;

// S-01은 온보딩 플로우의 첫 화면 (currentStepIndex 고정)
const CURRENT_STEP_INDEX = 1;

export function BasicInfoScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'BasicInfo'>>();

  const totalStepCount = useOnboardingStore((state) => state.totalStepCount);
  const setTotalStepCount = useOnboardingStore((state) => state.setTotalStepCount);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState(AGE_DEFAULT);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= 1 && trimmedName.length <= NAME_MAX_LENGTH;

  // 순차 노출 — 이름 → 성별 → 나이 (기능명세서 S-01 비고: "순차 노출")
  const showGenderSection = isNameValid;
  const showAgeSection = showGenderSection && gender !== null;
  const showSubmitButton = showAgeSection;

  const handleSelectGender = (value: Gender) => {
    setGender(value);
    // 서버 응답을 기다리지 않고 클라이언트가 먼저 분모를 계산합니다 (ONBOARD-01 BR1과 동일 규칙).
    // 성별 선택 "순간부터 n/N 노출" 요구사항이 이걸로 충족됩니다.
    setTotalStepCount(calcTotalStepCount(value));
  };

  const handleSubmit = async () => {
    if (isSaving || !gender) return;
    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      const result = await saveBasicInfo({ name: trimmedName, gender, age });
      // 서버 값으로 최종 확정 (클라이언트 계산값과 같아야 정상이지만, 서버가 최종 권한을 가집니다)
      setTotalStepCount(result.totalStepCount);
      navigation.navigate(OnboardingRoutes.SkinType);
    } catch (e) {
      if (e instanceof ApiError && e.code === ErrorCode.COMMON_VALIDATION_FAILED) {
        setFieldErrors(getFieldErrors(e));
      } else {
        // 500대/네트워크 오류 — 화면을 덮지 않고 배너만 (입력값 보존, F-SYSTEM-03)
        setSaveError('저장에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const progress = totalStepCount ? CURRENT_STEP_INDEX / totalStepCount : 0.12;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ProgressBar
          progress={progress}
          current={totalStepCount ? CURRENT_STEP_INDEX : undefined}
          total={totalStepCount ?? undefined}
          style={styles.progressBar}
        />

        <Text style={styles.title}>기본 정보를 알려주세요</Text>

        <Input
          label="이름"
          placeholder="이름을 입력해주세요"
          value={name}
          onChangeText={setName}
          maxLength={NAME_MAX_LENGTH}
          error={fieldErrors.name}
          autoFocus
        />

        {showGenderSection && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>성별</Text>
            <View style={styles.chipRow}>
              {GENDER_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={gender === option.value}
                  onPress={() => handleSelectGender(option.value)}
                />
              ))}
            </View>
            {fieldErrors.gender ? (
              <Text style={styles.fieldError}>{fieldErrors.gender}</Text>
            ) : null}
          </View>
        )}

        {showAgeSection && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>나이</Text>
            <WheelPicker
              value={age}
              onChange={setAge}
              min={AGE_MIN}
              max={AGE_MAX}
              formatLabel={(v) => `${v}세`}
            />
            {fieldErrors.age ? <Text style={styles.fieldError}>{fieldErrors.age}</Text> : null}
          </View>
        )}

        {saveError && (
          <InlineErrorBanner
            message={saveError}
            onRetry={handleSubmit}
            style={styles.errorBanner}
          />
        )}

        {showSubmitButton && (
          <Button
            label="다음"
            variant="primary"
            loading={isSaving}
            onPress={handleSubmit}
            style={styles.submitButton}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: space[6],
  },
  section: {
    marginTop: space[6],
  },
  sectionLabel: {
    fontSize: adjustFontSize(13),
    ...weightFamily('semibold'),
    color: color.ink600,
    marginBottom: space[2],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
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
});

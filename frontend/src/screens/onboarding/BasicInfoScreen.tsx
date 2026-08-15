// src/screens/onboarding/BasicInfoScreen.tsx
//
// 2026-08-15 — Figma GUI 최종본 ProfileName(59:3939 / 59:4005) 기준으로 레이아웃 교체.
//
// Figma와 다르게 유지한 부분 (관리자 결정 (a)):
//   Figma ProfileName 프레임에는 이름 입력 하나뿐이고 성별·나이 화면이 GUI 파일에
//   존재하지 않습니다. 다만 ProfileComplete 요약에 "나이·성별" 행이 있고, 성별은
//   S-04(호르몬) 진입 분기 조건이라 데이터가 반드시 필요합니다. 그래서 성별·나이
//   순차 노출(F-ONBOARD-01 BR 1~4)은 이 화면에 그대로 둡니다.
//
// 바뀐 점:
//   · 상단 back 헤더 추가 (2026-08-15 수정: 항상 노출. Auth↔Onboarding은
//     RootNavigator가 accessToken 유무로 화면을 통째로 스위칭하는 구조라
//     Onboarding 스택 안에서는 navigation.canGoBack()이 늘 false입니다.
//     그래서 "뒤로가기"를 로그인 화면(S-00, 카카오/구글/이메일)으로 보내려면
//     화면 이동이 아니라 clearAuth()로 세션을 지워 RootNavigator가 Auth
//     스택을 다시 그리게 만드는 방식으로 구현했습니다 — 즉 이 버튼을 누르면
//     로그아웃되고 지금까지 입력한 이름/성별/나이는 저장 없이 사라집니다.)
//   · ProgressBar는 관리자 확인 전까지 유지합니다(2026-08-15 복원). Figma엔 안
//     보이지만 F-ONBOARD-04 재검토 결과가 나올 때까지 그대로 둡니다.
//   · 타이틀 "기본 정보를 알려주세요" → "이름을 알려주세요" + 서브텍스트 추가
//   · 다음 버튼: 조건부 노출 → 하단 고정 + 항상 노출(미완료 시 disabled)
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { Chip } from '@/components/base/Chip';
import { ProgressBar } from '@/components/base/ProgressBar';
import { WheelPicker } from '@/components/base/WheelPicker';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { IconBack } from '@/components/icons';
import { saveBasicInfo } from '@/api/onboarding';
import { ApiError, getFieldErrors } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { useOnboardingStore, calcTotalStepCount } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { OnboardingRoutes, OnboardingStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
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

  // 순차 노출 — 이름 → 성별 → 나이 (F-ONBOARD-01 BR 1~3)
  const showGenderSection = isNameValid;
  const showAgeSection = showGenderSection && gender !== null;
  const canSubmit = showAgeSection;

  const clearAuth = useAuthStore((state) => state.clearAuth);

  // 로그인 화면(S-00)으로 돌아갑니다. Onboarding은 Auth와 별도 스택이라
  // navigation.goBack()으로는 못 넘어가서, 세션을 지워 RootNavigator가
  // Auth 스택을 다시 그리게 합니다 (= 로그아웃 처리).
  const handleBackToLogin = () => {
    clearAuth();
  };

  const handleSelectGender = (value: Gender) => {
    setGender(value);
    // 서버 응답을 기다리지 않고 클라이언트가 먼저 분모를 계산합니다 (ONBOARD-01 BR1과 동일 규칙).
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 — Figma 59:4017. 뒤로 갈 곳이 없어도 높이는 유지해서 타이틀 위치가
          진입 경로에 따라 흔들리지 않게 합니다. */}
      <View style={styles.header}>
        <View style={styles.backSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={12}
            onPress={handleBackToLogin}
          >
            <IconBack size={24} color={color.textInk} />
          </Pressable>
        </View>

        <ProgressBar
          progress={totalStepCount ? 1 / totalStepCount : 0.12}
          current={totalStepCount ? 1 : undefined}
          total={totalStepCount ?? undefined}
          style={styles.progressBar}
        />

        <Text style={styles.title}>이름을 알려주세요</Text>
        <Text style={styles.subtitle}>닉네임이나 이름을 입력하세요</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="이름 입력"
          placeholder="이름 입력"
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
      </ScrollView>

      {/* 하단 고정 CTA — Figma 59:4025 (h103, px24). 입력이 덜 찼어도 자리를 지키고
          비활성 상태로 보여줍니다 (Figma ProfileName-Empty). */}
      <View style={styles.footer}>
        <Button
          label="다음"
          variant="primary"
          loading={isSaving}
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={styles.submitButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: space[6],
    paddingBottom: space[2],
  },
  backSlot: {
    height: 30, // 관리자 지정값 (2026-08-15) — 뒤로가기 버튼 표준 스타일로 기억
    justifyContent: 'flex-start',
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
  progressBar: {
    marginTop: space[3],
    marginBottom: space[4],
  },
  container: {
    flexGrow: 1,
    paddingTop: space[8],
    paddingHorizontal: space[6],
    paddingBottom: space[6],
  },
  section: {
    marginTop: space[6],
  },
  sectionLabel: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textSub,
    marginBottom: space[1] + 2,
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
  footer: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    paddingBottom: space[8],
  },
  submitButton: {
    width: '100%',
  },
});
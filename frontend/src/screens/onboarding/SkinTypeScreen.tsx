// src/screens/onboarding/SkinTypeScreen.tsx
//
// 2026-08-15 — Figma GUI 최종본(ProfileSkinType, 59:4294/59:4148) 기준으로
// 헤더 구조·문구 정합.
//
// 바뀐 점:
//   · 별도 상단 nav row(뒤로가기 단독) 제거 → BasicInfoScreen(S-01)과 동일하게
//     뒤로가기 + 타이틀 + 서브타이틀을 하나의 header 컨테이너로 통합 (pt-56)
//   · 타이틀/서브 문구를 Figma 실제 텍스트로 교체
//   · ProgressBar는 관리자 확인 전까지 유지합니다. Figma엔 S-01/S-02 둘 다
//     안 보이지만, F-ONBOARD-04 재검토 결과가 나올 때까지 제거하지 않기로
//     되돌렸습니다 (2026-08-15).
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/base/Button';
import { OptionCard } from '@/components/base/OptionCard';
import { ProgressBar } from '@/components/base/ProgressBar';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { IconBack } from '@/components/icons';
import { saveSkinTypes } from '@/api/onboarding';
import { ApiError, getFieldErrors } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { useOnboardingStore } from '@/store/onboardingStore';
import { OnboardingRoutes, OnboardingStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import type { SkinTypeCode } from '@/types/onboarding';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

// 2026-08-15 — Figma GUI 최종본(ProfileSkinType, 59:4294/59:4148) 문구로 교체.
const SKIN_TYPE_OPTIONS: { value: SkinTypeCode; title: string; description: string }[] = [
  { value: 'OILY', title: '지성', description: 'T존이나 전체적으로 유분이 많은 편이에요' },
  { value: 'DRY', title: '건성', description: '당김이나 각질이 자주 생기는 편이에요' },
  { value: 'SENSITIVE', title: '민감성', description: '새 제품에 자극 반응이 쉽게 나타나요' },
  { value: 'UNKNOWN', title: '모르겠음', description: '아직 내 피부 타입이 잘 모르겠어요' },
];

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

  // S-02는 온보딩 플로우의 두 번째 화면 (currentStepIndex 고정)
  const CURRENT_STEP_INDEX = 2;
  const progress = totalStepCount ? CURRENT_STEP_INDEX / totalStepCount : 0.4;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 헤더 — Figma 59:4295/59:4149. BasicInfoScreen(S-01)과 동일하게
            뒤로가기 + 타이틀 + 서브타이틀을 한 컨테이너로 묶습니다. */}
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

          <Text style={styles.title}>내 피부 타입은 무엇인가요?</Text>
          <Text style={styles.subtitle}>복합성이면 해당하는 타입을 여러 개 선택하세요</Text>
        </View>

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
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    flexGrow: 1,
    backgroundColor: color.bg,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: space[6],
    paddingBottom: space[2],
  },
  backSlot: {
    height: 30, // 관리자 지정값 (2026-08-15) — 뒤로가기 버튼 표준 스타일
    justifyContent: 'flex-start',
  },
  progressBar: {
    marginTop: space[3],
    marginBottom: space[3],
  },
  title: {
    fontSize: adjustFontSize(22),
    ...weightFamily('bold'),
    color: color.textInk,
    marginBottom: space[1],
  },
  subtitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  optionList: {
    gap: space[3],
    paddingHorizontal: space[6],
    paddingTop: space[6],
  },
  fieldError: {
    marginTop: space[3],
    marginHorizontal: space[6],
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.statusCaution,
  },
  errorBanner: {
    marginTop: space[6],
    marginHorizontal: space[6],
  },
  footer: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    paddingBottom: space[6],
  },
  submitButton: {
    width: '100%',
  },
});
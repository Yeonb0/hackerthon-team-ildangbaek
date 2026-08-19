// ProductRegisterSheet.tsx — 제품 기록(S-11)에서 바로 뜨는 "어디에 등록할까요?" 시트
//
// 2026-08-19(세션 18, 관리자님 지시) 신설.
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 만들었나
//
// 예전 흐름은 **스캔/검색 → 성분 확인(S-14) → 루틴 선택 → 등록**이었습니다. 관리자님
// 지적대로 성분 확인 화면은 등록을 위해 반드시 거쳐야 할 이유가 없습니다 — 제품을
// 등록하는 사람은 대개 이미 그 제품을 알고 있고, 성분은 나중에 봐도 되는 정보입니다.
// 화면을 하나 더 거치는 만큼 이탈 지점만 늘어납니다.
//
// 그래서 루틴/등록 선택을 **제품 기록 화면 위의 시트**로 끌어올렸습니다. 성분 확인
// 화면 자체는 남아 있습니다 — 저장된 제품 카드의 "성분 보기"와 이 시트의 "성분 보기"
// 링크로만 들어가는 **읽기 전용 경로**가 됩니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 선택 규칙 (IngredientCheckScreen·ProductManualRegisterScreen과 동일)
//
// · 「제품만 등록하기」는 배타 선택 — 별도 state 없이 `selectedRoutineIds.size === 0`
//   으로 판정합니다. 루틴을 하나라도 고르면 자동으로 해제됩니다.
// · 모닝·나이트는 중복 선택 가능합니다.
// · 칩 순서는 모닝 → 나이트 고정. 서버 반환 순서에 기대면 계정마다 칩 위치가 달라져서
//   같은 자리를 누르던 사용자가 반대 루틴을 고르게 됩니다.
//
// ⚠️ 애니메이션에 reanimated/gesture-handler를 쓰지 않습니다. RecordDayDetailSheet는
// 드래그로 닫는 시트라 그게 필요했지만, 이 시트는 배경 탭·버튼으로만 닫히므로 RN 기본
// Modal(slide)로 충분합니다. Development Build 의존을 하나라도 덜 만드는 편이 낫습니다.
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { IconImagePlaceholder } from '@/components/icons';
import { color, radius, space, typography } from '@/theme';
import { weightFamily } from '@/theme/typography';
import type { RoutineListItem } from '@/types/product';

type ProductRegisterSheetProps = {
  visible: boolean;
  /** 헤더에 보여줄 제품. 상세 조회 중이면 null이고, 그동안 이름 자리는 비워둡니다. */
  product: { name: string; brand?: string | null; category?: string | null } | null;
  routines: RoutineListItem[];
  selectedRoutineIds: Set<number>;
  onToggleRoutine: (routineId: number) => void;
  /** 「제품만 등록하기」 — 선택을 전부 비웁니다. */
  onSelectLibraryOnly: () => void;
  onSubmit: () => void;
  onRequestClose: () => void;
  /** 성분 확인 화면(S-14)으로 이동. 등록 흐름의 필수 단계가 아니라 선택 링크입니다. */
  onViewIngredients?: () => void;
  submitting?: boolean;
  /** 이미 제품 목록에 있는 제품이면 「제품만 등록하기」만으로는 할 일이 없습니다. */
  alreadySaved?: boolean;
  errorMessage?: string | null;
};

export function ProductRegisterSheet({
  visible,
  product,
  routines,
  selectedRoutineIds,
  onToggleRoutine,
  onSelectLibraryOnly,
  onSubmit,
  onRequestClose,
  onViewIngredients,
  submitting = false,
  alreadySaved = false,
  errorMessage,
}: ProductRegisterSheetProps) {
  const insets = useSafeAreaInsets();
  const libraryOnly = selectedRoutineIds.size === 0;
  const orderedRoutines = [...routines].sort((a, b) =>
    a.timeSlot === b.timeSlot ? 0 : a.timeSlot === 'MORNING' ? -1 : 1
  );
  // 이미 담긴 제품인데 루틴도 안 골랐다면 눌러도 아무 변화가 없습니다.
  const nothingToDo = alreadySaved && libraryOnly;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} accessibilityRole="button">
        {/* 시트 내부 탭이 배경까지 전파돼 닫히지 않도록 막습니다(Popup.tsx와 같은 처리). */}
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.grabber} />

          <View style={styles.productRow}>
            <View style={styles.imageBox}>
              <IconImagePlaceholder size={24} color={color.ink300} />
            </View>
            <View style={styles.productText}>
              {product?.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
              <Text style={styles.name} numberOfLines={2}>
                {product?.name ?? '제품을 불러오는 중이에요'}
              </Text>
              {product?.category ? <Text style={styles.category}>{product.category}</Text> : null}
            </View>
          </View>

          <Text style={styles.sectionTitle}>어디에 등록할까요?</Text>
          <View style={styles.chipRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="제품만 등록하기"
              accessibilityState={{ selected: libraryOnly }}
              onPress={onSelectLibraryOnly}
              style={[styles.chip, libraryOnly && styles.chipActive]}
            >
              <Text style={[styles.chipText, libraryOnly && styles.chipTextActive]}>
                제품만 등록하기
              </Text>
            </Pressable>
            {orderedRoutines.map((routine) => {
              const active = selectedRoutineIds.has(routine.routineId);
              return (
                <Pressable
                  key={routine.routineId}
                  accessibilityRole="button"
                  accessibilityLabel={routine.name}
                  accessibilityState={{ selected: active }}
                  onPress={() => onToggleRoutine(routine.routineId)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {routine.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {orderedRoutines.length > 0
              ? '모닝·나이트 둘 다 고를 수 있어요.'
              : '아직 만든 루틴이 없어요. 제품만 등록해두고 루틴은 나중에 만들어도 괜찮아요.'}
          </Text>

          {onViewIngredients ? (
            <Pressable
              onPress={onViewIngredients}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.ingredientLink}
            >
              <Text style={styles.ingredientLinkText}>성분 먼저 볼래요</Text>
            </Pressable>
          ) : null}

          {errorMessage ? (
            <InlineErrorBanner message={errorMessage} style={styles.errorBanner} />
          ) : null}

          <View style={[styles.actions, { paddingBottom: insets.bottom + space[3] }]}>
            <Button
              label={nothingToDo ? '이미 제품 목록에 있어요' : '등록하기'}
              variant="primary"
              disabled={submitting || nothingToDo || !product}
              loading={submitting}
              onPress={onSubmit}
            />
            <Pressable onPress={onRequestClose} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim60,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.borderDividerFaint,
    marginBottom: space[4],
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginBottom: space[5],
  },
  imageBox: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productText: {
    flex: 1,
    gap: 2,
  },
  brand: {
    ...typography.caption,
    color: color.ink600,
  },
  name: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  category: {
    ...typography.caption,
    color: color.ink600,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: color.ink900,
    marginBottom: space[3],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  chip: {
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  chipActive: {
    backgroundColor: color.brand500,
    borderColor: color.brand500,
  },
  chipText: {
    ...typography.body,
    color: color.ink600,
  },
  chipTextActive: {
    color: color.bg,
    ...weightFamily('semibold'),
  },
  hint: {
    ...typography.caption,
    color: color.ink600,
    marginTop: space[2],
  },
  ingredientLink: {
    alignSelf: 'flex-start',
    marginTop: space[3],
  },
  ingredientLinkText: {
    ...typography.caption,
    color: color.brand500,
    ...weightFamily('semibold'),
  },
  errorBanner: {
    marginTop: space[3],
  },
  actions: {
    marginTop: space[5],
    gap: space[3],
  },
  cancelText: {
    ...typography.body,
    color: color.ink600,
    textAlign: 'center',
  },
});

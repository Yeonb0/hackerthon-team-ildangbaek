// IngredientCheckScreen.tsx — S-14 성분 확인 후 제품 등록
//
// ⚠️ 명세서 불일치 기록 (2026-08-14, 관리자님 확정 결정): 원래 F-PRODUCT-04 BR1은
// "이 화면의 기록 완료 버튼이 제품 기록의 저장 시점이다"였는데, 관리자님이 이 화면의
// 목적 자체를 "오늘 기록 저장"에서 "루틴에 추가"로 완전히 바꾸기로 하셨습니다.
// 그래서 이 화면은 더 이상 오늘의 기록(useSaveProductRecord)을 저장하지 않고,
// 선택한 루틴(들)에 이 제품을 추가(useAddProductToRoutine, ProductManualRegisterScreen과
// 같은 패턴)하는 것으로 끝납니다. 명세서 문서 자체는 아직 옛 버전이라 실제 구현과
// 다릅니다 — 다음에 명세서를 갱신하실 때 이 파일 주석을 참고해주세요.
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, IconBack, IconImagePlaceholder } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import {
  useAddProductToRoutine,
  useProductDetail,
  useRoutines,
  useSaveProductToLibrary,
} from '@/api/queries/product';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, radius, space, typography } from '@/theme';
import type { IngredientStatus } from '@/types/product';
import { PRODUCT_CATEGORY_LABELS } from '@/types/product';
import { weightFamily } from '@/theme/typography';
import {
  INGREDIENT_STATUS_COLOR,
  INGREDIENT_STATUS_ICON,
  INGREDIENT_STATUS_LABEL,
} from '@/lib/ingredientStatus';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

// 라벨·아이콘·색은 lib/ingredientStatus.ts 단일 정의를 씁니다(2026-08-17 전 화면 통일).
// 아이콘 크기만 이 화면 고유값입니다 — 성분 카드가 커서 다른 화면보다 크게 그립니다.
const STATUS_ICON = INGREDIENT_STATUS_ICON;
const STATUS_COLOR = INGREDIENT_STATUS_COLOR;
const STATUS_LABEL = INGREDIENT_STATUS_LABEL;

const STATUS_ICON_SIZE: Record<IngredientStatus, number> = {
  GOOD: 34,
  CAUTION: 34,
  INSUFFICIENT: 34,
};

export function IngredientCheckScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'IngredientCheck'>>();
  const insets = useSafeAreaInsets();
  const { productId, timeSlot } = route.params;

  const detailQuery = useProductDetail(productId);
  const routinesQuery = useRoutines();
  const addToRoutineMutation = useAddProductToRoutine();
  const saveToLibraryMutation = useSaveProductToLibrary();

  const [addError, setAddError] = useState<string | null>(null);
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<number>>(new Set());

  const toggleRoutine = (routineId: number) => {
    setSelectedRoutineIds((prev) => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  /**
   * 3지선다 한 번에 처리(2026-08-19, 관리자님 지시).
   *
   * 선택이 무엇이든 **제품 목록 저장(`POST /products/{id}/save`)은 항상 먼저** 합니다.
   * `addProductToRoutine`은 백엔드에 대응 API가 없어 완전 목업이라, 이걸 안 하면
   * 루틴만 고른 경우 실서버에는 아무것도 남지 않고 앱 재시작 시 제품이 사라집니다.
   * 백엔드 저장은 멱등이라(이미 담겨 있어도 200) 중복 호출 걱정은 없습니다.
   *
   * 「제품만 등록하기」면 루틴 루프가 0회 돌 뿐, 코드 경로는 같습니다.
   */
  const handleRegister = async () => {
    setAddError(null);
    try {
      await saveToLibraryMutation.mutateAsync(productId);
      // 모닝·나이트를 둘 다 고를 수 있어서 순서대로 하나씩 추가합니다
      // (ProductManualRegisterScreen과 같은 패턴 — 벌크 API가 없습니다).
      for (const routineId of selectedRoutineIds) {
        await addToRoutineMutation.mutateAsync({ routineId, productId });
      }
      // 방금 등록한 제품이 바로 보이는 제품 기록(S-11) 화면으로 돌아갑니다.
      navigation.replace(DetailRoutes.ProductRecord, { timeSlot });
    } catch {
      setAddError(
        selectedRoutineIds.size > 0
          ? '루틴에 추가하지 못했어요. 다시 시도해주세요.'
          : '제품을 등록하지 못했어요. 다시 시도해주세요.'
      );
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const navBar = (
    <View style={[styles.nav, { paddingTop: insets.top }]}>
      <Pressable
        onPress={handleGoBack}
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        hitSlop={8}
        style={styles.navBackButton}
      >
        <IconBack size={22} color={color.ink900} />
      </Pressable>
      <Text style={styles.navTitle}>성분 확인</Text>
    </View>
  );

  if (detailQuery.isLoading) {
    return (
      <View style={styles.container}>
        {navBar}
        {/* ⚠️ styles.content로 감싸지 않습니다 — content에는 flex가 없어(패딩·gap만)
            flex:1인 LoadingState/ErrorState가 높이 0으로 접힙니다. 상태 컴포넌트가
            layout='fullScreen'(기본값)에서 스스로 남은 높이를 채웁니다. */}
        <LoadingState variant="skeleton" skeletonLines={6} />
      </View>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    const isNotFound =
      detailQuery.error instanceof ApiError && detailQuery.error.code === ErrorCode.PRODUCT_NOT_FOUND;
    return (
      <View style={styles.container}>
        {navBar}
        <ErrorState
          variant={isNotFound ? 'notFound' : 'network'}
          onRetry={isNotFound ? undefined : () => detailQuery.refetch()}
        />
      </View>
    );
  }

  const product = detailQuery.data;
  const hasRoutines = !!routinesQuery.data && routinesQuery.data.length > 0;
  /** 루틴을 하나도 안 골랐다 = 「제품만 등록하기」 선택 상태. 별도 state를 두지 않습니다. */
  const libraryOnly = selectedRoutineIds.size === 0;
  // 칩 순서를 모닝 → 나이트로 고정합니다. 서버 반환 순서에 기대면 계정마다 칩 위치가
  // 달라져서, 같은 자리를 누르던 사용자가 반대 루틴을 고르게 됩니다.
  const orderedRoutines = [...(routinesQuery.data ?? [])].sort((a, b) =>
    a.timeSlot === b.timeSlot ? 0 : a.timeSlot === 'MORNING' ? -1 : 1
  );
  // 두 mutation이 한 버튼에 묶여 있어서 어느 쪽이든 도는 동안 버튼을 잠급니다.
  const busy = addToRoutineMutation.isPending || saveToLibraryMutation.isPending;

  return (
    <View style={styles.container}>
      {navBar}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {/* 관리자님 요청(2026-08-10) — 제품 사진 자리. imageUrl은 백엔드에서 내려줄 예정이라
              지금은 항상 placeholder입니다(ProductCard와 같은 패턴). */}
          <View style={styles.imageBox}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <IconImagePlaceholder size={40} color={color.ink300} />
            )}
          </View>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.category}>{PRODUCT_CATEGORY_LABELS[product.category] ?? product.category}</Text>
        </View>

        <Text style={styles.ingredientCount}>총 {product.ingredientCount}개 성분</Text>

        {product.ingredientCount === 0 ? (
          <Text style={styles.insufficientNote}>
            성분 데이터가 부족해요. 등록은 그대로 할 수 있어요.
          </Text>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>주요 성분</Text>
              <View style={styles.keyIngredientList}>
                {product.keyIngredients.map((ingredient) => (
                  <View key={ingredient.ingredientId} style={styles.keyIngredientRow}>
                    <View
                      accessibilityRole="image"
                      accessibilityLabel={`${STATUS_LABEL[ingredient.status]} 성분`}
                    >
                      <AppIcon
                        name={STATUS_ICON[ingredient.status]}
                        size={STATUS_ICON_SIZE[ingredient.status]}
                        color={STATUS_COLOR[ingredient.status]}
                      />
                    </View>
                    <Text style={styles.keyIngredientName}>
                      {ingredient.name}
                      {ingredient.note ? ` · ${ingredient.note}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>전체 성분</Text>
              <Text style={styles.fullIngredientText}>
                {product.ingredients.map((i) => i.name).join(', ')}
              </Text>
            </View>
          </>
        )}

        {/* 2026-08-19(세션 18, 관리자님 지시) — 버튼 2개 → **3지선다 칩 한 줄**로 교체.
            「제품만 등록하기」 / 「모닝 루틴」 / 「나이트 루틴」이고 모닝·나이트는 중복
            선택됩니다. ProductManualRegisterScreen(직접 등록)이 이미 쓰던 구조라 두
            등록 경로의 조작 방식이 같아집니다.

            · 「제품만 등록하기」는 배타 선택 — 누르면 루틴 선택이 전부 풀립니다.
              반대로 루틴을 하나라도 고르면 자동으로 해제됩니다(size > 0으로 판정).
            · 칩 라벨은 서버가 준 `routine.name`입니다. 사용자가 루틴 이름을 바꾸면
              그 이름이 그대로 보여야 해서 「모닝 루틴」 고정 문자열을 쓰지 않았습니다.
              목업·기본 계정에서는 이 값이 그대로 「모닝루틴」/「나이트루틴」입니다.
            · 정렬은 모닝 → 나이트 고정입니다(서버 반환 순서에 의존하지 않게). */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>어디에 등록할까요?</Text>
          <View style={styles.routineChipRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="제품만 등록하기"
              accessibilityState={{ selected: libraryOnly }}
              onPress={() => setSelectedRoutineIds(new Set())}
              style={[styles.routineChip, libraryOnly && styles.routineChipActive]}
            >
              <Text style={[styles.routineChipText, libraryOnly && styles.routineChipTextActive]}>
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
                  onPress={() => toggleRoutine(routine.routineId)}
                  style={[styles.routineChip, active && styles.routineChipActive]}
                >
                  <Text style={[styles.routineChipText, active && styles.routineChipTextActive]}>
                    {routine.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {hasRoutines ? (
            <Text style={styles.insufficientNote}>모닝·나이트 둘 다 고를 수 있어요.</Text>
          ) : (
            /* 2026-08-19 — 예전 문구는 "기록 허브에서 루틴을 먼저 만들어주세요"였는데,
               정작 루틴을 만들 방법이 없어서 신규 사용자가 여기서 막혔습니다(관리자님
               15번 항목). 이제 「제품만 등록하기」로 그대로 진행됩니다. */
            <Text style={styles.insufficientNote}>
              아직 만든 루틴이 없어요. 제품만 등록해두고 루틴은 나중에 만들어도 괜찮아요.
            </Text>
          )}
        </View>
      </ScrollView>

      {addError ? <InlineErrorBanner message={addError} style={styles.inlineBanner} /> : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[5] }]}>
        <Button
          label={product.saved && libraryOnly ? '이미 제품 목록에 있어요' : '등록하기'}
          variant="primary"
          disabled={busy || (product.saved && libraryOnly)}
          loading={busy}
          onPress={handleRegister}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 75,
    paddingHorizontal: space[3],
  },
  navBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[6],
    paddingBottom: space[8],
    gap: space[5],
  },
  header: {
    gap: 2,
  },
  imageBox: {
    width: 128,
    height: 128,
    borderRadius: radius.lg,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: space[3],
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  brand: {
    ...typography.caption,
    color: color.ink600,
  },
  title: {
    ...typography.h1,
    color: color.ink900,
  },
  category: {
    ...typography.caption,
    color: color.ink600,
  },
  ingredientCount: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  insufficientNote: {
    ...typography.caption,
    color: color.ink600,
  },
  section: {
    gap: space[3],
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  keyIngredientList: {
    gap: space[2],
  },
  keyIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
  },
  keyIngredientName: {
    ...typography.body,
    color: color.ink900,
    flexShrink: 1,
  },
  fullIngredientText: {
    ...typography.caption,
    color: color.ink600,
    lineHeight: 20,
  },
  inlineBanner: {
    marginHorizontal: space[5],
  },
  bottomBar: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
  saveButton: {
    width: '100%',
  },
  routineChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  routineChip: {
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  routineChipActive: {
    backgroundColor: color.brand500,
    borderColor: color.brand500,
  },
  routineChipText: {
    ...typography.body,
    color: color.ink600,
  },
  routineChipTextActive: {
    color: color.bg,
    ...weightFamily('semibold'),
  },
});
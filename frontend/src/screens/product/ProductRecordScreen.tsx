// ProductRecordScreen.tsx
//
// S-11(기본 상태) / S-12(검색 결과 상태) — 별도 화면으로 나누지 않고 검색어 유무로
// 내부 분기합니다(F-PRODUCT-01 BR1, 명세서에도 두 화면이 "같은 화면"으로 정의돼 있음).
//
// 기록 방식(관리자님 확인, 2026-08-10) — 명세서(F-PRODUCT-04 BR1)는 "성분 확인 화면의
// 기록 완료 버튼이 저장 시점"이라고 못박고 있지만, 이미 저장된(=이미 성분을 한 번 본)
// 제품까지 매번 성분 확인 화면을 거치게 하는 건 불필요한 마찰이라는 관리자님 판단으로
// 다음과 같이 나눴습니다:
//   - "저장된 제품" 목록: 체크로 여러 개 골라 한 번에 기록(성분 확인 화면 생략)
//   - 검색 결과 중 "저장됨"이 아닌 새 제품: 계속 S-14(성분 확인)를 거쳐 기록
//   - 스캔(S-13)으로 찾은 제품: 첫 발견으로 간주하고 계속 S-14를 거침(변경 없음)
// PRODUCT-05(POST /product-records)가 애초에 productIds 배열을 받게 돼 있어서(최대 30개),
// 체크 다중 선택 저장은 기존 API 그대로 씁니다 — 새 엔드포인트가 필요 없습니다.
// ⚠️ 트레이드오프: 저장된 제품을 탭해서 성분을 다시 들여다볼 방법이 이제 없습니다(바로
// 체크됩니다). 필요하시면 별도 "성분 보기" 진입점을 다시 추가할 수 있습니다.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Popup } from '@/components/base/Popup';
import { Toast } from '@/components/base/Toast';
import { IconClose } from '@/components/icons';
import { ProductCard } from '@/components/domain/ProductCard';
import { CategoryFilterBar } from '@/components/domain/CategoryFilterBar';
import { ProductSearchBar } from '@/components/domain/ProductSearchBar';
import { RoutineQuickRecordCard } from '@/components/domain/RoutineQuickRecordCard';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useProductRecordHome,
  useProductSearch,
  useRoutineQuickRecord,
  useRoutines,
  useSaveProductRecord,
} from '@/api/queries/product';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, radius, space, typography } from '@/theme';
import type { RoutineSummaryItem, SavedProductSummary } from '@/types/product';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/types/product';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const TIME_SLOT_TITLE = { MORNING: '모닝 제품 기록', NIGHT: '나이트 제품 기록' } as const;

/** 루틴 바로 기록·체크 저장·검색결과 즉시 저장 3곳이 전부 "중복 시 확인" 팝업을 씁니다 —
 * 하나의 상태로 통일해서 각 호출부가 재시도 함수만 넘기면 되게 했습니다. */
type PendingConfirm = {
  title: string;
  message: string;
  onConfirmRetry: () => void;
};

function buildSelectionSummary(
  selectedIds: number[],
  savedProducts: Pick<SavedProductSummary, 'productId' | 'name'>[]
): string {
  const names = selectedIds
    .map((id) => savedProducts.find((p) => p.productId === id)?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return `제품 ${selectedIds.length}개`;
  return names.length > 1 ? `${names[0]} 외 ${names.length - 1}개` : names[0];
}

// "저장된 제품" 카테고리 필터 칩 라벨은 types/product.ts의 PRODUCT_CATEGORY_LABELS(관리자님
// 확정 12종, 2026-08-10 — 백엔드에도 이 목록대로 전달 예정)를 그대로 씁니다.
function getCategoryLabel(category: string): string {
  return PRODUCT_CATEGORY_LABELS[category] ?? category;
}

export function ProductRecordScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'ProductRecord'>>();
  const insets = useSafeAreaInsets();
  const { timeSlot } = route.params;

  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  // BR: 검색어 1~20자, 공백만 입력 시 요청하지 않음(useProductSearch의 enabled가 담당) —
  // 여기서는 "검색 상태로 전환할지"만 판단합니다.
  const isSearchMode = debouncedKeyword.trim().length > 0;

  const homeQuery = useProductRecordHome(timeSlot);
  const searchQuery = useProductSearch(debouncedKeyword);
  const quickRecordMutation = useRoutineQuickRecord();
  const saveMutation = useSaveProductRecord();
  // PRODUCT-01(routines)은 요약 문자열만 줘서, 펼침 UI(관리자님 요청, 2026-08-10)에 필요한
  // 실제 제품 목록은 PRODUCT-07을 따로 불러옵니다. timeSlot 인자 없이 전체를 받아서
  // 모닝·나이트 루틴 둘 다 펼칠 수 있게 합니다.
  const routinesQuery = useRoutines();

  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [routineError, setRoutineError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  // 기록 성공 안내(Toast). skinRecordSuggested가 true면(F-PRODUCT-07과 같은 조건 — 같은
  // 시간대 피부 기록이 아직 없음) 피부 기록으로 바로 이어갈 수 있는 액션을 추가로 보여줍니다.
  const [successInfo, setSuccessInfo] = useState<{
    summary: string;
    skinRecordSuggested: boolean;
  } | null>(null);

  const handleQuickRecord = (routine: RoutineSummaryItem, force = false) => {
    setRoutineError(null);
    quickRecordMutation.mutate(
      { routineId: routine.routineId, timeSlot, force },
      {
        onSuccess: (data) => {
          setConfirm(null);
          setSuccessInfo({
            summary: `${routine.name} 기록을 저장했어요.`,
            skinRecordSuggested: data.skinRecordSuggested,
          });
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === ErrorCode.ROUTINE_TIME_SLOT_MISMATCH) {
            setConfirm({
              title: '시간대가 달라요',
              message: error.message,
              onConfirmRetry: () => handleQuickRecord(routine, true),
            });
            return;
          }
          if (error instanceof ApiError && error.code === ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT) {
            setConfirm({
              title: '이미 기록한 시간대예요',
              message: error.message,
              onConfirmRetry: () => handleQuickRecord(routine, true),
            });
            return;
          }
          setRoutineError(
            error instanceof ApiError ? error.message : '루틴 기록에 실패했어요. 다시 시도해 주세요.'
          );
        },
      }
    );
  };

  const handleToggleProduct = (productId: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleBulkSave = (force = false) => {
    const productIds = Array.from(selectedProductIds);
    if (productIds.length === 0 || saveMutation.isPending) return;
    setSaveError(null);
    saveMutation.mutate(
      { timeSlot, productIds, force },
      {
        onSuccess: (result) => {
          setConfirm(null);
          setSuccessInfo({
            summary: buildSelectionSummary(productIds, homeQuery.data?.savedProducts ?? []),
            skinRecordSuggested: result.skinRecordSuggested,
          });
          setSelectedProductIds(new Set());
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT) {
            setConfirm({
              title: '이미 기록한 시간대예요',
              message: error.message,
              onConfirmRetry: () => handleBulkSave(true),
            });
            return;
          }
          setSaveError(
            error instanceof ApiError ? error.message : '기록 저장에 실패했어요. 다시 시도해 주세요.'
          );
        },
      }
    );
  };

  // 검색 결과 중 이미 "저장된" 제품(saved:true) 탭 — 성분은 이미 한 번 봤다고 보고
  // 바로 오늘 기록으로 저장합니다(성분 확인 화면 재방문 없음).
  const handleQuickSaveSingle = (productId: number, productName: string, force = false) => {
    if (saveMutation.isPending) return;
    setSaveError(null);
    saveMutation.mutate(
      { timeSlot, productIds: [productId], force },
      {
        onSuccess: (result) => {
          setConfirm(null);
          setSuccessInfo({
            summary: `${productName} 기록을 저장했어요.`,
            skinRecordSuggested: result.skinRecordSuggested,
          });
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT) {
            setConfirm({
              title: '이미 기록한 시간대예요',
              message: error.message,
              onConfirmRetry: () => handleQuickSaveSingle(productId, productName, true),
            });
            return;
          }
          setSaveError(
            error instanceof ApiError ? error.message : '기록 저장에 실패했어요. 다시 시도해 주세요.'
          );
        },
      }
    );
  };

  const handleScanPress = () => navigation.navigate(DetailRoutes.ProductScan, { timeSlot });
  // 검색 결과 중 "저장됨"이 아닌 새 제품 — 첫 발견이라 성분 확인(S-14)을 거칩니다.
  const handleGoToIngredientCheck = (productId: number) =>
    navigation.navigate(DetailRoutes.IngredientCheck, { productId, timeSlot });
  const handleGoToSkinRecord = () => {
    setSuccessInfo(null);
    navigation.navigate(DetailRoutes.PhotoGuide, { timeSlot });
  };
  // Phase 11-C(관리자 결정, 2026-08-13) — TBD-07 해소. 검색 결과 없음(빈 상태)에서 오면
  // 검색어를 제품명에 prefill해줍니다.
  const handleGoToManualRegister = (prefillKeyword?: string) =>
    navigation.navigate(DetailRoutes.ProductManualRegister, {
      timeSlot,
      initialKeyword: prefillKeyword,
    });

  return (
    <View style={[styles.container, { paddingTop: insets.top + space[4] }]}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>{TIME_SLOT_TITLE[timeSlot]}</Text>
      </View>

      {/* Figma PROD-01 기준 — 선택한 제품을 칩으로 보여주고 ×로 바로 해제할 수 있게 합니다
          (관리자님 요청, 2026-08-14). 검색 모드에선 숨깁니다 — 이 칩이 가리키는 선택 상태(체크)는
          "저장된 제품" 목록 전용이라, 검색 결과 상태에서 보이면 혼란을 줄 수 있어서
          기존 하단 바 노출 조건(!isSearchMode)과 맞췄습니다. */}
      {!isSearchMode && selectedProductIds.size > 0 ? (
        <View style={styles.chipStrip}>
          {Array.from(selectedProductIds).map((id) => {
            const product = homeQuery.data?.savedProducts.find((p) => p.productId === id);
            if (!product) return null;
            return (
              <Pressable
                key={id}
                onPress={() => handleToggleProduct(id)}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={`${product.name} 선택 해제`}
              >
                <Text style={styles.chipText} numberOfLines={1}>
                  {product.name}
                </Text>
                <IconClose size={12} color={color.brand700} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isSearchMode ? (
          <SearchResultsSection
            query={searchQuery}
            keyword={debouncedKeyword}
            onSelectNew={handleGoToIngredientCheck}
            onQuickSave={(productId, name) => handleQuickSaveSingle(productId, name)}
            onRetry={() => searchQuery.refetch()}
            onScan={handleScanPress}
            onDirectRegister={() => handleGoToManualRegister(keyword)}
            searchKeyword={keyword}
            onSearchKeywordChange={setKeyword}
          />
        ) : (
          <HomeSection
            homeQuery={homeQuery}
            routinesQuery={routinesQuery}
            onQuickRecord={handleQuickRecord}
            quickRecordingRoutineId={
              quickRecordMutation.isPending ? quickRecordMutation.variables?.routineId ?? null : null
            }
            routineError={routineError}
            onRetryHome={() => homeQuery.refetch()}
            selectedProductIds={selectedProductIds}
            onToggleProduct={handleToggleProduct}
            onViewIngredients={handleGoToIngredientCheck}
            onDirectRegister={() => handleGoToManualRegister()}
            searchKeyword={keyword}
            onSearchKeywordChange={setKeyword}
            onScanPress={handleScanPress}
          />
        )}
      </ScrollView>

      {!isSearchMode && selectedProductIds.size > 0 ? (
        <View style={[styles.bulkBar, { paddingBottom: insets.bottom + space[4] }]}>
          {saveError ? <InlineErrorBanner message={saveError} style={styles.bulkErrorBanner} /> : null}
          <View style={styles.bulkBarRow}>
            <Button
              label="선택 취소"
              variant="ghost"
              onPress={() => setSelectedProductIds(new Set())}
              style={styles.bulkCancelButton}
            />
            <Button
              label={`기록 완료 (${selectedProductIds.size})`}
              variant="primary"
              loading={saveMutation.isPending}
              onPress={() => handleBulkSave(false)}
              style={styles.bulkSaveButton}
            />
          </View>
        </View>
      ) : null}

      <Popup
        visible={confirm !== null}
        title={confirm?.title ?? ''}
        description={confirm?.message ?? ''}
        primaryLabel="그래도 기록"
        onPrimaryPress={() => confirm?.onConfirmRetry()}
        secondaryLabel="취소"
        onSecondaryPress={() => setConfirm(null)}
        onRequestClose={() => setConfirm(null)}
      />

      <Toast
        visible={successInfo !== null}
        message={successInfo ? `기록 완료! ${successInfo.summary}` : ''}
        icon="check"
        actionLabel={successInfo?.skinRecordSuggested ? '피부도 기록하기' : undefined}
        onActionPress={handleGoToSkinRecord}
        onDismiss={() => setSuccessInfo(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 기본 상태 (S-11) — 자주 쓰는 루틴 → 저장된 제품(체크로 기록)
// ---------------------------------------------------------------------------
function HomeSection({
  homeQuery,
  routinesQuery,
  onQuickRecord,
  quickRecordingRoutineId,
  routineError,
  onRetryHome,
  selectedProductIds,
  onToggleProduct,
  onViewIngredients,
  onDirectRegister,
  searchKeyword,
  onSearchKeywordChange,
  onScanPress,
}: {
  homeQuery: ReturnType<typeof useProductRecordHome>;
  routinesQuery: ReturnType<typeof useRoutines>;
  onQuickRecord: (routine: RoutineSummaryItem) => void;
  quickRecordingRoutineId: number | null;
  routineError: string | null;
  onRetryHome: () => void;
  selectedProductIds: Set<number>;
  onToggleProduct: (productId: number) => void;
  onViewIngredients: (productId: number) => void;
  onDirectRegister: () => void;
  searchKeyword: string;
  onSearchKeywordChange: (text: string) => void;
  onScanPress: () => void;
}) {
  // "저장된 제품" 전용 카테고리 필터(관리자님 요청, 2026-08-10) — 검색 결과나 루틴에는
  // 적용하지 않습니다. 검색 모드로 전환하면(HomeSection이 통째로 언마운트) 자연히
  // 초기화되는데, 필터가 "이 목록 안에서 찾기" 용도라 그 정도면 충분하다고 판단했습니다.
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  if (homeQuery.isLoading) {
    return <LoadingState variant="skeleton" skeletonLines={4} />;
  }
  if (homeQuery.isError || !homeQuery.data) {
    return <ErrorState variant="network" onRetry={onRetryHome} />;
  }

  const { routines, savedProducts, alreadyRecorded } = homeQuery.data;
  // 관리자님 요청(2026-08-10) — 저장된 제품에 실제로 있는 카테고리만이 아니라, 표준
  // 12종(PRODUCT_CATEGORIES) 전체를 항상 필터로 보여줍니다. 선택했는데 해당 카테고리
  // 제품이 없으면 아래 filteredSavedProducts가 빈 배열이 되고, EmptyState로 안내합니다.
  const filteredSavedProducts = categoryFilter
    ? savedProducts.filter((p) => p.category === categoryFilter)
    : savedProducts;

  return (
    <View style={styles.sections}>
      {alreadyRecorded ? (
        <Text style={styles.recordedHint}>오늘 이미 기록했어요 · 다시 저장하면 갱신돼요</Text>
      ) : null}

      {routineError ? <InlineErrorBanner message={routineError} /> : null}

      {/* BR7: 루틴이 없으면 섹션을 생략합니다 */}
      {routines.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자주 쓰는 루틴</Text>
          <View style={styles.list}>
            {routines.map((routine) => (
              <RoutineQuickRecordCard
                key={routine.routineId}
                routineId={routine.routineId}
                name={routine.name}
                timeSlot={routine.timeSlot}
                productCount={routine.productCount}
                productSummary={routine.productSummary}
                loading={quickRecordingRoutineId === routine.routineId}
                onQuickRecord={() => onQuickRecord(routine)}
                products={
                  routinesQuery.data?.find((r) => r.routineId === routine.routineId)?.products
                }
                productsError={routinesQuery.isError}
                onRetryProducts={() => routinesQuery.refetch()}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleLine}>
            <Text style={styles.sectionTitle}>저장된 제품</Text>
            {savedProducts.length > 0 ? (
              <Text style={styles.sectionCount}>{savedProducts.length}개</Text>
            ) : null}
          </View>
          {savedProducts.length > 0 ? (
            <Text style={styles.sectionHint}>탭해서 오늘 쓴 제품을 체크하세요</Text>
          ) : null}
        </View>
        {savedProducts.length === 0 ? (
          <EmptyState
            icon="navShop"
            title="아직 저장된 제품이 없어요"
            description="검색하거나 스캔해서 첫 제품을 기록해보세요."
          />
        ) : (
          <>
            <CategoryFilterBar
              categories={[...PRODUCT_CATEGORIES]}
              selected={categoryFilter}
              onSelect={setCategoryFilter}
              getLabel={getCategoryLabel}
            />
            {filteredSavedProducts.length === 0 ? (
              <EmptyState
                icon="filter"
                title="해당 카테고리의 제품이 없어요"
                description="초기화를 눌러 전체 제품을 다시 볼 수 있어요."
              />
            ) : (
              <View style={styles.list}>
                {filteredSavedProducts.map((product) => (
                  <ProductCard
                    key={product.productId}
                    brand={product.brand}
                    name={product.name}
                    category={getCategoryLabel(product.category)}
                    selected={selectedProductIds.has(product.productId)}
                    onPress={() => onToggleProduct(product.productId)}
                    onViewIngredients={() => onViewIngredients(product.productId)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* 관리자님 요청(2026-08-14) — 검색창을 상단 헤더에서 "저장된 제품" 섹션 아래로 이동.
          명세서 F-PRODUCT-01 BR2("검색창은 기본 상태와 검색 결과 상태 모두에서 상시 노출")는
          "화면 어딘가에 항상 있어야 한다"는 뜻이라, 위치를 옮기는 것 자체는 이 규칙과
          충돌하지 않습니다 — 그래서 검색 결과 상태(SearchResultsSection)에도 동일하게
          검색창을 넣어서 계속 보이게 했습니다. */}
      <ProductSearchBar
        value={searchKeyword}
        onChangeText={onSearchKeywordChange}
        onScanPress={onScanPress}
        placeholder="추가할 상품을 검색해보세요"
      />

      <DirectRegisterButton onPress={onDirectRegister} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 검색 결과 상태 (S-12)
// ---------------------------------------------------------------------------
function SearchResultsSection({
  query,
  keyword,
  onSelectNew,
  onQuickSave,
  onRetry,
  onScan,
  onDirectRegister,
  searchKeyword,
  onSearchKeywordChange,
}: {
  query: ReturnType<typeof useProductSearch>;
  keyword: string;
  onSelectNew: (productId: number) => void;
  onQuickSave: (productId: number, name: string) => void;
  onRetry: () => void;
  onScan: () => void;
  onDirectRegister: () => void;
  searchKeyword: string;
  onSearchKeywordChange: (text: string) => void;
}) {
  // 명세서 F-PRODUCT-01 BR2 — 검색 결과 상태에서도 검색창은 계속 보여야 합니다.
  // HomeSection에서는 "저장된 제품" 아래 있지만, 이 상태는 그 섹션 자체가 없어서
  // 화면 맨 위에 둡니다(검색어를 바로 고쳐 쓸 수 있어야 하니 접근성 우선).
  const searchBar = (
    <ProductSearchBar
      value={searchKeyword}
      onChangeText={onSearchKeywordChange}
      onScanPress={onScan}
      placeholder="추가할 상품을 검색해보세요"
    />
  );

  if (query.isLoading) {
    return (
      <View style={styles.sections}>
        {searchBar}
        <LoadingState variant="skeleton" skeletonLines={4} />
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.sections}>
        {searchBar}
        <ErrorState variant="network" onRetry={onRetry} />
      </View>
    );
  }

  const { totalCount, products } = query.data;

  if (totalCount === 0) {
    // Figma PROD-03(node 193:5190) 배치 그대로 — 검색어를 못 찾았을 때 "스캔으로 찾기"/
    // "직접 등록하기" 2버튼을 나란히 보여줍니다(관리자 결정, 2026-08-13).
    return (
      <View style={styles.sections}>
        {searchBar}
        <View style={styles.notFoundArea}>
          <Text style={styles.notFoundTitle}>&apos;{keyword}&apos;을 찾지 못했어요</Text>
          <Text style={styles.notFoundDescription}>아직 등록된 제품이 없어요</Text>
          <View style={styles.notFoundActions}>
            <Button label="스캔으로 찾기" variant="secondary" onPress={onScan} style={styles.notFoundButton} />
            <Button
              label="직접 등록하기"
              variant="primary"
              onPress={onDirectRegister}
              style={styles.notFoundButton}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sections}>
      {searchBar}
      <Text style={styles.resultCount}>검색 결과 {totalCount}개</Text>
      <View style={styles.list}>
        {products.map((product) => (
          <ProductCard
            key={product.productId}
            brand={product.brand}
            name={product.name}
            category={getCategoryLabel(product.category)}
            badgeLabel={product.saved ? '저장됨' : undefined}
            onViewIngredients={product.saved ? () => onSelectNew(product.productId) : undefined}
            onPress={() =>
              product.saved
                ? onQuickSave(product.productId, product.name)
                : onSelectNew(product.productId)
            }
          />
        ))}
      </View>
    </View>
  );
}

/** Phase 11-C(관리자 결정, 2026-08-13) — TBD-07 해소. 이전엔 목적지가 없어 disabled였음.
 * Phase 12(2026-08-14) — Figma PROD-01 기준 버튼 대신 텍스트 링크 스타일로 변경(보라색 톤 유지). */
function DirectRegisterButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.directRegister} accessibilityRole="button">
      <Text style={styles.directRegisterText}>+ 제품 직접 등록하기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  headerArea: {
    paddingHorizontal: space[5],
    gap: space[3],
    paddingBottom: space[3],
  },
  title: {
    ...typography.h1,
    color: color.ink900,
  },
  chipStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    paddingHorizontal: space[5],
    paddingBottom: space[3],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    backgroundColor: color.brand50,
    borderWidth: 1,
    borderColor: color.brand100,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    maxWidth: 200,
  },
  chipText: {
    ...typography.caption,
    color: color.brand700,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[8],
  },
  sections: {
    gap: space[6],
  },
  section: {
    gap: space[3],
  },
  sectionTitleRow: {
    gap: 2,
  },
  sectionTitleLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space[2],
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  sectionCount: {
    ...typography.caption,
    color: color.brand700,
  },
  sectionHint: {
    ...typography.caption,
    color: color.ink600,
  },
  list: {
    gap: space[2],
  },
  resultCount: {
    ...typography.caption,
    color: color.ink600,
  },
  recordedHint: {
    ...typography.caption,
    color: color.ink600,
  },
  directRegister: {
    alignItems: 'center',
    paddingTop: space[2],
    paddingVertical: space[2],
  },
  directRegisterText: {
    ...typography.caption,
    color: color.brand700,
    fontWeight: '600',
  },
  notFoundArea: {
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[8],
  },
  notFoundTitle: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  notFoundDescription: {
    ...typography.caption,
    color: color.ink600,
    marginBottom: space[2],
  },
  notFoundActions: {
    flexDirection: 'row',
    gap: space[2],
    alignSelf: 'stretch',
  },
  notFoundButton: {
    flex: 1,
  },
  bulkBar: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
    backgroundColor: color.bg,
    borderTopWidth: 1,
    borderTopColor: color.brand50,
  },
  bulkErrorBanner: {
    marginBottom: space[1],
  },
  bulkBarRow: {
    flexDirection: 'row',
    gap: space[3],
  },
  bulkCancelButton: {
    flex: 1,
  },
  bulkSaveButton: {
    flex: 2,
  },
});
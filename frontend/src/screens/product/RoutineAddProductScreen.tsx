// RoutineAddProductScreen.tsx — 루틴 수정 전용 "제품 추가" 화면
//
// Phase 11(세션5, 관리자님 지시 2026-08-15). RoutineEditScreen의 "+ 제품 추가하기"가
// 이 화면으로 연결됩니다. 저장된 제품(SavedProductSummary) 중에서만 체크박스로 여러 개
// 골라 하단 "추가 (N)" 버튼으로 한 번에 루틴에 담습니다(관리자님 확인 — 검색/신규 제품은
// 이 화면 범위 밖, 대신 화면 하단 "새 제품 등록하기" 링크로 ProductManualRegisterScreen에
// 연결해서 신규 제품 등록 시점에 루틴 추가까지 한 번에 되게 합니다).
//
// 루틴에 이미 들어있는 제품은 목록에서 제외합니다(중복 추가 방지) — useRoutines()로 현재
// 루틴의 구성을 가져와 productId로 걸러냅니다. addProductToRoutine 자체도 중복이면
// 무시하도록 이미 돼 있지만(mock/product.ts), 목록에 아예 안 보이는 게 더 명확합니다.
//
// addProductToRoutine API가 productId 하나씩만 받아서(백엔드 API 자체가 없어 완전
// 목업, ProductManualRegisterScreen·IngredientCheckScreen과 같은 제약), 여러 개 선택 시
// 순서대로 하나씩 mutateAsync를 호출합니다.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { IconBack } from '@/components/icons';
import { ProductCard } from '@/components/domain/ProductCard';
import { CategoryFilterBar } from '@/components/domain/CategoryFilterBar';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { useAddProductToRoutine, useProductRecordHome, useRoutines } from '@/api/queries/product';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, radius, space, typography } from '@/theme';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/types/product';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

function getCategoryLabel(category: string): string {
  return PRODUCT_CATEGORY_LABELS[category] ?? category;
}

export function RoutineAddProductScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'RoutineAddProduct'>>();
  const insets = useSafeAreaInsets();
  const { routineId, timeSlot } = route.params;

  const routinesQuery = useRoutines();
  const homeQuery = useProductRecordHome(timeSlot);
  const addToRoutineMutation = useAddProductToRoutine();

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleProduct = (productId: number) => {
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

  const handleAdd = async () => {
    if (selectedProductIds.size === 0 || addToRoutineMutation.isPending) return;
    setSubmitError(null);
    try {
      // 여러 개 선택 시 순서대로 하나씩 — ProductManualRegisterScreen과 같은 이유(API가
      // productId 하나만 받음)입니다.
      for (const productId of selectedProductIds) {
        await addToRoutineMutation.mutateAsync({ routineId, productId });
      }
      navigation.goBack();
    } catch {
      setSubmitError('루틴에 추가하지 못했어요. 다시 시도해주세요.');
    }
  };

  const handleGoToRegister = () => {
    navigation.navigate(DetailRoutes.ProductManualRegister, {
      timeSlot,
      initialRoutineId: routineId,
    });
  };

  if (routinesQuery.isLoading || homeQuery.isLoading) {
    return <LoadingState variant="spinner" />;
  }

  if (routinesQuery.isError || homeQuery.isError || !routinesQuery.data || !homeQuery.data) {
    return (
      <ErrorState
        variant="network"
        onRetry={() => {
          routinesQuery.refetch();
          homeQuery.refetch();
        }}
      />
    );
  }

  const activeRoutine = routinesQuery.data.find((r) => r.routineId === routineId);
  const existingProductIds = new Set(activeRoutine?.products.map((p) => p.productId) ?? []);

  // 이미 루틴에 있는 제품은 목록에서 제외 — 중복 추가 방지.
  const addableProducts = homeQuery.data.savedProducts.filter(
    (p) => !existingProductIds.has(p.productId)
  );
  const filteredProducts = categoryFilter
    ? addableProducts.filter((p) => p.category === categoryFilter)
    : addableProducts;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space[4] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <IconBack size={22} color={color.ink900} />
        </Pressable>
        <Text style={styles.title}>제품 추가</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {addableProducts.length === 0 ? (
          <EmptyState
            icon="navShop"
            title="추가할 수 있는 저장된 제품이 없어요"
            description="저장된 제품이 이미 다 이 루틴에 있거나, 아직 저장된 제품이 없어요. 새 제품을 등록해서 추가할 수 있어요."
            actionLabel="새 제품 등록하기"
            onAction={handleGoToRegister}
          />
        ) : (
          <>
            <CategoryFilterBar
              categories={[...PRODUCT_CATEGORIES]}
              selected={categoryFilter}
              onSelect={setCategoryFilter}
              getLabel={getCategoryLabel}
              style={styles.filterBar}
            />
            {filteredProducts.length === 0 ? (
              <EmptyState
                icon="filter"
                title="해당 카테고리의 제품이 없어요"
                description="전체를 눌러 다시 볼 수 있어요."
              />
            ) : (
              <View style={styles.listCard}>
                {filteredProducts.map((product, index) => {
                  const isSelected = selectedProductIds.has(product.productId);
                  return (
                    <ProductCard
                      key={product.productId}
                      variant="plain"
                      showCheckbox
                      brand={product.brand}
                      name={product.name}
                      category={getCategoryLabel(product.category)}
                      selected={isSelected}
                      onPress={() => toggleProduct(product.productId)}
                      // 선택된 행은 테두리로 이미 구분되니 위 구분선은 생략합니다(안 겹치게).
                      style={index > 0 && !isSelected ? styles.listDivider : undefined}
                    />
                  );
                })}
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 제품 등록하기"
              onPress={handleGoToRegister}
              style={styles.registerLink}
            >
              <Text style={styles.registerLinkText}>찾는 제품이 없나요? 새 제품 등록하기</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {addableProducts.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
          {submitError ? <InlineErrorBanner message={submitError} style={styles.errorBanner} /> : null}
          <Button
            label={selectedProductIds.size > 0 ? `추가 (${selectedProductIds.size})` : '추가'}
            variant="primary"
            loading={addToRoutineMutation.isPending}
            disabled={selectedProductIds.size === 0}
            onPress={handleAdd}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  title: {
    ...typography.h1,
    color: color.ink900,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[6],
    gap: space[4],
  },
  filterBar: {
    marginBottom: space[1],
  },
  listCard: {
    backgroundColor: color.bg,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    overflow: 'hidden',
  },
  listDivider: {
    borderTopWidth: 1,
    borderTopColor: color.brand50,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: space[3],
  },
  registerLinkText: {
    ...typography.caption,
    color: color.brand700,
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
  errorBanner: {
    marginBottom: space[2],
  },
});
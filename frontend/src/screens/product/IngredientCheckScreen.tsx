// IngredientCheckScreen.tsx — S-14 성분 확인 및 기록 저장
//
// F-PRODUCT-04 BR1: "이 화면의 기록 완료 버튼이 제품 기록의 저장 시점이다." 이전 화면
// (검색/저장 제품 목록·스캔)에서는 절대 저장하지 않습니다. 저장 성공 후에는 F-PRODUCT-07
// 조건(skinRecordSuggested)에 따라 피부 기록 유도 카드를 같은 화면 하단에 보여줍니다.
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconImagePlaceholder } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Popup } from '@/components/base/Popup';
import { Tag, TagVariant } from '@/components/base/Tag';
import { SkinRecordSuggestionCard } from '@/components/domain/SkinRecordSuggestionCard';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { useProductDetail, useSaveProductRecord } from '@/api/queries/product';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList, MainTabRoutes } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { IngredientStatus, SaveProductRecordResult } from '@/types/product';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const STATUS_TO_TAG_VARIANT: Record<IngredientStatus, TagVariant> = {
  GOOD: 'match',
  CAUTION: 'caution',
  INSUFFICIENT: 'insufficient',
};

export function IngredientCheckScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'IngredientCheck'>>();
  const insets = useSafeAreaInsets();
  const { productId, timeSlot } = route.params;

  const detailQuery = useProductDetail(productId);
  const saveMutation = useSaveProductRecord();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveProductRecordResult | null>(null);

  const handleSave = (force = false) => {
    setSaveError(null);
    saveMutation.mutate(
      { timeSlot, productIds: [productId], force },
      {
        onSuccess: (result) => {
          setConfirmDuplicate(null);
          setSaved(result);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT) {
            setConfirmDuplicate(error.message);
            return;
          }
          setSaveError(
            error instanceof ApiError ? error.message : '기록 저장에 실패했어요. 다시 시도해 주세요.'
          );
        },
      }
    );
  };

  const handleGoToSkinRecord = () => {
    navigation.navigate(DetailRoutes.PhotoGuide, { timeSlot });
  };

  const handleScanAnother = () => {
    // replace를 씁니다 — ProductScanScreen과 같은 이유로, 저장이 끝난 이 화면으로
    // 뒤로가기 할 이유가 없어서 스택에서 빼고 새 스캔 화면으로 바로 넘어갑니다.
    // (관리자님 요청, 2026-08-10 — 기록 완료 후 바로 다음 제품을 스캔할 수 있게)
    navigation.replace(DetailRoutes.ProductScan, { timeSlot });
  };

  const handleBackToRecordHub = () => {
    // FaceCaptureScreen의 handleConfirm과 같은 이유 — 이미 끝난 저장 플로우(검색/스캔→성분
    // 확인)로 뒤로가기 할 이유가 없어서, 기록 허브까지 스택을 정리합니다.
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Tabs',
          state: { routes: [{ name: MainTabRoutes.RecordHub, params: { timeSlot } }] },
        },
      ],
    });
  };

  if (detailQuery.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + space[4] }]}>
        <LoadingState variant="skeleton" skeletonLines={6} />
      </View>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    const isNotFound =
      detailQuery.error instanceof ApiError && detailQuery.error.code === ErrorCode.PRODUCT_NOT_FOUND;
    return (
      <View style={[styles.container, { paddingTop: insets.top + space[4] }]}>
        <ErrorState
          variant={isNotFound ? 'notFound' : 'network'}
          onRetry={isNotFound ? undefined : () => detailQuery.refetch()}
        />
      </View>
    );
  }

  const product = detailQuery.data;

  // ── 저장 완료 상태 ─────────────────────────────────────────────
  if (saved) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + space[4] }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successArea}>
            <IconCheck size={40} color={color.statusGood} />
            <Text style={styles.successTitle}>기록을 저장했어요</Text>
            <Text style={styles.successSubtitle}>{product.name}</Text>
          </View>

          {saved.skinRecordSuggested ? (
            <SkinRecordSuggestionCard onPress={handleGoToSkinRecord} style={styles.suggestionCard} />
          ) : null}

          <Button
            label="다른 제품 스캔하기"
            variant="primary"
            onPress={handleScanAnother}
            style={styles.scanAnotherButton}
          />
          <Button
            label="기록 허브로 돌아가기"
            variant="ghost"
            onPress={handleBackToRecordHub}
            style={styles.backButton}
          />
        </ScrollView>
      </View>
    );
  }

  // ── 성분 확인 상태 (저장 전) ───────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[4] }]}
      >
        <View style={styles.header}>
          {/* 관리자님 요청(2026-08-10) — 제품 사진 자리. imageUrl은 백엔드에서 내려줄 예정이라
              지금은 항상 placeholder입니다(ProductCard와 같은 패턴). */}
          <View style={styles.imageBox}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <IconImagePlaceholder size={32} color={color.ink300} />
            )}
          </View>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.category}>{product.category}</Text>
        </View>

        <Text style={styles.ingredientCount}>총 {product.ingredientCount}개 성분</Text>

        {product.ingredientCount === 0 ? (
          <Text style={styles.insufficientNote}>
            성분 데이터가 부족해요. 기록은 그대로 저장할 수 있어요.
          </Text>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>주요 성분</Text>
              <View style={styles.keyIngredientList}>
                {product.keyIngredients.map((ingredient) => (
                  <View key={ingredient.ingredientId} style={styles.keyIngredientRow}>
                    <Tag variant={STATUS_TO_TAG_VARIANT[ingredient.status]} />
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
      </ScrollView>

      {saveError ? <InlineErrorBanner message={saveError} style={styles.inlineBanner} /> : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[5] }]}>
        <Button
          label="기록 완료"
          variant="primary"
          loading={saveMutation.isPending}
          onPress={() => handleSave(false)}
          style={styles.saveButton}
        />
      </View>

      <Popup
        visible={confirmDuplicate !== null}
        title="이미 기록한 시간대예요"
        description={confirmDuplicate ?? ''}
        primaryLabel="그래도 기록"
        onPrimaryPress={() => handleSave(true)}
        secondaryLabel="취소"
        onSecondaryPress={() => setConfirmDuplicate(null)}
        onRequestClose={() => setConfirmDuplicate(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[8],
    gap: space[5],
  },
  header: {
    gap: 2,
  },
  imageBox: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[2],
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
    gap: space[2],
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
  },
  saveButton: {
    width: '100%',
  },
  successArea: {
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[6],
  },
  successTitle: {
    ...typography.h1,
    color: color.ink900,
  },
  successSubtitle: {
    ...typography.body,
    color: color.ink600,
  },
  suggestionCard: {
    marginBottom: space[3],
  },
  scanAnotherButton: {
    width: '100%',
    marginBottom: space[3],
  },
  backButton: {
    width: '100%',
  },
});
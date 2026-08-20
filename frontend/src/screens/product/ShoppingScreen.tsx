// ShoppingScreen.tsx — S-21 쇼핑(구매 전 확인)
//
// F-CHECK-01(추천) + F-CHECK-02(스캔/검색 전환, 인라인). "여기서 조회한 제품은 사용 기록으로
// 저장하지 않는다"(BR3) — 검색·스캔 로직(PRODUCT-02/04)만 재사용하고, 저장 관련 훅
// (useSaveProductRecord 등)은 이 화면에서 전혀 안 씁니다. 제품을 고르면 바로 CHECK-02로
// 넘어갑니다(S-22가 진입 시 자동으로 POST /checks를 호출).
import React, { useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronRight, IconImagePlaceholder } from '@/components/icons';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { ProductCard } from '@/components/domain/ProductCard';
import {
  ProductCameraCapture,
  ProductCameraCaptureHandle,
} from '@/components/domain/ProductCameraCapture';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCheckHome } from '@/api/queries/check';
import { useProductSearch } from '@/api/queries/product';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';
import { PRODUCT_CATEGORY_LABELS } from '@/types/product';
import type { ScanMode } from '@/types/product';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

type FindMode = 'SCAN' | 'SEARCH';
const FIND_MODE_OPTIONS: { value: FindMode; label: string }[] = [
  { value: 'SEARCH', label: '검색' },
  { value: 'SCAN', label: '스캔' },
];

const SCAN_MODE_OPTIONS: { value: ScanMode; label: string }[] = [
  { value: 'BARCODE', label: '바코드' },
  { value: 'PRODUCT_IMAGE', label: '상품 사진' },
];

export function ShoppingScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const checkHomeQuery = useCheckHome();

  // 관리자님 요청(2026-08-10) — 검색을 먼저 보여줍니다. 스캔은 카메라 권한 요청이 바로
  // 뜨는데, 화면에 처음 들어왔을 때는 검색이 더 가벼운 진입입니다.
  const [findMode, setFindMode] = useState<FindMode>('SEARCH');
  const [scanMode, setScanMode] = useState<ScanMode>('BARCODE');
  const cameraRef = useRef<ProductCameraCaptureHandle>(null);
  const [scanError, setScanError] = useState<{ code?: string; message: string } | null>(null);
  const [capturing, setCapturing] = useState(false);

  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const searchQuery = useProductSearch(debouncedKeyword);

  // Phase 11-C(관리자 결정, 2026-08-13) — 추천/검색/스캔 3개 진입 경로 모두 SHOP-02
  // 제품 상세(ProductDetail)로 통일. reason은 추천 카드를 탭했을 때만 넘겨줍니다.
  const handleProductSelected = (productId: number, reason?: string) => {
    navigation.navigate(DetailRoutes.ProductDetail, { productId, reason });
  };

  const handleFindModeChange = (mode: FindMode) => {
    setFindMode(mode);
    setScanError(null);
    cameraRef.current?.resetScanned();
  };

  const isScanNotFoundLike =
    scanError?.code === ErrorCode.SCAN_PRODUCT_NOT_DETECTED ||
    scanError?.code === ErrorCode.PRODUCT_NOT_FOUND;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space[5] }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>구매 전 확인</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>나에게 맞는 제품</Text>
        {checkHomeQuery.isLoading ? (
          <LoadingState variant="skeleton" skeletonLines={2} />
        ) : checkHomeQuery.isError || !checkHomeQuery.data ? (
          <ErrorState variant="network" onRetry={() => checkHomeQuery.refetch()} />
        ) : checkHomeQuery.data.recommendations.length === 0 ? (
          <EmptyState
            icon="celebrate"
            title="아직 추천할 제품이 없어요"
            description="기록이 쌓이면 나에게 맞는 제품을 추천해드려요."
          />
        ) : (
          <View style={styles.list}>
            {checkHomeQuery.data.recommendations.map((rec) => (
              <Pressable
                key={rec.productId}
                accessibilityRole="button"
                accessibilityLabel={`${rec.name} 확인하기`}
                onPress={() => handleProductSelected(rec.productId, rec.reason)}
                style={({ pressed }) => [styles.recommendationCard, pressed && styles.recommendationCardPressed]}
              >
                <RecommendationThumbnail imageUrl={rec.imageUrl} />
                <View style={styles.recommendationInfo}>
                  <Text style={styles.recommendationBrand}>{rec.brand}</Text>
                  <Text style={styles.recommendationName}>{rec.name}</Text>
                  <Text style={styles.recommendationReason}>{rec.reason}</Text>
                </View>
                <IconChevronRight size={18} color={color.ink300} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>제품 확인하기</Text>
        <SegmentToggle options={FIND_MODE_OPTIONS} value={findMode} onChange={handleFindModeChange} />

        {findMode === 'SCAN' ? (
          <View style={styles.scanArea}>
            <SegmentToggle
              options={SCAN_MODE_OPTIONS}
              value={scanMode}
              onChange={(mode) => {
                setScanMode(mode);
                setScanError(null);
                cameraRef.current?.resetScanned();
              }}
              style={styles.scanModeToggle}
            />
            <ProductCameraCapture
              ref={cameraRef}
              scanMode={scanMode}
              onCaptureStart={() => setCapturing(true)}
              onSuccess={(result) => {
                setCapturing(false);
                handleProductSelected(result.productId);
              }}
              onError={(info) => {
                setCapturing(false);
                setScanError(info);
              }}
              style={styles.cameraBox}
            />
            {scanMode === 'PRODUCT_IMAGE' ? (
              <Button
                label="촬영"
                variant="primary"
                loading={capturing}
                onPress={() => cameraRef.current?.capture()}
              />
            ) : (
              <Text style={styles.scanHint}>바코드를 뷰파인더 안에 맞춰주세요</Text>
            )}
            {scanError ? (
              <View style={styles.scanErrorBox}>
                <InlineErrorBanner message={scanError.message} />
                <View style={styles.scanErrorActions}>
                  <Button
                    label="다시 스캔"
                    variant="secondary"
                    onPress={() => {
                      setScanError(null);
                      cameraRef.current?.resetScanned();
                    }}
                    style={styles.scanErrorButton}
                  />
                  {isScanNotFoundLike ? (
                    <Button
                      label="검색으로 전환"
                      variant="primary"
                      onPress={() => handleFindModeChange('SEARCH')}
                      style={styles.scanErrorButton}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <SearchArea
          keyword={keyword}
          onChangeKeyword={setKeyword}
          query={searchQuery}
          onSelect={handleProductSelected}
        />
        )}
      </View>
    </ScrollView>
  );
}

function RecommendationThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.recommendationThumbnail}>
      {imageUrl && !failed ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.recommendationThumbnailImage}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <IconImagePlaceholder size={20} color={color.ink300} />
      )}
    </View>
  );
}

function SearchArea({
  keyword,
  onChangeKeyword,
  query,
  onSelect,
}: {
  keyword: string;
  onChangeKeyword: (v: string) => void;
  query: ReturnType<typeof useProductSearch>;
  onSelect: (productId: number) => void;
}) {
  const trimmed = keyword.trim();
  return (
    <View style={styles.searchArea}>
      <Input
        value={keyword}
        onChangeText={onChangeKeyword}
        placeholder="제품명을 검색해보세요"
        maxLength={20}
        returnKeyType="search"
        accessibilityLabel="제품 검색"
      />
      {trimmed.length === 0 ? null : query.isLoading ? (
        <LoadingState variant="skeleton" skeletonLines={3} />
      ) : query.isError || !query.data ? (
        <ErrorState variant="network" onRetry={() => query.refetch()} />
      ) : query.data.totalCount === 0 ? (
        <EmptyState icon="search" title="검색 결과가 없어요" description="다른 검색어로 시도해 보세요." />
      ) : (
        <View style={styles.list}>
          {query.data.products.map((product) => (
            <ProductCard
              key={product.productId}
              brand={product.brand}
              name={product.name}
              category={PRODUCT_CATEGORY_LABELS[product.category] ?? product.category}
              imageUrl={product.imageUrl}
              onPress={() => onSelect(product.productId)}
            />
          ))}
        </View>
      )}
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
    gap: space[6],
  },
  title: {
    ...typography.h1,
    color: color.ink900,
  },
  section: {
    gap: space[3],
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  list: {
    gap: space[2],
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: color.brand50,
    borderRadius: 12,
    padding: space[3],
  },
  recommendationCardPressed: {
    opacity: 0.7,
  },
  recommendationThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recommendationThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  recommendationInfo: {
    flex: 1,
    gap: 2,
  },
  recommendationBrand: {
    ...typography.caption,
    color: color.ink600,
  },
  recommendationName: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  recommendationReason: {
    ...typography.caption,
    color: color.brand700,
  },
  scanArea: {
    gap: space[3],
  },
  scanModeToggle: {
    alignSelf: 'stretch',
  },
  cameraBox: {
    height: 240,
  },
  scanHint: {
    ...typography.caption,
    color: color.ink600,
    textAlign: 'center',
  },
  scanErrorBox: {
    gap: space[2],
  },
  scanErrorActions: {
    flexDirection: 'row',
    gap: space[2],
  },
  scanErrorButton: {
    flex: 1,
  },
  searchArea: {
    gap: space[3],
  },
});
// ShoppingScreen.tsx — S-21 쇼핑(구매 전 확인)
//
// F-CHECK-01(추천) + F-CHECK-02(스캔/검색 전환, 인라인). "여기서 조회한 제품은 사용 기록으로
// 저장하지 않는다"(BR3) — 검색·스캔 로직(PRODUCT-02/04)만 재사용하고, 저장 관련 훅
// (useSaveProductRecord 등)은 이 화면에서 전혀 안 씁니다. 제품을 고르면 바로 CHECK-02로
// 넘어갑니다(S-22가 진입 시 자동으로 POST /checks를 호출).
//
// 2026-08-17 — Figma "최종"(dNq0tcX6O5Mg3gDzvctryO, node 193:5724) 실측 반영, SHOP-01
// 3분류(ADR 0018) 구현. 기존 "나에게 맞는 제품" 플랫 리스트를 CheckRecommendation.category
// 기준 3개 섹션으로 분리:
//   - TODAY_NEEDED(오늘 내 피부에 필요해요): 큰 카드, todayContext.troubleScore/rednessScore
//     서브텍스트
//   - HUMIDITY_CARE(보습이 필요한 날): 가로 배열 미니 카드, todayContext.humidity/humidityGrade
//     서브텍스트
//   - MATCHED_INGREDIENT(내게 잘 맞는 성분이 들어간 제품): 성분 필터 칩 + 필터된 리스트
// Figma는 각 추천 카드에 태그 칩 2개(예: "트러블 진정 성분", "향료 미포함")를 그리지만
// CHECK-01 응답엔 이 데이터가 없어서(reason 문자열 하나뿐) 생략했습니다 — 백엔드 필드 추가
// 요청 문서(docs/backend-request-shop01-tag-chips.md)를 작성해뒀습니다. 대신 reason 문장을
// 그대로 보여줍니다.
//
// 성분 필터 칩(MATCHED_INGREDIENT 섹션)도 CHECK-01 응답엔 없는 기능이라, USER-02
// (useIngredientProfile('GOOD'))에서 GOOD 성분 목록을 별도로 불러와 클라이언트에서
// reason 문자열에 성분명이 포함되는지로 필터링합니다(정확한 매칭은 아니고 근사치 —
// reason이 "{성분명1}·{성분명2}이 잘 맞는 성분이에요" 형태로 조립되므로 substring
// 매칭이 대체로 맞습니다).
//
// 상단 진입 방식(스캔/검색)은 Figma가 버튼 2개 나란히 배치로 그렸지만, 관리자 결정으로
// 기존 SegmentToggle 인라인 전환 그대로 유지합니다(2026-08-17).
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconImagePlaceholder, AppIcon } from '@/components/icons';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { Chip } from '@/components/base/Chip';
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
import { useIngredientProfile } from '@/api/queries/user';
import { useProductSearch } from '@/api/queries/product';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';
import { PRODUCT_CATEGORY_LABELS } from '@/types/product';
import type { ScanMode } from '@/types/product';
import type { CheckRecommendation } from '@/types/check';
import { weightFamily, adjustFontSize } from '@/theme/typography';

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

const HUMIDITY_GRADE_LABEL: Record<string, string> = {
  DRY: '실내 건조 주의',
  NORMAL: '쾌적한 습도예요',
  HUMID: '습도가 높아요',
};

export function ShoppingScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const checkHomeQuery = useCheckHome();
  // MATCHED_INGREDIENT 섹션 필터 칩용 — GOOD 성분만(성분 프로파일 전체 화면과 달리
  // CAUTION/INSUFFICIENT는 추천 근거가 될 수 없음, ADR 0016).
  const goodIngredientsQuery = useIngredientProfile('GOOD');
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

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

  const recommendations = useMemo(
    () => checkHomeQuery.data?.recommendations ?? [],
    [checkHomeQuery.data]
  );
  const todayNeeded = useMemo(
    () => recommendations.filter((r) => r.category === 'TODAY_NEEDED'),
    [recommendations]
  );
  const humidityCare = useMemo(
    () => recommendations.filter((r) => r.category === 'HUMIDITY_CARE'),
    [recommendations]
  );
  const matchedIngredient = useMemo(
    () => recommendations.filter((r) => r.category === 'MATCHED_INGREDIENT'),
    [recommendations]
  );

  const goodIngredients = goodIngredientsQuery.data?.ingredients ?? [];
  // 첫 로드 시 첫 번째 GOOD 성분을 기본 선택(Figma 실측 — 첫 칩이 검정 배경으로 선택돼 있음).
  const effectiveSelectedIngredient = selectedIngredient ?? goodIngredients[0]?.name ?? null;
  const filteredByIngredient = effectiveSelectedIngredient
    ? matchedIngredient.filter((r) => r.reason.includes(effectiveSelectedIngredient))
    : matchedIngredient;

  const todayContext = checkHomeQuery.data?.todayContext;
  const todaySubtitle =
    todayContext && (todayContext.troubleScore !== null || todayContext.rednessScore !== null)
      ? [
          todayContext.troubleScore !== null ? `트러블 ${todayContext.troubleScore}` : null,
          todayContext.rednessScore !== null ? `홍조 ${todayContext.rednessScore}` : null,
        ]
          .filter(Boolean)
          .join(' · ') + ' 기준 추천'
      : null;
  const humiditySubtitle =
    todayContext && todayContext.humidity !== null
      ? `오늘 습도 ${todayContext.humidity}%${
          todayContext.humidityGrade ? ` · ${HUMIDITY_GRADE_LABEL[todayContext.humidityGrade]}` : ''
        }`
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space[5] }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>쇼핑</Text>
      <Text style={styles.subtitle}>내 피부에 맞는 제품을 찾아드려요</Text>

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

      {checkHomeQuery.isLoading ? (
        <LoadingState variant="skeleton" skeletonLines={4} style={styles.recSkeleton} />
      ) : checkHomeQuery.isError || !checkHomeQuery.data ? (
        <ErrorState variant="network" onRetry={() => checkHomeQuery.refetch()} />
      ) : recommendations.length === 0 ? (
        <EmptyState
          icon="celebrate"
          title="아직 추천할 제품이 없어요"
          description="기록이 쌓이면 나에게 맞는 제품을 추천해드려요."
        />
      ) : (
        <>
          {todayNeeded.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>오늘 내 피부에 필요해요</Text>
              {todaySubtitle ? <Text style={styles.sectionSubtitle}>{todaySubtitle}</Text> : null}
              <View style={styles.list}>
                {todayNeeded.map((rec) => (
                  <RecommendationLargeCard
                    key={rec.productId}
                    rec={rec}
                    onPress={() => handleProductSelected(rec.productId, rec.reason)}
                  />
                ))}
              </View>
            </View>
          )}

          {humidityCare.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>보습이 필요한 날</Text>
              {humiditySubtitle ? <Text style={styles.sectionSubtitle}>{humiditySubtitle}</Text> : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.miniCardRow}>
                {humidityCare.map((rec) => (
                  <RecommendationMiniCard
                    key={rec.productId}
                    rec={rec}
                    onPress={() => handleProductSelected(rec.productId, rec.reason)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {matchedIngredient.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>내게 잘 맞는 성분이 들어간 제품</Text>
              {goodIngredients.length > 0 && (
                <View style={styles.ingredientChipRow}>
                  {goodIngredients.map((ing) => (
                    <Chip
                      key={ing.ingredientId}
                      label={ing.name}
                      selected={ing.name === effectiveSelectedIngredient}
                      onPress={() => setSelectedIngredient(ing.name)}
                    />
                  ))}
                </View>
              )}
              {filteredByIngredient.length === 0 ? (
                <Text style={styles.emptyIngredientText}>
                  {effectiveSelectedIngredient ?? ''} 성분이 들어간 추천 제품이 아직 없어요.
                </Text>
              ) : (
                <View style={styles.list}>
                  {filteredByIngredient.map((rec) => (
                    <RecommendationRow
                      key={rec.productId}
                      rec={rec}
                      onPress={() => handleProductSelected(rec.productId, rec.reason)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

/** "오늘 내 피부에 필요해요" 큰 카드 (Figma 193:5752 실측). 태그 칩은 CHECK-01에 없는
 * 데이터라 생략 — reason 문장만 표시. */
function RecommendationLargeCard({ rec, onPress }: { rec: CheckRecommendation; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rec.name} 확인하기`}
      onPress={onPress}
      style={({ pressed }) => [styles.largeCard, pressed && styles.cardPressed]}
    >
      <View style={styles.largeCardThumbnail}>
        <IconImagePlaceholder size={22} color={color.ink300} />
      </View>
      <View style={styles.largeCardInfo}>
        <Text style={styles.recBrand}>{rec.brand}</Text>
        <Text style={styles.recName}>{rec.name}</Text>
        <View style={styles.statusRow}>
          <AppIcon name="faceGood" size={16} color={color.statusGood} />
          <Text style={styles.statusLabel}>잘 맞음</Text>
        </View>
        <Text style={styles.recReason}>{rec.reason}</Text>
        <Text style={styles.recLink}>성분 확인하기 ›</Text>
      </View>
    </Pressable>
  );
}

/** "보습이 필요한 날" 가로 미니 카드 (Figma 193:5817 실측). */
function RecommendationMiniCard({ rec, onPress }: { rec: CheckRecommendation; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rec.name} 확인하기`}
      onPress={onPress}
      style={({ pressed }) => [styles.miniCard, pressed && styles.cardPressed]}
    >
      <View style={styles.miniCardThumbnail}>
        <IconImagePlaceholder size={18} color={color.ink300} />
      </View>
      <Text style={styles.miniCardBrand}>{rec.brand}</Text>
      <Text style={styles.miniCardName} numberOfLines={1}>
        {rec.name}
      </Text>
      <View style={styles.statusRow}>
        <AppIcon name="faceGood" size={13} color={color.statusGood} />
        <Text style={styles.miniStatusLabel}>잘 맞음</Text>
      </View>
    </Pressable>
  );
}

/** "내게 잘 맞는 성분이 들어간 제품" 리스트 행 (Figma 193:5878 실측). */
function RecommendationRow({ rec, onPress }: { rec: CheckRecommendation; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rec.name} 확인하기`}
      onPress={onPress}
      style={({ pressed }) => [styles.recRow, pressed && styles.cardPressed]}
    >
      <View style={styles.recRowThumbnail}>
        <IconImagePlaceholder size={18} color={color.ink300} />
      </View>
      <View style={styles.recRowInfo}>
        <Text style={styles.recBrand}>{rec.brand}</Text>
        <Text style={styles.recName}>{rec.name}</Text>
      </View>
      <View style={styles.statusRow}>
        <AppIcon name="faceGood" size={16} color={color.statusGood} />
        <Text style={styles.statusLabel}>잘 맞음</Text>
      </View>
    </Pressable>
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
  subtitle: {
    ...typography.caption,
    color: color.textSub,
    marginTop: -space[4],
  },
  section: {
    gap: space[3],
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  sectionSubtitle: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textSub,
    marginTop: -space[2],
  },
  list: {
    gap: space[2],
  },
  recSkeleton: {
    marginTop: space[2],
  },
  cardPressed: {
    opacity: 0.7,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    ...typography.caption,
    ...weightFamily('semibold'),
    color: color.ink900,
  },
  recBrand: {
    ...typography.caption,
    color: color.ink600,
  },
  recName: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  recReason: {
    ...typography.caption,
    color: color.brand700,
  },
  recLink: {
    fontSize: adjustFontSize(11),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  // 오늘 내 피부에 필요해요 — 큰 카드
  largeCard: {
    flexDirection: 'row',
    gap: space[3],
    borderWidth: 1,
    borderColor: color.borderDividerFaint,
    borderRadius: 14,
    padding: space[4],
  },
  largeCardThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeCardInfo: {
    flex: 1,
    gap: 3,
  },
  // 보습이 필요한 날 — 가로 미니 카드
  miniCardRow: {
    flexDirection: 'row',
  },
  miniCard: {
    width: 112,
    marginRight: space[2],
    borderWidth: 1,
    borderColor: color.borderDividerFaint,
    borderRadius: 12,
    padding: space[2],
    gap: 4,
  },
  miniCardThumbnail: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCardBrand: {
    fontSize: adjustFontSize(10),
    color: color.ink600,
  },
  miniCardName: {
    fontSize: adjustFontSize(12),
    ...weightFamily('semibold'),
    color: color.ink900,
  },
  miniStatusLabel: {
    fontSize: adjustFontSize(10),
    color: color.ink600,
  },
  // 내게 잘 맞는 성분이 들어간 제품 — 필터 칩 + 리스트 행
  ingredientChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  emptyIngredientText: {
    ...typography.caption,
    color: color.textSub,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.borderDividerFaint,
  },
  recRowThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recRowInfo: {
    flex: 1,
    gap: 2,
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
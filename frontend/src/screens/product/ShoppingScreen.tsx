// ShoppingScreen.tsx — S-21 쇼핑(구매 전 확인)
//
// F-CHECK-01(추천) + F-CHECK-02(스캔/검색 전환, 인라인). "여기서 조회한 제품은 사용 기록으로
// 저장하지 않는다"(BR3) — 검색·스캔 로직(PRODUCT-02/04)만 재사용하고, 저장 관련 훅
// (useSaveProductRecord 등)은 이 화면에서 전혀 안 씁니다. 제품을 고르면 바로 CHECK-02로
// 넘어갑니다(S-22가 진입 시 자동으로 POST /checks를 호출).
//
// ─────────────────────────────────────────────────────────────────────────────
// 2026-08-17(세션 12) — Hifi-GUI ShopTab(P8CmHDZp7z0dKiHByEzuLx, node 59:6897) 실측 +
// 관리자 추가 지시 반영. 세션 11의 와이어프레임(193:5724) 기준 구조를 전부 다시 짰습니다.
//
// 관리자 결정:
//   (a) Figma는 섹션 2개지만 ADR 0018 3분류를 그대로 유지합니다.
//   (b) Figma 칩 문구 "성분 검색" → "제품 검색"(PRODUCT-02). 성분 기반 탐색은 3번째 섹션이
//       대신합니다.
//   (c) [2026-08-17 세션 13에 폐기] 잘 맞음/지켜보는 중 배지 → **추천 근거 태그 칩으로
//       교체**했습니다. 백엔드가 `matchGrade` 대신 `tags`를 내려줬고(ADR 0027), 배지의
//       'SAFE' 폴백이 결국 모든 카드에 근거 없는 "잘 맞음"을 띄우고 있었습니다.
//       tags는 서버가 규칙으로 도출한 값이라 폴백이 필요 없습니다. 1번 칩은 category별로
//       색이 갈리고(shopTagTint), 2번 "주의 성분 미포함"은 초록 고정입니다.
//   (d) 레이아웃: 섹션 제목을 카드 밖 큰 글씨로 빼고, 항목 하나하나를 개별 흰 카드로
//       분리합니다(관리자 제공 참고 이미지 구조).
//   (e) 카드 텍스트 순서: 제품명(볼드) 위 / 브랜드(작은 회색) 아래.
//   (f) "내게 잘 맞는 성분이 들어간 제품"만 가로 스크롤, 나머지 두 섹션은 세로 카드 스택.
//   (g) 우측 상단 장바구니 아이콘 + 담긴 개수 배지. 담기/빼기 버튼은 이 화면에 두지 않고
//       제품 상세(SHOP-02)에만 둡니다 — 쇼핑 화면을 깔끔하게 유지하려는 결정.
//   (h) 참고 이미지의 번호 배지(1·2)는 넣지 않습니다(추천은 순위 목록이 아님).
//
// Figma/이미지 대비 의도적 차이:
//   · Figma는 칩 2개가 둘 다 비선택이고 아래 패널이 없습니다. 그 상태를 초기값으로 삼아
//     findMode 기본값을 null로 뒀습니다(칩을 누르면 열리고, 같은 칩을 다시 누르면 닫힘).
//     예전처럼 진입 즉시 검색창을 열려면 useState<FindMode | null>('SEARCH')로 바꾸면 됩니다.
//   · (e)에 따라 카드가 제품명·브랜드 2줄이 되면서 `reason` 문장이 카드에서 빠졌습니다.
//     추천 근거는 배지와 섹션 부제로만 읽히고, 문장 전체는 탭해서 들어간 제품 상세에서
//     보입니다(navigate 시 reason을 계속 넘깁니다). 카드에 3번째 줄로 되살리고 싶으면
//     말씀해주세요.
//   · "더보기"는 Figma엔 1번 카드에만 있고 목적지가 없어서, 죽은 버튼 대신 "접힌 목록
//     펼치기"로 구현했습니다. 새 API 없이 동작합니다.
//   · 브랜드 줄이 Figma는 "브랜드 · 용량"인데 CHECK-01에 용량이 없어 브랜드만 표시합니다.
//   · 장바구니 아이콘은 42종 아이콘 세트에 없어서 Ionicons 'cart-outline'으로 임시
//     폴백했습니다(미전달 아이콘은 Ionicons 유지 — Checkpoint 9-B 원칙).
//     디자인 요청: docs/design-request-cart.md
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useCartCount } from '@/store/cartStore';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, radius, reportCardShadow, shopTagTint, space } from '@/theme/tokens';
import { PRODUCT_CATEGORY_LABELS } from '@/types/product';
import { MetricGradeChip } from '@/components/domain/MetricGradeChip';
import type { ScanMode } from '@/types/product';
import type { CheckRecommendation, RecommendationCategory } from '@/types/check';
import type { HumidityGrade } from '@/types/environment';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

type FindMode = 'SCAN' | 'SEARCH';

const SCAN_MODE_OPTIONS: { value: ScanMode; label: string }[] = [
  { value: 'BARCODE', label: '바코드' },
  { value: 'PRODUCT_IMAGE', label: '상품 사진' },
];

// 이 화면 전용 문장형 라벨입니다 — lib/weather.ts의 getHumidityGradeLabel은
// "건조/보통/습함" 단어형이라 용도가 다릅니다(그쪽은 환경 카드의 값 표기용).
// 2026-08-18 — Record<string, string>이던 걸 HumidityGrade로 좁혔습니다.
// 키가 백엔드 값과 어긋나면 tsc가 잡도록 하기 위해서입니다(홈 쪽이 정확히 그렇게
// 어긋난 채로 오래 방치됐던 이력이 있습니다).
const HUMIDITY_GRADE_LABEL: Record<HumidityGrade, string> = {
  DRY: '실내 건조 주의',
  NORMAL: '쾌적한 습도예요',
  HUMID: '습도가 높아요',
};

// 1번(category) 칩의 색 — 섹션 정체성을 따라갑니다(관리자 결정, 2026-08-17).
// 2번 칩("주의 성분 미포함")은 분류와 무관한 안전 근거라 shopTagTint.noCaution 고정입니다.
//
// 색을 가르는 기준이 "추천 등급"이 아니라 "정보 종류"라는 점이 중요합니다 — 1번은 이
// 제품이 왜 이 섹션에 있는지 알려주는 분류 라벨이고, 2번은 프로파일 대조 결과입니다.
// 등급 차이로 읽히면 서버가 내려주지 않는 정보를 암시하게 됩니다.
const CATEGORY_TAG_TINT: Record<RecommendationCategory, { bg: string; fg: string }> = {
  TODAY_NEEDED: shopTagTint.todayNeeded,
  HUMIDITY_CARE: shopTagTint.humidityCare,
  MATCHED_INGREDIENT: shopTagTint.matchedIngredient,
};

/** 접힌 상태에서 먼저 보여줄 개수 — 이보다 많을 때만 "더보기"가 나옵니다. */
const COLLAPSED_COUNT = 2;

export function ShoppingScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const cartCount = useCartCount();

  const checkHomeQuery = useCheckHome();
  // MATCHED_INGREDIENT 섹션 필터 칩용 — GOOD 성분만(성분 프로파일 전체 화면과 달리
  // CAUTION/INSUFFICIENT는 추천 근거가 될 수 없음, ADR 0016).
  const goodIngredientsQuery = useIngredientProfile('GOOD');
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  // null = 아무 패널도 열려 있지 않음(Figma 기본 상태). 파일 상단 주석 참고.
  const [findMode, setFindMode] = useState<FindMode | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('BARCODE');
  const cameraRef = useRef<ProductCameraCaptureHandle>(null);
  const [scanError, setScanError] = useState<{ code?: string; message: string } | null>(null);
  // 2026-08-18 — 촬영 버튼을 안내 문구로 바꾸면서 이 값을 읽는 곳이 없어졌습니다.
  // 상태 자체는 남겨둡니다(setter만 사용) — 촬영 경로가 되살아나면 버튼 loading에
  // 그대로 다시 물리면 되고, 지우면 onCaptureStart/onSuccess/onError 3곳을 함께
  // 고쳐야 해서 되돌리기가 번거로워집니다.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [capturing, setCapturing] = useState(false);

  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const searchQuery = useProductSearch(debouncedKeyword);

  // 섹션별 "더보기" 펼침 상태
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Phase 11-C(관리자 결정, 2026-08-13) — 추천/검색/스캔 3개 진입 경로 모두 SHOP-02
  // 제품 상세(ProductDetail)로 통일. reason은 추천 카드를 탭했을 때만 넘겨줍니다.
  const handleProductSelected = (productId: number, reason?: string) => {
    navigation.navigate(DetailRoutes.ProductDetail, { productId, reason });
  };

  /** 같은 칩을 다시 누르면 패널을 닫습니다. */
  const handleFindModePress = (mode: FindMode) => {
    setFindMode((prev) => (prev === mode ? null : mode));
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
  // 첫 로드 시 첫 번째 GOOD 성분을 기본 선택(Figma 실측 — 첫 칩이 선택돼 있음).
  const effectiveSelectedIngredient = selectedIngredient ?? goodIngredients[0]?.name ?? null;
  const filteredByIngredient = effectiveSelectedIngredient
    ? matchedIngredient.filter((r) => r.reason.includes(effectiveSelectedIngredient))
    : matchedIngredient;

  const todayContext = checkHomeQuery.data?.todayContext;
  // 2026-08-18 — "트러블 38 · 홍조 62 기준 추천"처럼 숫자만 나열하면 그 값이 좋은
  // 상태인지 나쁜 상태인지 알 수 없습니다. 방향이 "높을수록 좋음"으로 확정됐어도
  // 사용자는 그 규칙을 모르고, 바로 아래 습도 부제("실내 건조 주의")는 이미 해석을
  // 달아주고 있어 두 줄의 정보량이 어긋나 있었습니다.
  //
  // 지표명·점수를 통째로 색 칩에 넣고 **등급 단어는 쓰지 않습니다**(관리자 결정) —
  // 부제는 작은 회색 글씨라 "보통"·"주의" 글자를 덧붙이면 줄만 길어지고, 색만으로
  // 충분히 읽힙니다. 경계·색은 lib/metricGrade.ts가 단독으로 갖습니다
  // (S-18 등급 배지와 동일 기준).
  const todayMetricChips =
    todayContext === undefined
      ? []
      : ([
          todayContext.troubleScore !== null
            ? { key: 'trouble', label: '트러블', score: todayContext.troubleScore }
            : null,
          todayContext.rednessScore !== null
            ? { key: 'redness', label: '홍조', score: todayContext.rednessScore }
            : null,
        ].filter(Boolean) as { key: string; label: string; score: number }[]);

  const todaySubtitle =
    todayMetricChips.length > 0 ? (
      // 칩과 꼬리말이 같은 줄에 섞이므로 flexWrap을 켭니다 — 소형 화면에서 두 지표가
      // 다 있으면 한 줄을 넘깁니다(줄이 바뀌어도 칩이 잘리지 않게).
      // 칩끼리는 배경색으로 이미 나뉘어 보여서 가운뎃점(·) 구분자를 넣지 않았습니다.
      <View style={styles.todaySubtitleRow}>
        {todayMetricChips.map((item) => (
          <MetricGradeChip key={item.key} label={item.label} score={item.score} />
        ))}
        <Text style={styles.subtitleInline}>기준 추천</Text>
      </View>
    ) : null;
  const humiditySubtitle =
    todayContext && todayContext.humidity !== null
      ? `오늘 습도 ${todayContext.humidity}%${
          todayContext.humidityGrade ? ` · ${HUMIDITY_GRADE_LABEL[todayContext.humidityGrade]}` : ''
        }`
      : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* 상단 헤더 — 흰 블록. Figma 59:6899 실측(pt 48 / px 20 / pb 16). */}
      <View style={[styles.header, { paddingTop: insets.top + space[3] }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.pageTitle}>쇼핑</Text>
            <Text style={styles.pageSubtitle}>내 피부에 맞는 제품을 찾아보세요</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              cartCount > 0 ? `장바구니, 담은 제품 ${cartCount}개` : '장바구니, 비어 있음'
            }
            hitSlop={8}
            onPress={() => navigation.navigate(DetailRoutes.Cart)}
            style={styles.cartButton}
          >
            {/* 42종 세트에 장바구니 아이콘이 없어 Ionicons 폴백입니다(파일 상단 주석). */}
            <AppIcon name="cart-outline" size={24} color={color.textInk} />
            {cartCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.modeChipRow}>
          <ModeChip
            label="바코드 스캔"
            selected={findMode === 'SCAN'}
            onPress={() => handleFindModePress('SCAN')}
          />
          <ModeChip
            label="제품 검색"
            selected={findMode === 'SEARCH'}
            onPress={() => handleFindModePress('SEARCH')}
          />
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + space[8] }]}>
        {/* 스캔 / 검색 패널 — 칩을 눌렀을 때만 흰 카드로 열립니다. */}
        {findMode === 'SCAN' && (
          <View style={styles.panelCard}>
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
              // 2026-08-18 — 상품 사진 인식은 백엔드에 비전 로직이 없어 동작하지 않습니다.
              // 촬영 버튼을 그대로 두면 눌러야 실패를 알게 되므로, 준비 중임을 먼저 알리고
              // 검색으로 유도합니다(관리자 결정 B안). 백엔드가 구현하면 아래 Button을
              // 원래의 촬영(capture) 버튼으로 되돌리면 됩니다.
              <Text style={styles.scanHint}>
                상품 사진으로 찾는 기능은 아직 준비 중이에요. 바코드를 스캔하거나 제품명으로
                검색해 주세요.
              </Text>
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
                      onPress={() => handleFindModePress('SEARCH')}
                      style={styles.scanErrorButton}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        )}

        {findMode === 'SEARCH' && (
          <View style={styles.panelCard}>
            <SearchArea
              keyword={keyword}
              onChangeKeyword={setKeyword}
              query={searchQuery}
              onSelect={handleProductSelected}
            />
          </View>
        )}

        {checkHomeQuery.isLoading ? (
          <View style={styles.panelCard}>
            <LoadingState variant="skeleton" skeletonLines={4} />
          </View>
        ) : checkHomeQuery.isError || !checkHomeQuery.data ? (
          <View style={styles.panelCard}>
            <ErrorState variant="network" layout="inline" onRetry={() => checkHomeQuery.refetch()} />
          </View>
        ) : recommendations.length === 0 ? (
          <View style={styles.panelCard}>
            <EmptyState
              icon="celebrate"
              title="아직 추천할 제품이 없어요"
              description="기록이 쌓이면 나에게 맞는 제품을 추천해드려요."
            />
          </View>
        ) : (
          <>
            {todayNeeded.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="오늘 내 피부에 필요해요"
                  subtitle={todaySubtitle}
                  expanded={!!expandedSections.today}
                  canExpand={todayNeeded.length > COLLAPSED_COUNT}
                  onToggle={() => toggleSection('today')}
                />
                <View style={styles.cardStack}>
                  {(expandedSections.today
                    ? todayNeeded
                    : todayNeeded.slice(0, COLLAPSED_COUNT)
                  ).map((rec) => (
                    <RecommendationCard
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
                <SectionHeader
                  title="보습이 필요한 날"
                  subtitle={humiditySubtitle}
                  expanded={!!expandedSections.humidity}
                  canExpand={humidityCare.length > COLLAPSED_COUNT}
                  onToggle={() => toggleSection('humidity')}
                />
                <View style={styles.cardStack}>
                  {(expandedSections.humidity
                    ? humidityCare
                    : humidityCare.slice(0, COLLAPSED_COUNT)
                  ).map((rec) => (
                    <RecommendationCard
                      key={rec.productId}
                      rec={rec}
                      onPress={() => handleProductSelected(rec.productId, rec.reason)}
                    />
                  ))}
                </View>
              </View>
            )}

            {matchedIngredient.length > 0 && (
              <View style={styles.section}>
                {/* 이 섹션만 가로 스크롤이라 "더보기"가 필요 없습니다(관리자 결정 (f)). */}
                <SectionHeader
                  title="내게 잘 맞는 성분이 들어간 제품"
                  subtitle={null}
                  expanded={false}
                  canExpand={false}
                  onToggle={() => undefined}
                />
                {goodIngredients.length > 0 && (
                  // 성분 칩도 개수가 많으면 줄바꿈으로 화면을 밀어내서 가로 스크롤로 둡니다.
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.ingredientChipRow}
                  >
                    {goodIngredients.map((ing) => (
                      <Chip
                        key={ing.ingredientId}
                        label={ing.name}
                        variant="solid"
                        selected={ing.name === effectiveSelectedIngredient}
                        onPress={() => setSelectedIngredient(ing.name)}
                      />
                    ))}
                  </ScrollView>
                )}
                {filteredByIngredient.length === 0 ? (
                  <Text style={styles.emptyIngredientText}>
                    {effectiveSelectedIngredient ?? ''} 성분이 들어간 추천 제품이 아직 없어요.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalRow}
                  >
                    {filteredByIngredient.map((rec) => (
                      <RecommendationCard
                        key={rec.productId}
                        rec={rec}
                        horizontal
                        onPress={() => handleProductSelected(rec.productId, rec.reason)}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// 하위 컴포넌트
// ---------------------------------------------------------------------------

/** 상단 진입 칩. Figma Chip/Default(89:2) 실측 — 라벤더 배경 pill.
 * 선택 상태는 Figma에 없어서(둘 다 비선택 목업) 앱 공통 규칙대로 brand500 채움 +
 * 흰 글씨로 뒀습니다. */
function ModeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.modeChip, selected && styles.modeChipSelected]}
    >
      <Text style={[styles.modeChipLabel, selected && styles.modeChipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** 섹션 헤더 — 카드 밖(연보라 배경 위)에 놓이는 큰 제목 + 부제 + 우측 "더보기". */
function SectionHeader({
  title,
  subtitle,
  expanded,
  canExpand,
  onToggle,
}: {
  title: string;
  /**
   * 문자열이면 그대로 부제 스타일로 그리고, 노드면 호출부가 만든 것을 그대로 씁니다.
   * "오늘 내 피부에 필요해요"만 등급 칩이 섞인 노드를 넘깁니다 — 나머지 섹션은
   * 여전히 단순 문자열이라 호출부마다 View를 조립하게 만들 이유가 없습니다.
   */
  subtitle: React.ReactNode;
  expanded: boolean;
  canExpand: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {typeof subtitle === 'string' ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : (
          subtitle
        )}
      </View>
      {canExpand ? (
        <Pressable accessibilityRole="button" onPress={onToggle} hitSlop={8}>
          <Text style={styles.moreLink}>{expanded ? '접기' : '더보기'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * 추천 근거 태그 칩 (CHECK-01 `tags`, ADR 0027). 서버가 규칙으로 도출한 값을 그대로
 * 그립니다 — 문구를 파싱하거나 없는 값을 폴백으로 만들지 않습니다.
 *
 * 길이는 1 또는 2입니다. 2번 칩("주의 성분 미포함")은 CAUTION 성분이 없을 때만 오므로,
 * 칩이 1개인 카드는 "주의 성분이 있다"가 아니라 "그 근거를 붙일 수 없다"는 뜻입니다 —
 * 없는 칩 자리에 대체 문구를 채우지 않습니다.
 *
 * 세로 카드는 오른쪽에 세로로, 가로 카드는 아래에 가로로 쌓습니다.
 */
function TagChips({
  tags,
  category,
  horizontal = false,
}: {
  tags: string[];
  category: RecommendationCategory;
  horizontal?: boolean;
}) {
  if (tags.length === 0) {
    return null;
  }
  return (
    <View style={horizontal ? styles.tagRowHorizontal : styles.tagRowVertical}>
      {tags.map((tag, index) => {
        // ⚠️ 칩 문구를 보고 색을 정하지 않습니다 — 그건 ADR 0027이 걷어낸 문자열 파싱을
        // 다시 들이는 겁니다. CHECK-01 BR8이 "1번은 항상 category 칩, 2번은 조건부 안전
        // 칩"을 보장하므로 **인덱스**로 가릅니다. 백엔드가 문구를 바꿔도 안 깨집니다.
        const tint = index === 0 ? CATEGORY_TAG_TINT[category] : shopTagTint.noCaution;
        return (
          <View key={tag} style={[styles.tagChip, { backgroundColor: tint.bg }]}>
            <Text style={[styles.tagChipLabel, { color: tint.fg }]} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * 추천 제품 카드 하나. 세로 스택(기본)과 가로 스크롤(horizontal) 두 배치를 겸합니다.
 * 텍스트는 관리자 지시대로 제품명(볼드) 위 / 브랜드(작은 회색) 아래입니다.
 */
function RecommendationCard({
  rec,
  horizontal = false,
  onPress,
}: {
  rec: CheckRecommendation;
  horizontal?: boolean;
  onPress: () => void;
}) {
  if (horizontal) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rec.name} 확인하기`}
        onPress={onPress}
        style={({ pressed }) => [styles.hCard, pressed && styles.pressed]}
      >
        <View style={styles.hCardThumbnail}>
          <IconImagePlaceholder size={24} color={color.textMuted} />
        </View>
        <Text style={[styles.cardName, styles.cardNameCentered]} numberOfLines={2}>
          {rec.name}
        </Text>
        <Text style={[styles.cardBrand, styles.cardNameCentered]} numberOfLines={1}>
          {rec.brand}
        </Text>
        <TagChips tags={rec.tags} category={rec.category} horizontal />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rec.name} 확인하기`}
      onPress={onPress}
      style={({ pressed }) => [styles.vCard, pressed && styles.pressed]}
    >
      <View style={styles.vCardThumbnail}>
        <IconImagePlaceholder size={22} color={color.textMuted} />
      </View>
      <View style={styles.vCardInfo}>
        {/* Figma는 "브랜드 · 용량"이지만 CHECK-01에 용량이 없어 브랜드만 표시합니다. */}
        <Text style={styles.cardName} numberOfLines={1}>
          {rec.name}
        </Text>
        <Text style={styles.cardBrand} numberOfLines={1}>
          {rec.brand}
        </Text>
      </View>
      <TagChips tags={rec.tags} category={rec.category} />
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
        <ErrorState variant="network" layout="inline" onRetry={() => query.refetch()} />
      ) : query.data.totalCount === 0 ? (
        <EmptyState icon="search" title="검색 결과가 없어요" description="다른 검색어로 시도해 보세요." />
      ) : (
        <View style={styles.cardStack}>
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
  screen: {
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
  scrollContent: {
    backgroundColor: color.surfaceLavenderPale,
  },

  // 헤더(흰 블록)
  header: {
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[3],
  },
  headerTitleBlock: {
    flex: 1,
  },
  pageTitle: {
    fontSize: adjustFontSize(22),
    lineHeight: 31,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  pageSubtitle: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  cartButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 아이콘 우상단에 겹치는 개수 배지. minWidth로 한 자리/두 자리 모두 원형에 가깝게.
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: color.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: adjustFontSize(9),
    lineHeight: 12,
    ...weightFamily('bold'),
    color: color.white,
  },
  modeChipRow: {
    flexDirection: 'row',
    gap: space[2],
    paddingTop: space[4],
  },
  modeChip: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.surfaceLavenderSoft,
  },
  modeChipSelected: {
    backgroundColor: color.brand500,
  },
  modeChipLabel: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textInk,
  },
  modeChipLabelSelected: {
    color: color.white,
  },

  // 본문(연보라 배경)
  body: {
    padding: space[4],
    gap: space[5],
  },
  // 스캔/검색/로딩/에러처럼 "섹션 제목 없이 흰 카드 하나"인 블록용.
  panelCard: {
    backgroundColor: color.bg,
    borderRadius: radius.xl,
    padding: space[5],
    gap: space[3],
    ...reportCardShadow.soft,
  },

  section: {
    gap: space[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[2],
    paddingHorizontal: space[1],
  },
  sectionHeaderText: {
    flex: 1,
  },
  // 카드 밖으로 나오면서 카드 안 제목(14)보다 키웠습니다 — 참고 이미지의 "큰 글씨".
  sectionTitle: {
    fontSize: adjustFontSize(17),
    lineHeight: 25,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  todaySubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  // sectionSubtitle과 같은 서체지만 marginTop이 없습니다 — 위 행이 이미 marginTop을
  // 갖고 있고, 자식에 또 주면 칩과 세로 중앙 정렬이 어긋납니다.
  subtitleInline: {
    fontSize: adjustFontSize(11),
    lineHeight: 16,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  sectionSubtitle: {
    fontSize: adjustFontSize(11),
    lineHeight: 16,
    ...weightFamily('medium'),
    color: color.textSub,
    marginTop: 2,
  },
  moreLink: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.brand500,
    paddingTop: 6,
  },

  // 세로 카드 스택
  cardStack: {
    gap: space[3],
  },
  vCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: color.bg,
    borderRadius: radius.xl,
    padding: space[4],
    ...reportCardShadow.soft,
  },
  vCardThumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceLavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vCardInfo: {
    flex: 1,
  },

  // 가로 스크롤 카드
  horizontalRow: {
    gap: space[3],
    paddingHorizontal: space[1],
    paddingBottom: space[1],
  },
  hCard: {
    width: 132,
    alignItems: 'center',
    gap: space[2],
    backgroundColor: color.bg,
    borderRadius: radius.xl,
    padding: space[3],
    ...reportCardShadow.soft,
  },
  hCardThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: color.surfaceLavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 카드 텍스트 — 제품명 볼드 위 / 브랜드 작은 회색 아래 (관리자 지시)
  cardName: {
    fontSize: adjustFontSize(14),
    lineHeight: 21,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  cardBrand: {
    fontSize: adjustFontSize(11),
    lineHeight: 16,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  cardNameCentered: {
    textAlign: 'center',
  },

  // 추천 근거 태그 칩 (CHECK-01 tags)
  tagRowVertical: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tagRowHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  tagChip: {
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagChipLabel: {
    fontSize: adjustFontSize(10),
    ...weightFamily('medium'),
  },

  // 성분 필터 칩
  ingredientChipRow: {
    flexDirection: 'row',
    gap: space[2],
    paddingHorizontal: space[1],
  },
  emptyIngredientText: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textSub,
    paddingHorizontal: space[1],
  },

  // 스캔 / 검색 패널
  scanModeToggle: {
    alignSelf: 'stretch',
  },
  cameraBox: {
    height: 240,
  },
  scanHint: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textSub,
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

  pressed: {
    opacity: 0.7,
  },
});
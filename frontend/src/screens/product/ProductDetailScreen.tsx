// ProductDetailScreen.tsx — SHOP-02 제품 상세
//
// Phase 11-C(관리자 결정, 2026-08-13) — Figma "최종" 페이지의 SHOP-01(쇼핑)에서 추천 카드
// "성분 확인하기", 검색 결과 탭, 바코드 스캔 성공 3개 진입 경로가 전부 이 화면으로 모입니다.
// (원래 CheckResultScreen 하나로 처리하던 것을 이걸로 대체 — 아래 설계 메모 참고)
//
// ⚠️ 데이터 소스 설계 메모: Figma는 성분마다 "트러블 진정 효과 확인" 같은 사유 문구를 보여주는데,
// PRODUCT-03(useProductDetail)의 keyIngredients는 사유가 없고 note(예: "50%")만 있습니다.
// 반대로 CHECK-02(computeCheck)의 ingredients는 정확히 이 사유(reason)를 갖고 있습니다
// (CheckResultScreen이 이미 쓰던 바로 그 API). 그래서 이 화면은 둘을 합칩니다:
//   - useProductDetail(productId): 상단 헤더용(브랜드·이름·카테고리)만 사용
//   - computeCheck(productId): "성분 분석" 섹션(잘맞음/지켜보는중/주의필요 + 성분별 사유) 전체
// → 결과적으로 기존 CheckResultScreen(S-22)의 상위 호환입니다. CheckResultScreen 파일과
//   DetailRoutes.CheckResult 라우트는 남겨뒀지만 이제 어디서도 navigate하지 않습니다 — 필요
//   없으면 다음 체크포인트에서 정리해도 됩니다(관리자님 확인 필요).
//
// 추천 이유(Figma "추천 이유" 섹션)는 SHOP-01 추천 카드를 탭했을 때만 CHECK-01의 reason을
// route param으로 받아 보여줍니다. 검색·스캔으로 들어오면 이 섹션 자체를 생략합니다(지어낼
// 근거가 없어서) — PRD/API 어디에도 검색·스캔 경로용 추천 사유 필드가 없습니다. Figma
// 시안엔 불릿이 3줄이지만, 우리가 실제로 가진 사유는 CHECK-01의 reason 문자열 1개뿐이라
// 불릿 1개만 그립니다(나머지 2개는 지어낼 근거가 없어 생략).
//
// 구매하러 가기 / 장바구니에 담기: API 명세서·기능명세서 전체에 이 기능이 없는 걸 확인했습니다
// (관리자님 확인, 2026-08-13) — 완전히 프론트 목업이며 실제 이동/저장 없이 Toast만 띄웁니다.
//
// Figma 배치 맞춤(관리자님 요청, 2026-08-13) — SHOP-02(node 193:5932) 구조를 그대로 따름:
//   Nav(← + 제목) → 구분선 → 제품 헤더(사진 80x80 + 브랜드/이름/카테고리) → 요약 카드
//   (테두리 박스, 얼굴아이콘 왼쪽 + 텍스트 오른쪽) → 구분선 → "성분 분석" 라벨 → 성분별 행
//   (이름/사유 왼쪽, 작은 얼굴아이콘+상태 라벨 오른쪽 — 기존 Tag 알약형 배지 대신 Figma처럼
//   배경 없는 아이콘+텍스트로) → 구분선 → "추천 이유" 라벨 → 불릿.
// ⚠️ 이 화면에 뒤로가기 버튼(←)을 넣은 건 이 코드베이스에서 처음입니다 — 다른 상세 화면들은
// (MetricDetailScreen 등) OS 기본 제스처/버튼에 맡기고 화면 안엔 안 둡니다. 여기는 Figma가
// 명시적으로 그려놔서 넣었는데, 프로젝트 전체 컨벤션과 다른 선택이라 다음에 다른 상세 화면도
// 이렇게 통일할지 관리자님 확인 필요합니다.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, AppIconName, IconImagePlaceholder } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Toast } from '@/components/base/Toast';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { useProductDetail } from '@/api/queries/product';
import { computeCheck } from '@/api/queries/check';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { CheckResult, RiskLevel } from '@/types/check';
import type { IngredientStatus } from '@/types/product';
import { PRODUCT_CATEGORY_LABELS } from '@/types/product';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const RISK_COLOR: Record<RiskLevel, string> = {
  LOW: color.statusGood,
  MEDIUM: color.statusWatch,
  HIGH: color.statusCaution,
};

// 얼굴 아이콘(🙂/😐/🙁)은 디자이너 요청 중 — 도착 전까지 Tag가 쓰던 것과 같은 아이콘으로
// 대체(check/helpCircle/warning). 도착하면 이 맵의 이름만 바꾸면 됩니다.
const RISK_ICON: Record<RiskLevel, AppIconName> = {
  LOW: 'check',
  MEDIUM: 'helpCircle',
  HIGH: 'warning',
};

// 성분별 상태 — Figma 문구를 그대로 따름(Tag 컴포넌트의 기본 라벨 "맞음"/"주의"와는 다름).
// SHOP-02는 알약형 배지가 아니라 배경 없는 아이콘+텍스트라 Tag를 그대로 안 쓰고 로컬로 둡니다.
const STATUS_ICON: Record<IngredientStatus, AppIconName> = {
  GOOD: 'check',
  CAUTION: 'warning',
  INSUFFICIENT: 'helpCircle',
};
const STATUS_LABEL: Record<IngredientStatus, string> = {
  GOOD: '잘 맞음',
  CAUTION: '지켜보는 중',
  INSUFFICIENT: '정보 부족',
};
const STATUS_COLOR: Record<IngredientStatus, string> = {
  GOOD: color.statusGood,
  CAUTION: color.statusWatch,
  INSUFFICIENT: color.ink600,
};

type Phase = 'loading' | 'result' | 'empty' | 'error';

export function ProductDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<DetailStackParamList, 'ProductDetail'>>();
  const { productId, reason } = route.params;

  const detailQuery = useProductDetail(productId);

  const [phase, setPhase] = useState<Phase>('loading');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const runCheck = useCallback(async () => {
    setPhase('loading');
    try {
      const data = await computeCheck(productId);
      if (!isMountedRef.current) return;
      setCheckResult(data);
      setPhase('result');
    } catch (e) {
      if (!isMountedRef.current) return;
      if (e instanceof ApiError && e.code === ErrorCode.CHECK_PROFILE_NOT_READY) {
        setEmptyMessage('아직 판단할 데이터가 부족해요.');
        setPhase('empty');
        return;
      }
      if (e instanceof ApiError && e.code === ErrorCode.CHECK_INGREDIENT_DATA_INSUFFICIENT) {
        setEmptyMessage('확인할 수 없는 성분이 포함되어 있어요.');
        setPhase('empty');
        return;
      }
      setPhase('error');
    }
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 구매/장바구니는 목업이라 실패할 일이 없어서 별도 mutation 없이 즉시 Toast만 띄웁니다.
  const handlePurchase = () => setToastMessage('데모에서는 실제 구매로 연결되지 않아요.');
  const handleAddToCart = () => setToastMessage('장바구니에 담았어요. (데모 전용)');

  const combinedLoading = detailQuery.isLoading || phase === 'loading';

  const Header = (
    <View style={[styles.nav, { paddingTop: insets.top }]}>
      <View style={styles.navRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          hitSlop={8}
        >
          <AppIcon name="back" size={22} color={color.ink900} />
        </Pressable>
        <Text style={styles.navTitle}>제품 상세</Text>
      </View>
      <View style={styles.navDivider} />
    </View>
  );

  if (combinedLoading) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.centerFill}>
          <LoadingState />
          <Text style={styles.loadingText}>성분을 분석하는 중이에요…</Text>
        </View>
      </View>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.centerFill}>
          <ErrorState variant="network" onRetry={() => detailQuery.refetch()} />
        </View>
      </View>
    );
  }

  if (phase === 'empty') {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.centerFill}>
          <EmptyState icon="info" title={emptyMessage} description="데이터가 더 쌓이면 정확하게 확인할 수 있어요." />
        </View>
      </View>
    );
  }

  if (phase === 'error' || !checkResult) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.centerFill}>
          <ErrorState variant="server" onRetry={runCheck} />
        </View>
      </View>
    );
  }

  const product = detailQuery.data;
  const categoryLabel = PRODUCT_CATEGORY_LABELS[product.category] ?? product.category;

  return (
    <View style={styles.container}>
      {Header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.productRow}>
          <View style={styles.thumbnail}>
            <IconImagePlaceholder size={26} color={color.ink300} />
          </View>
          <View style={styles.productText}>
            <Text style={styles.brand}>{product.brand}</Text>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.category}>{categoryLabel}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <AppIcon
            name={RISK_ICON[checkResult.riskLevel]}
            size={48}
            color={RISK_COLOR[checkResult.riskLevel]}
          />
          <View style={styles.summaryText}>
            <Text style={[styles.summaryTitle, { color: RISK_COLOR[checkResult.riskLevel] }]}>
              {checkResult.riskTitle}
            </Text>
            <Text style={styles.summaryDescription}>{checkResult.riskDescription}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>성분 분석</Text>
          <View style={styles.ingredientList}>
            {checkResult.ingredients.map((ingredient) => (
              <View key={ingredient.ingredientId} style={styles.ingredientRow}>
                <View style={styles.ingredientTextArea}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  {ingredient.reason ? (
                    <Text style={styles.ingredientReason}>{ingredient.reason}</Text>
                  ) : null}
                </View>
                <View style={styles.statusBadge}>
                  <AppIcon
                    name={STATUS_ICON[ingredient.status]}
                    size={16}
                    color={STATUS_COLOR[ingredient.status]}
                  />
                  <Text style={[styles.statusLabel, { color: STATUS_COLOR[ingredient.status] }]}>
                    {STATUS_LABEL[ingredient.status]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {reason ? (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>추천 이유</Text>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletDot}>·</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[3] }]}>
        <Button label="구매하러 가기" variant="primary" onPress={handlePurchase} style={styles.bottomButton} />
        <Button label="장바구니에 담기" variant="ghost" onPress={handleAddToCart} style={styles.bottomButton} />
      </View>

      <Toast
        visible={toastMessage !== null}
        message={toastMessage ?? ''}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  nav: {
    backgroundColor: color.bg,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  navTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  navDivider: {
    height: 1,
    backgroundColor: color.ink300,
    opacity: 0.4,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    backgroundColor: color.bg,
  },
  loadingText: {
    ...typography.caption,
    color: color.ink600,
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[8],
    gap: space[5],
  },
  productRow: {
    flexDirection: 'row',
    gap: space[3],
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productText: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  brand: {
    ...typography.caption,
    color: color.ink600,
  },
  name: {
    ...typography.h2,
    color: color.ink900,
  },
  category: {
    ...typography.caption,
    color: color.ink600,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: 16,
    padding: space[4],
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: adjustFontSize(22),
    ...weightFamily('bold'),
  },
  summaryDescription: {
    ...typography.caption,
    color: color.ink600,
  },
  divider: {
    height: 1,
    backgroundColor: color.ink300,
    opacity: 0.4,
  },
  section: {
    gap: space[3],
  },
  sectionLabel: {
    ...typography.caption,
    color: color.ink600,
  },
  ingredientList: {
    gap: space[4],
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[3],
  },
  ingredientTextArea: {
    flex: 1,
    gap: 2,
  },
  ingredientName: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  ingredientReason: {
    ...typography.caption,
    color: color.ink600,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    ...typography.caption,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  bulletDot: {
    ...typography.body,
    color: color.ink600,
  },
  reasonText: {
    ...typography.body,
    color: color.ink600,
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
  bottomButton: {
    width: '100%',
  },
});
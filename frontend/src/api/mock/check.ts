// src/api/mock/check.ts
//
// F-CHECK-02 BR3: "여기서 조회한 제품은 사용 기록으로 저장하지 않는다" — 그래서 이 파일은
// api/mock/product.ts의 savedProducts/recordedSlots 세션 상태를 전혀 건드리지 않습니다.
// productId 카탈로그(findCatalogProduct)만 재사용해서 검색·스캔과 같은 제품 이름이 나오게 합니다.
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { findCatalogProduct } from '@/api/mock/product';
import type {
  CheckHomeResult,
  CheckIngredient,
  CheckResult,
  CheckResultSummary,
  RiskLevel,
} from '@/types/check';

// ---------------------------------------------------------------------------
// CHECK-01 · 쇼핑 홈
// ---------------------------------------------------------------------------

// SHOP-01 3분류(ADR 0018) 실측용 목업 — Figma(193:5724) 예시 문구를 그대로 씁니다.
// 카탈로그 신규 제품(90~94)은 api/mock/product.ts CATALOG 참고.
//
// tags(ADR 0027)는 서버 규칙을 그대로 흉내 냅니다 — 1번 칩은 category에서 결정되므로
// 같은 섹션의 제품끼리 항상 같고, 2번 "주의 성분 미포함"은 CAUTION 성분이 없는 제품에만
// 붙습니다. 칩이 1개인 제품을 섹션마다 하나씩 섞어둬서 두 경우가 화면에서 다 보입니다.
export function buildMockCheckHome(): CheckHomeResult {
  return {
    profileCompletion: 65,
    recommendations: [
      // TODAY_NEEDED — todayContext(트러블 62·홍조 38 → 홍조가 "주의")를 근거로 함
      {
        productId: 71,
        name: '라로슈포제 시카플라스트',
        brand: '라로슈포제',
        reason: '판테놀·마데카소사이드가 잘 맞는 성분이에요',
        imageUrl: null,
        category: 'TODAY_NEEDED',
        aiComment: '판테놀이 진정에 도움을 줘요',
        tags: ['트러블 진정 성분', '주의 성분 미포함'],
      },
      {
        productId: 82,
        name: '마누카 히알루론산 토너',
        brand: '마누카',
        reason: '히알루론산 반응이 좋았어요',
        imageUrl: null,
        category: 'TODAY_NEEDED',
        aiComment: null,
        // 이 제품엔 프로파일상 CAUTION 성분이 있다고 가정 — 2번 칩이 붙지 않습니다.
        tags: ['트러블 진정 성분'],
      },
      // HUMIDITY_CARE — todayContext(습도 55%, DRY)를 근거로 함
      {
        productId: 90,
        name: '라운드랩 수분 크림',
        brand: '라운드랩',
        reason: '히알루론산이 잘 맞는 성분이에요',
        imageUrl: null,
        category: 'HUMIDITY_CARE',
        aiComment: null,
        tags: ['보습 강화 성분', '주의 성분 미포함'],
      },
      {
        productId: 91,
        name: '닥터지 히알루론산 세럼',
        brand: '닥터지',
        reason: '히알루론산이 잘 맞는 성분이에요',
        imageUrl: null,
        category: 'HUMIDITY_CARE',
        aiComment: null,
        tags: ['보습 강화 성분'],
      },
      {
        productId: 92,
        name: '코스알엑스 달팽이 에센스',
        brand: '코스알엑스',
        reason: '판테놀이 잘 맞는 성분이에요',
        imageUrl: null,
        category: 'HUMIDITY_CARE',
        aiComment: null,
        tags: ['보습 강화 성분', '주의 성분 미포함'],
      },
      // MATCHED_INGREDIENT — 성분 필터 칩(useIngredientProfile GOOD)으로 걸러 보여줌
      {
        productId: 93,
        name: '코스알엑스 나이아신아마이드 15% 앰플',
        brand: '코스알엑스',
        reason: '나이아신아마이드가 잘 맞는 성분이에요',
        imageUrl: null,
        category: 'MATCHED_INGREDIENT',
        aiComment: null,
        tags: ['잘 맞는 성분', '주의 성분 미포함'],
      },
      {
        productId: 94,
        name: '닥터자르트 시카페어 크림',
        brand: '닥터자르트',
        reason: '판테놀이 잘 맞는 성분이에요',
        imageUrl: null,
        category: 'MATCHED_INGREDIENT',
        aiComment: null,
        tags: ['잘 맞는 성분'],
      },
    ],
    // 2026-08-18 — 점수 방향 "높을수록 좋음" 확정에 맞춰 뒤집었습니다.
    // mock/skin.ts의 오늘 기록(트러블 62 · 홍조 38)과 같은 값이어야 합니다 —
    // 실서버에서도 이 값은 같은 피부 기록에서 나옵니다(CheckHomeService).
    // 홍조 38 = "주의"라 "오늘 내 피부에 필요해요" 섹션이 뜨는 근거가 됩니다.
    todayContext: {
      troubleScore: 62,
      rednessScore: 38,
      humidity: 55,
      humidityGrade: 'DRY',
    },
    failedSections: [],
  };
}

// ---------------------------------------------------------------------------
// CHECK-02 · 위험도 분석
// ---------------------------------------------------------------------------

interface CheckRiskProfile {
  riskLevel: RiskLevel;
  riskTitle: string;
  riskDescription: string;
  ingredients: CheckIngredient[];
}

const RISK_LABEL: Record<RiskLevel, { title: string; description: string }> = {
  LOW: { title: '잘 맞아요', description: '내 피부 기준으로 자극 성분이 거의 없어요' },
  MEDIUM: { title: '보통이에요', description: '일부 주의할 성분이 있지만 크게 우려할 정도는 아니에요' },
  HIGH: { title: '주의가 필요해요', description: '내 피부 기준으로 맞지 않는 성분이 포함되어 있어요' },
};

function buildRiskProfile(riskLevel: RiskLevel, ingredients: CheckIngredient[]): CheckRiskProfile {
  const label = RISK_LABEL[riskLevel];
  return {
    riskLevel,
    riskTitle: label.title,
    riskDescription: label.description,
    ingredients,
  };
}

// 데모용 고정 프로필. api_명세서.md CHECK-02 예시(productId 71 → HIGH)와 실제로 맞춥니다.
// 나머지는 카탈로그 전체를 다양하게 보여주려고 등급을 섞었습니다.
const CHECK_RISK_PROFILES: Record<number, CheckRiskProfile> = {
  71: buildRiskProfile('HIGH', [
    { ingredientId: 27, name: '향료', status: 'CAUTION', reason: '과거 홍조 반응 있음' },
    { ingredientId: 31, name: '에탄올', status: 'CAUTION', reason: '건성 피부 자극 가능' },
    { ingredientId: 9, name: '글리세린', status: 'GOOD', reason: '보습 효과 확인됨' },
    { ingredientId: 3, name: '나이아신아마이드', status: 'GOOD', reason: '피부 톤 개선 이력' },
    { ingredientId: 88, name: '부틸렌글라이콜', status: 'INSUFFICIENT', reason: null },
  ]),
  82: buildRiskProfile('LOW', [
    { ingredientId: 41, name: '히알루론산', status: 'GOOD', reason: '보습 반응이 꾸준히 좋았음' },
    { ingredientId: 9, name: '글리세린', status: 'GOOD', reason: '보습 효과 확인됨' },
    { ingredientId: 88, name: '부틸렌글라이콜', status: 'INSUFFICIENT', reason: null },
  ]),
  11: buildRiskProfile('MEDIUM', [
    { ingredientId: 51, name: '자작나무수액', status: 'GOOD', reason: '진정 반응 좋았음' },
    { ingredientId: 27, name: '향료', status: 'CAUTION', reason: '과거 홍조 반응 있음' },
    { ingredientId: 12, name: '정제수', status: 'INSUFFICIENT', reason: null },
  ]),
  18: buildRiskProfile('HIGH', [
    { ingredientId: 61, name: '알코올', status: 'CAUTION', reason: '건성 피부 자극 가능' },
    { ingredientId: 27, name: '향료', status: 'CAUTION', reason: '과거 홍조 반응 있음' },
    { ingredientId: 71, name: '티타늄디옥사이드', status: 'GOOD', reason: '자극 반응 없음' },
  ]),
  // SHOP-01 3분류(ADR 0018) HUMIDITY_CARE/MATCHED_INGREDIENT 카드 실측용 신규 프로필.
  90: buildRiskProfile('LOW', [
    { ingredientId: 41, name: '히알루론산', status: 'GOOD', reason: '보습 반응이 꾸준히 좋았음' },
    { ingredientId: 9, name: '글리세린', status: 'GOOD', reason: '보습 효과 확인됨' },
  ]),
  91: buildRiskProfile('LOW', [
    { ingredientId: 41, name: '히알루론산', status: 'GOOD', reason: '보습 반응이 꾸준히 좋았음' },
    { ingredientId: 88, name: '부틸렌글라이콜', status: 'INSUFFICIENT', reason: null },
  ]),
  92: buildRiskProfile('LOW', [
    { ingredientId: 15, name: '판테놀', status: 'GOOD', reason: '진정 반응 확인됨' },
    { ingredientId: 51, name: '자작나무수액', status: 'GOOD', reason: '진정 반응 좋았음' },
  ]),
  93: buildRiskProfile('LOW', [
    { ingredientId: 3, name: '나이아신아마이드', status: 'GOOD', reason: '피부 톤 개선 이력' },
    { ingredientId: 12, name: '정제수', status: 'INSUFFICIENT', reason: null },
  ]),
  94: buildRiskProfile('LOW', [
    { ingredientId: 15, name: '판테놀', status: 'GOOD', reason: '진정 반응 확인됨' },
    { ingredientId: 27, name: '향료', status: 'CAUTION', reason: '과거 홍조 반응 있음' },
  ]),
};

function computeSummary(ingredients: CheckIngredient[]): CheckResultSummary {
  return {
    goodCount: ingredients.filter((i) => i.status === 'GOOD').length,
    cautionCount: ingredients.filter((i) => i.status === 'CAUTION').length,
    insufficientCount: ingredients.filter((i) => i.status === 'INSUFFICIENT').length,
  };
}

export type MockCheckScenario = 'SUCCESS' | 'PROFILE_NOT_READY' | 'INGREDIENT_INSUFFICIENT';

// 관리자님 요청 패턴과 동일(DevResetButton에서 전환) — 두 409(빈 상태) 케이스를 언제든
// 재현해서 "빨간 오류 UI가 아니라 안내 문구로 뜨는지" 검증할 수 있게 했습니다.
let checkScenario: MockCheckScenario = 'SUCCESS';

export function setMockCheckScenario(scenario: MockCheckScenario): void {
  checkScenario = scenario;
}

let nextCheckId = 100;
// checkId → 결과 매핑(세션 한정) — CHECK-03(GET /checks/{checkId}) 재조회용.
const checkResultsById = new Map<number, CheckResult>();

export function computeMockCheckResult(productId: number): CheckResult {
  if (checkScenario === 'PROFILE_NOT_READY') {
    throw new ApiError(ErrorCode.CHECK_PROFILE_NOT_READY, '아직 판단할 데이터가 부족해요.');
  }
  if (checkScenario === 'INGREDIENT_INSUFFICIENT') {
    throw new ApiError(
      ErrorCode.CHECK_INGREDIENT_DATA_INSUFFICIENT,
      '확인할 수 없는 성분이 포함되어 있어요.'
    );
  }

  const product = findCatalogProduct(productId);
  if (!product) {
    throw new ApiError(ErrorCode.CHECK_PRODUCT_NOT_FOUND, '제품 정보를 찾을 수 없어요.');
  }

  const profile = CHECK_RISK_PROFILES[productId] ?? buildRiskProfile('MEDIUM', []);

  const checkId = nextCheckId;
  nextCheckId += 1;

  const result: CheckResult = {
    checkId,
    productId,
    productName: product.name,
    riskLevel: profile.riskLevel,
    riskTitle: profile.riskTitle,
    riskDescription: profile.riskDescription,
    ingredients: profile.ingredients,
    summary: computeSummary(profile.ingredients),
  };

  checkResultsById.set(checkId, result);
  return result;
}

// ---------------------------------------------------------------------------
// CHECK-03 · 확인 결과 조회
// ---------------------------------------------------------------------------
export function getMockCheckResult(checkId: number): CheckResult {
  const result = checkResultsById.get(checkId);
  if (!result) {
    throw new ApiError(ErrorCode.CHECK_NOT_FOUND, '확인 결과를 찾을 수 없어요.');
  }
  return result;
}

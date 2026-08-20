// src/api/mock/product.ts
//
// Phase 7-A 범위: PRODUCT-01(홈) · PRODUCT-02(검색) · PRODUCT-08(루틴 바로 기록).
// Phase 7-B 추가: PRODUCT-03(상세) · PRODUCT-04(스캔) · PRODUCT-05(개별 저장).
//
// record.ts의 mockSkinCompletions와 동일한 패턴 — 세션 한정 메모리(앱 재시작 시 초기화),
// DevResetButton "제품 기록 초기화"에서 resetMockProductSession()으로 되돌립니다.
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import {
  clearMockManualProductsState,
  getMockManualProductsState,
  setMockManualProductsState,
} from '@/api/mock/mockPersistence';
import type { PersistedManualProductsState } from '@/api/mock/mockPersistence';
import type { TimeSlot } from '@/app/routes';
import { PRODUCT_CATEGORY_LABELS } from '@/types/product';
import type {
  IngredientItem,
  KeyIngredient,
  ProductCategory,
  ProductDetailResult,
  ProductRecordHomeResult,
  ProductSaveResult,
  ProductSearchResult,
  RegisterProductInput,
  RoutineListItem,
  RoutineProductItem,
  RoutineQuickRecordResult,
  RoutineSummaryItem,
  SaveProductRecordResult,
  SavedProductSummary,
  ScanMode,
  ScanResult,
  SearchedProduct,
} from '@/types/product';

// ---------------------------------------------------------------------------
// 고정 제품 카탈로그 — 검색·저장 제품·루틴이 전부 이 목록을 참조합니다.
// productId는 api_명세서.md 예시값을 그대로 재사용했습니다(문서·구현 대조가 쉽도록).
// ---------------------------------------------------------------------------
export interface CatalogProduct {
  productId: number;
  name: string;
  brand: string;
  category: ProductCategory;
}

const CATALOG: CatalogProduct[] = [
  { productId: 11, name: '라운드랩 자작나무 수분 토너', brand: '라운드랩', category: 'TONER' },
  { productId: 12, name: '라운드랩 1025 독도 토너', brand: '라운드랩', category: 'TONER' },
  { productId: 15, name: '이니스프리 어성초 세럼', brand: '이니스프리', category: 'SERUM' },
  { productId: 18, name: '조선미녀 맑은쌀 선크림', brand: '조선미녀', category: 'SUNCREAM' },
  { productId: 21, name: '닥터지 선베이스', brand: '닥터지', category: 'SUNCREAM' },
  { productId: 71, name: '라로슈포제 시카플라스트', brand: '라로슈포제', category: 'CREAM' },
  { productId: 82, name: '마누카 히알루론산 토너', brand: '마누카', category: 'TONER' },
  // SHOP-01 3분류(ADR 0018) HUMIDITY_CARE/MATCHED_INGREDIENT 섹션 실측용 신규 카탈로그 —
  // Figma(193:5724) 예시 제품명 그대로 사용.
  { productId: 90, name: '라운드랩 수분 크림', brand: '라운드랩', category: 'CREAM' },
  { productId: 91, name: '닥터지 히알루론산 세럼', brand: '닥터지', category: 'SERUM' },
  { productId: 92, name: '코스알엑스 달팽이 에센스', brand: '코스알엑스', category: 'ESSENCE' },
  { productId: 93, name: '코스알엑스 나이아신아마이드 15% 앰플', brand: '코스알엑스', category: 'AMPOULE' },
  { productId: 94, name: '닥터자르트 시카페어 크림', brand: '닥터자르트', category: 'CREAM' },
];

export function findCatalogProduct(productId: number): CatalogProduct | undefined {
  return (
    CATALOG.find((p) => p.productId === productId) ??
    MANUAL_CATALOG.find((p) => p.productId === productId)
  );
}

// ---------------------------------------------------------------------------
// PRODUCT-08 · 제품 직접 등록 (F-PRODUCT-08, TBD-07 — 백엔드 API 자체가 없어 전체 목업)
// CATALOG(고정 배열)과 분리해둔 이유: "제품 기록 초기화"를 눌러도 데모 기본 카탈로그는
// 그대로 있어야 하는데, 사용자가 새로 등록한 제품은 세션 상태라 초기화 대상이라서.
// ---------------------------------------------------------------------------
const MANUAL_CATALOG: CatalogProduct[] = [];
const MANUAL_PROFILES = new Map<number, ProductIngredientProfile>();
let nextManualProductId = 9000;
let nextManualIngredientId = 5000;

export function registerMockProduct(input: RegisterProductInput): CatalogProduct {
  const productId = nextManualProductId;
  nextManualProductId += 1;

  const product: CatalogProduct = {
    productId,
    name: input.name,
    brand: input.brand,
    category: input.category,
  };
  MANUAL_CATALOG.push(product);

  // 사용자가 손으로 입력한 성분은 개인 매칭 판정을 내릴 근거가 없어서 전부 INSUFFICIENT로
  // 등록합니다 — PRODUCT-03 BR4(성분 데이터 부족)와 같은 의미. 최대 10건(keyIngredients 제약).
  const trimmedNames = input.ingredientNames.map((n) => n.trim()).filter(Boolean);
  const keyIngredients: KeyIngredient[] = trimmedNames.slice(0, 10).map((name) => {
    const ingredientId = nextManualIngredientId;
    nextManualIngredientId += 1;
    return { ingredientId, name, status: 'INSUFFICIENT' as const };
  });

  MANUAL_PROFILES.set(productId, {
    ingredientCount: trimmedNames.length,
    keyIngredients,
    imageUrl: input.imageUri ?? null,
  });

  // 관리자님 실기기 확인(2026-08-14) — 등록만 하고 아직 기록완료를 안 거쳐도(루틴에
  // 추가만 하는 경로) "저장된 제품" 목록엔 바로 나와야 합니다. savedProducts는 원래
  // "기록완료"할 때만 채워지는 값이었는데, 등록 시점에도 넣어주는 걸로 확장했습니다
  // (이후 실제로 기록완료하면 어차피 같은 Map에 다시 set되면서 시각만 갱신됩니다).
  savedProducts.set(productId, new Date().toISOString());

  persistManualState();

  return product;
}

// ---------------------------------------------------------------------------
// 목업 세션 상태
// ---------------------------------------------------------------------------

// 시간대별 오늘 기록 여부 — PRODUCT-01의 alreadyRecorded, PRODUCT-08 중복 판정에 씀
const recordedSlots = new Set<TimeSlot>();

// 저장된 제품(마지막 사용 시각 포함) — 최초엔 데모용으로 2개가 이미 저장돼 있는 상태로 시작
const savedProducts = new Map<number, string>([
  [11, '2026-08-06T08:12:00+09:00'],
  [15, '2026-08-05T08:30:00+09:00'],
]);

const ROUTINES: { routineId: number; name: string; timeSlot: TimeSlot; productIds: number[] }[] = [
  { routineId: 1, name: '모닝루틴', timeSlot: 'MORNING', productIds: [11, 15, 21] },
  { routineId: 2, name: '나이트루틴', timeSlot: 'NIGHT', productIds: [11, 18] },
];

// resetMockProductSession()에서 위 초기값으로 되돌리기 위한 스냅샷 — ROUTINES.productIds를
// addProductToRoutine()으로 직접 mutate하기 때문에 필요합니다.
const INITIAL_ROUTINE_PRODUCT_IDS: Record<number, number[]> = {
  1: [11, 15, 21],
  2: [11, 18],
};

/**
 * Phase 11-C 추가(관리자님 요청, 2026-08-13) — 제품 직접 등록(PRODUCT-08) 시 특정 루틴에
 * 바로 추가할 수 있게. 루틴 수정 API 자체가 없어서(api_명세서.md 전수 확인) 이것도
 * registerMockProduct와 마찬가지로 완전히 목업입니다.
 */
export function addProductToRoutine(routineId: number, productId: number): void {
  const routine = ROUTINES.find((r) => r.routineId === routineId);
  if (!routine) {
    throw new ApiError(ErrorCode.ROUTINE_NOT_FOUND, '루틴을 찾을 수 없어요.');
  }
  if (!routine.productIds.includes(productId)) {
    routine.productIds.push(productId);
  }
  persistManualState();
}

/**
 * PRODUCT-09 · 제품 목록에 담기 / 빼기 (2026-08-19 세션 18 신설).
 *
 * ⚠️ **목업은 실서버와 똑같이 실패해야 합니다**(세션 17에서 스캔 버그가 목업 성공에
 * 가려졌던 교훈). 그래서 백엔드 `ProductService:223-244` 동작을 그대로 흉내냅니다.
 * - `saveMockProduct`: 카탈로그에 없는 productId면 404 PRODUCT_NOT_FOUND. 이미 저장돼
 *   있으면 오류가 아니라 그대로 성공(멱등).
 * - `unsaveMockProduct`: **저장돼 있지 않으면 404 PRODUCT_NOT_FOUND.** 실서버가
 *   `UserProduct` 행이 없을 때 던지는 것과 같은 코드입니다.
 */
/**
 * 2026-08-19(세션 19) — 삭제를 **행 제거가 아니라 상태 전환**으로 바꿨습니다.
 *
 * 실서버는 `UserProduct` 행을 지우지 않고 `usageStatus`만 STOPPED로 바꿉니다. 그리고
 * 두 목록의 필터가 서로 다릅니다:
 *   · `GET /users/me/products`   → USING만  (삭제한 제품이 빠짐)
 *   · `GET /product-records/home` → 필터 없음 (삭제한 제품이 **그대로 남음**)
 *
 * 예전 목업은 Map에서 통째로 지워버려서 양쪽 다 깔끔하게 사라졌고, 그래서 이 불일치가
 * 개발 중에 한 번도 안 보였습니다(세션 17 스캔 버그와 같은 함정). 이제 STOPPED 집합을
 * 따로 두고 서버와 같은 어긋남을 그대로 재현합니다 — 화면 쪽 보정(ProductRecordScreen의
 * usingProductIds 교집합)이 목업에서도 실제로 검증됩니다.
 */
const stoppedProductIds = new Set<number>();

/** 실서버 `existsByUserIdAndProductIdAndUsageStatus(..., USING)`와 같은 판정. */
function isProductSaved(productId: number): boolean {
  return savedProducts.has(productId) && !stoppedProductIds.has(productId);
}

export function saveMockProduct(productId: number): ProductSaveResult {
  if (!findCatalogProduct(productId)) {
    throw new ApiError(ErrorCode.PRODUCT_NOT_FOUND, '제품을 찾을 수 없어요.');
  }
  savedProducts.set(productId, new Date().toISOString());
  // 백엔드 `resumeUsing()` — 지웠던 제품을 다시 담으면 되살아납니다.
  stoppedProductIds.delete(productId);
  persistManualState();
  return { productId, saved: true };
}

export function unsaveMockProduct(productId: number): ProductSaveResult {
  // 행 자체가 없을 때만 404입니다. 이미 STOPPED인 제품을 또 지우면 실서버는 그냥
  // 200을 돌려줍니다(`findByUserIdAndProductId`는 상태를 안 봅니다).
  if (!savedProducts.has(productId)) {
    throw new ApiError(ErrorCode.PRODUCT_NOT_FOUND, '제품을 찾을 수 없어요.');
  }
  stoppedProductIds.add(productId);
  // 실서버의 stopUsing()은 제품을 목록에서만 빼고 루틴 구성은 건드리지 않습니다 —
  // 루틴에서 빼는 건 클라이언트(routineStore)가 합니다.
  persistManualState();
  return { productId, saved: false };
}

// ---------------------------------------------------------------------------
// Fast Refresh/새로고침 생존(관리자님 실기기 확인, 2026-08-14) — mockPersistence.ts
// 참고. 모듈 로드 시 한 번 fire-and-forget으로 이전 상태를 불러오고, 등록·루틴 추가가
// 생길 때마다 다시 저장합니다. 함수 선언은 호이스팅되지만 실제 호출은 아래
// hydrateManualState() 시점에 일어나므로, 위에서 쓰는 MANUAL_CATALOG·ROUTINES가 전부
// 이미 초기화된 뒤라 안전합니다.
// ---------------------------------------------------------------------------
function snapshotManualState(): PersistedManualProductsState {
  return {
    catalog: MANUAL_CATALOG.map((p) => ({ ...p })),
    profiles: Object.fromEntries(MANUAL_PROFILES.entries()),
    nextProductId: nextManualProductId,
    nextIngredientId: nextManualIngredientId,
    routineProductIds: Object.fromEntries(ROUTINES.map((r) => [r.routineId, [...r.productIds]])),
    // 9000 이상은 직접 등록한 제품 ID 범위 — 데모 기본 저장 제품(11, 15)은 resetMockProductSession
    // 쪽 하드코딩된 시드값으로 이미 매번 복원되니 여기 같이 저장할 필요가 없습니다.
    savedProducts: Array.from(savedProducts.entries()).filter(([id]) => id >= 9000),
    // 삭제 상태는 데모 기본 제품(11, 15)에도 걸리므로 ID 범위로 거르지 않고 전부 저장합니다.
    stoppedProductIds: Array.from(stoppedProductIds),
  };
}

function persistManualState(): void {
  // 저장 실패해도(웹 프리뷰 등) 화면 동작엔 영향 없이 조용히 무시합니다.
  setMockManualProductsState(snapshotManualState()).catch(() => {});
}

async function hydrateManualState(): Promise<void> {
  const saved = await getMockManualProductsState();
  if (!saved) return;
  MANUAL_CATALOG.push(...(saved.catalog as CatalogProduct[]));
  Object.entries(saved.profiles).forEach(([id, profile]) => {
    MANUAL_PROFILES.set(Number(id), profile as ProductIngredientProfile);
  });
  nextManualProductId = Math.max(nextManualProductId, saved.nextProductId);
  nextManualIngredientId = Math.max(nextManualIngredientId, saved.nextIngredientId);
  Object.entries(saved.routineProductIds).forEach(([routineId, productIds]) => {
    const routine = ROUTINES.find((r) => r.routineId === Number(routineId));
    if (routine) routine.productIds = productIds;
  });
  saved.savedProducts.forEach(([id, lastUsedAt]) => {
    savedProducts.set(id, lastUsedAt);
  });
  // 이전 포맷으로 저장된 값에는 이 필드가 없습니다(옵셔널).
  (saved.stoppedProductIds ?? []).forEach((id) => stoppedProductIds.add(id));
}

// ⚠️ 하이드레이션은 비동기라 완료 전 아주 짧은 순간엔 이전 세션 제품이 안 보일 수
// 있습니다 — 데모 목적상 감수. (mockPersistence.ts 상단 설명 참고)
hydrateManualState();

export function resetMockProductSession(): void {
  recordedSlots.clear();
  savedProducts.clear();
  stoppedProductIds.clear();
  savedProducts.set(11, '2026-08-06T08:12:00+09:00');
  savedProducts.set(15, '2026-08-05T08:30:00+09:00');
  MANUAL_CATALOG.length = 0;
  MANUAL_PROFILES.clear();
  nextManualProductId = 9000;
  nextManualIngredientId = 5000;
  ROUTINES.forEach((r) => {
    r.productIds = [...(INITIAL_ROUTINE_PRODUCT_IDS[r.routineId] ?? [])];
  });
  clearMockManualProductsState().catch(() => {});
}

// ---------------------------------------------------------------------------
// PRODUCT-07 · 루틴 목록 조회 (S-11 루틴 펼치기 — 관리자님 요청, 2026-08-10)
// ---------------------------------------------------------------------------
export function listMockRoutines(timeSlot?: TimeSlot): RoutineListItem[] {
  return ROUTINES.filter((r) => !timeSlot || r.timeSlot === timeSlot).map((r) => ({
    routineId: r.routineId,
    name: r.name,
    timeSlot: r.timeSlot,
    productCount: r.productIds.length,
    products: r.productIds
      .map((id) => {
        const product = findCatalogProduct(id);
        return product ? { productId: product.productId, name: product.name } : null;
      })
      .filter((p): p is RoutineProductItem => p !== null),
  }));
}

// 2026-08-15(세션4) — 카드 요약 문구가 서버 원본 카테고리 코드(TONER, SERUM 등)를 그대로
// 보여주고 있던 걸 발견, ProductCard/CategoryFilterBar와 동일하게
// PRODUCT_CATEGORY_LABELS로 한글 라벨 변환하도록 수정(관리자님 지시).
function buildProductSummary(productIds: number[]): string {
  return productIds
    .map((id) => findCatalogProduct(id)?.category)
    .filter((category): category is string => Boolean(category))
    .map((category) => PRODUCT_CATEGORY_LABELS[category] ?? category)
    .join(' · ');
}

/**
 * 기록 허브(S-09/10)의 완료 요약 문구용 — "라운드랩 자작나무 수분 토너 외 2개" 형태.
 * Phase 7-A 버그 수정(관리자님 실기기 확인, 2026-08-10): 루틴 바로 기록이 성공해도
 * 기록 허브 체크 표시가 안 바뀌던 문제 — api/queries/product.ts가 이 문구를 만들어
 * record.ts의 recordMockProductCompletion()에 넘겨줍니다.
 */
export function buildRoutineRecordSummary(routineId: number): string {
  const routine = ROUTINES.find((r) => r.routineId === routineId);
  if (!routine || routine.productIds.length === 0) return '제품 기록';
  const first = findCatalogProduct(routine.productIds[0]);
  const firstName = first?.name ?? '제품';
  return routine.productIds.length > 1
    ? `${firstName} 외 ${routine.productIds.length - 1}개`
    : firstName;
}

/** 위와 같은 용도 · S-14 개별 저장(PRODUCT-05)에서 씁니다 — 루틴이 아니라 productId 배열 기준. */
export function buildProductRecordSummary(productIds: number[]): string {
  if (productIds.length === 0) return '제품 기록';
  const first = findCatalogProduct(productIds[0]);
  const firstName = first?.name ?? '제품';
  return productIds.length > 1 ? `${firstName} 외 ${productIds.length - 1}개` : firstName;
}

function toSavedProductSummary(productId: number, lastUsedAt: string): SavedProductSummary | null {
  const product = findCatalogProduct(productId);
  if (!product) return null;
  return { ...product, lastUsedAt };
}

// ---------------------------------------------------------------------------
// PRODUCT-01 · 제품 기록 화면 조회
// ---------------------------------------------------------------------------
/**
 * PRODUCT-10 목업 · `GET /users/me/products`.
 *
 * 2026-08-19(세션 18) 신설 — 로컬 루틴(routineStore)이 productId만 들고 있어서
 * 이름을 붙이려면 저장 제품 전체 목록이 필요합니다. `buildMockProductRecordHome`의
 * savedProducts와 같은 소스를 쓰되 timeSlot에 묶이지 않습니다.
 */
export function listMockSavedProducts(): SavedProductSummary[] {
  return Array.from(savedProducts.entries())
    // `GET /users/me/products`는 USING만 돌려줍니다 — 삭제한 제품은 여기서 빠집니다.
    .filter(([id]) => !stoppedProductIds.has(id))
    .map(([id, lastUsedAt]) => toSavedProductSummary(id, lastUsedAt))
    .filter((p): p is SavedProductSummary => p !== null)
    .sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''));
}

export function buildMockProductRecordHome(timeSlot: TimeSlot): ProductRecordHomeResult {
  const routines: RoutineSummaryItem[] = [...ROUTINES]
    // BR2: 요청한 timeSlot의 루틴을 먼저 정렬. 다른 시간대 루틴도 함께 반환.
    .sort((a, b) => (a.timeSlot === timeSlot ? -1 : 0) - (b.timeSlot === timeSlot ? -1 : 0))
    .map((r) => ({
      routineId: r.routineId,
      name: r.name,
      timeSlot: r.timeSlot,
      productCount: r.productIds.length,
      productSummary: buildProductSummary(r.productIds),
    }));

  // ⚠️ 여기는 일부러 STOPPED를 걸러내지 않습니다 — 백엔드
  // `ProductRecordService.getHome()`에 상태 필터가 없어서 삭제한 제품이 그대로 남습니다.
  // 화면(ProductRecordScreen)이 `GET /users/me/products`와 교집합해 보정합니다.
  const saved: SavedProductSummary[] = Array.from(savedProducts.entries())
    .map(([id, lastUsedAt]) => toSavedProductSummary(id, lastUsedAt))
    .filter((p): p is SavedProductSummary => p !== null)
    // BR3: lastUsedAt 내림차순. 목업은 항상 값을 채우지만 타입이 nullable이라
    // (저장만 하고 미사용인 제품은 서버가 null을 줍니다 — types/product.ts 주석 참고)
    // 없는 값은 맨 뒤로 보냅니다.
    .sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''));

  return {
    timeSlot,
    alreadyRecorded: recordedSlots.has(timeSlot),
    routines,
    savedProducts: saved,
  };
}

// ---------------------------------------------------------------------------
// PRODUCT-02 · 제품 검색
// ---------------------------------------------------------------------------
export function searchMockProducts(keyword: string): ProductSearchResult {
  const normalized = keyword.trim().toLowerCase();
  // Phase 11-C 추가(관리자님 확인, 2026-08-13) — 직접 등록한 제품도 "DB에 저장된 전체
  // 화장품"의 일부로 취급해서 검색에 같이 나오게 합니다. 이전엔 CATALOG(고정 7종)만 봐서
  // 한 번 등록한 제품을 나중에 다시 검색해도 안 나오는 문제가 있었습니다.
  const searchPool = [...CATALOG, ...MANUAL_CATALOG];
  const matched = normalized
    ? searchPool.filter(
        (p) =>
          p.name.toLowerCase().includes(normalized) || p.brand.toLowerCase().includes(normalized)
      )
    : [];

  const products: SearchedProduct[] = matched.slice(0, 20).map((p) => ({
    ...p,
    saved: isProductSaved(p.productId),
  }));

  return { keyword, totalCount: matched.length, products };
}

// ---------------------------------------------------------------------------
// PRODUCT-08 · 루틴 바로 기록
// ---------------------------------------------------------------------------
export function recordMockRoutineQuickRecord(
  routineId: number,
  timeSlot: TimeSlot,
  force: boolean
): RoutineQuickRecordResult {
  const routine = ROUTINES.find((r) => r.routineId === routineId);
  if (!routine) {
    throw new ApiError(ErrorCode.ROUTINE_NOT_FOUND, '루틴을 찾을 수 없어요.');
  }
  if (routine.productIds.length === 0) {
    throw new ApiError(ErrorCode.ROUTINE_EMPTY, '빈 루틴은 바로 기록할 수 없어요.');
  }
  // BR3: 루틴의 timeSlot과 요청 timeSlot이 다르면 확인이 필요합니다 (차단이 아님).
  if (routine.timeSlot !== timeSlot && !force) {
    throw new ApiError(
      ErrorCode.ROUTINE_TIME_SLOT_MISMATCH,
      `${routine.timeSlot === 'MORNING' ? '모닝' : '나이트'} 루틴이에요. 그래도 기록할까요?`
    );
  }
  if (recordedSlots.has(timeSlot) && !force) {
    throw new ApiError(
      ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT,
      '이미 오늘 기록한 시간대예요. 기존 기록을 갱신할까요?'
    );
  }

  const now = new Date().toISOString();
  routine.productIds.forEach((id) => savedProducts.set(id, now));
  recordedSlots.add(timeSlot);

  return {
    recordId: Math.floor(Math.random() * 1000) + 100,
    timeSlot,
    productCount: routine.productIds.length,
    skippedProductIds: [],
    skinRecordSuggested: true,
  };
}

// ---------------------------------------------------------------------------
// PRODUCT-03 · 제품 상세 · 성분 조회
// ---------------------------------------------------------------------------

// 필러용 성분 이름 풀 — 실제 화장품 성분명을 그대로 썼습니다. 데모에서 "총 N개 성분"
// 숫자와 실제 나열되는 성분 개수를 맞추기 위한 용도라, 순서·조합에 특별한 의미는 없습니다.
const FILLER_INGREDIENTS = [
  '글리세린',
  '부틸렌글라이콜',
  '1,2-헥산다이올',
  '다이소듐이디티에이',
  '잔탄검',
  '카보머',
  '트로메타민',
  '토코페릴아세테이트',
  '알지닌',
  '베타인',
  '소듐하이알루로네이트',
  '아데노신',
  '다이메티콘',
  '페녹시에탄올',
  '에틸헥실글리세린',
  '비사보롤',
  '콜레스테롤',
  '스쿠알란',
  '다이프로필렌글라이콜',
  '카프릴릴글라이콜',
];

let nextFillerIngredientId = 1000;

interface ProductIngredientProfile {
  ingredientCount: number;
  keyIngredients: KeyIngredient[];
  /** 직접 등록(PRODUCT-08)한 제품만 채워짐 — 카메라로 찍은 사진의 로컬 URI. */
  imageUrl?: string | null;
}

// productId 82(마누카 히알루론산 토너)는 일부러 프로필에서 뺐습니다 — PRODUCT-03 BR4
// "성분 데이터가 없는 제품" 데모용입니다(오류가 아니라 200 + ingredientCount:0 + 빈 배열).
const PRODUCT_INGREDIENT_PROFILES: Record<number, ProductIngredientProfile> = {
  11: {
    ingredientCount: 32,
    keyIngredients: [
      { ingredientId: 1, name: '정제수', status: 'INSUFFICIENT' },
      { ingredientId: 2, name: '자작나무수액', status: 'GOOD', note: '50%' },
      { ingredientId: 3, name: '나이아신아마이드', status: 'GOOD' },
      { ingredientId: 4, name: '향료', status: 'CAUTION' },
    ],
  },
  12: {
    ingredientCount: 28,
    keyIngredients: [
      { ingredientId: 1, name: '정제수', status: 'INSUFFICIENT' },
      { ingredientId: 2, name: '판테놀', status: 'GOOD' },
      { ingredientId: 3, name: '알란토인', status: 'GOOD' },
      { ingredientId: 4, name: '향료', status: 'CAUTION' },
    ],
  },
  15: {
    ingredientCount: 24,
    keyIngredients: [
      { ingredientId: 1, name: '어성초추출물', status: 'GOOD', note: '70%' },
      { ingredientId: 2, name: '나이아신아마이드', status: 'GOOD' },
      { ingredientId: 3, name: '알코올', status: 'CAUTION' },
      { ingredientId: 4, name: '정제수', status: 'INSUFFICIENT' },
    ],
  },
  18: {
    ingredientCount: 20,
    keyIngredients: [
      { ingredientId: 1, name: '티타늄디옥사이드', status: 'GOOD' },
      { ingredientId: 2, name: '징크옥사이드', status: 'GOOD' },
      { ingredientId: 3, name: '알코올', status: 'CAUTION' },
      { ingredientId: 4, name: '향료', status: 'CAUTION' },
    ],
  },
  21: {
    ingredientCount: 18,
    keyIngredients: [
      { ingredientId: 1, name: '호모살레이트', status: 'CAUTION' },
      { ingredientId: 2, name: '옥토크릴렌', status: 'CAUTION' },
      { ingredientId: 3, name: '나이아신아마이드', status: 'GOOD' },
      { ingredientId: 4, name: '정제수', status: 'INSUFFICIENT' },
    ],
  },
  71: {
    ingredientCount: 22,
    keyIngredients: [
      { ingredientId: 1, name: '마데카소사이드', status: 'GOOD', note: '시카 유래' },
      { ingredientId: 2, name: '판테놀', status: 'GOOD' },
      { ingredientId: 3, name: '세라마이드엔피', status: 'GOOD' },
      { ingredientId: 4, name: '정제수', status: 'INSUFFICIENT' },
    ],
  },
};

function buildIngredientList(keyIngredients: KeyIngredient[], targetCount: number): IngredientItem[] {
  const seen = new Set<string>();
  const list: IngredientItem[] = [];

  keyIngredients.forEach((k) => {
    if (seen.has(k.name)) return;
    seen.add(k.name);
    list.push({ ingredientId: k.ingredientId, name: k.name });
  });

  let i = 0;
  while (list.length < targetCount && i < FILLER_INGREDIENTS.length) {
    const name = FILLER_INGREDIENTS[i];
    i += 1;
    if (seen.has(name)) continue;
    seen.add(name);
    list.push({ ingredientId: nextFillerIngredientId, name });
    nextFillerIngredientId += 1;
  }

  return list;
}

export function getMockProductDetail(productId: number): ProductDetailResult {
  const product = findCatalogProduct(productId);
  if (!product) {
    throw new ApiError(ErrorCode.PRODUCT_NOT_FOUND, '제품을 찾을 수 없어요.');
  }

  const profile = PRODUCT_INGREDIENT_PROFILES[productId] ?? MANUAL_PROFILES.get(productId);
  const ingredientCount = profile?.ingredientCount ?? 0;
  const keyIngredients = profile?.keyIngredients ?? [];
  const ingredients = profile ? buildIngredientList(keyIngredients, ingredientCount) : [];

  return {
    ...product,
    saved: isProductSaved(productId),
    ingredientCount,
    keyIngredients,
    ingredients,
    // 관리자님 요청(2026-08-10)으로 타입엔 자리를 만들었지만, 실제 이미지 파이프라인·백엔드
    // 필드가 아직 없어서 카탈로그 제품은 항상 null입니다 — ProductCard와 같은 "항상
    // placeholder" 패턴. 직접 등록(PRODUCT-08)한 제품만 촬영한 사진이 실제로 채워집니다.
    imageUrl: profile?.imageUrl ?? null,
  };
}

// ---------------------------------------------------------------------------
// PRODUCT-04 · 제품 스캔
// ---------------------------------------------------------------------------

export type MockScanScenario = 'SUCCESS' | 'NOT_DETECTED' | 'LOW_QUALITY' | 'UNAVAILABLE';

// 데모 최대 리스크 구간(로드맵 명시) — 실기기 스캔 인식률을 사전에 보장할 수 없어서,
// DevResetButton에서 강제로 시나리오를 바꿔볼 수 있게 했습니다. 기본은 항상 성공입니다.
let scanScenario: MockScanScenario = 'SUCCESS';

export function setMockScanScenario(scenario: MockScanScenario): void {
  scanScenario = scenario;
}

export function getMockScanScenario(): MockScanScenario {
  return scanScenario;
}

// 모드별로 다른 제품을 인식한 것처럼 보여줘서 두 모드가 실제로 다르게 동작한다는 걸
// 확인할 수 있게 했습니다. BARCODE 쪽은 api_명세서.md PRODUCT-04 예시와 같은 productId(15)를 씁니다.
//
// ⚠️ 2026-08-18 — PRODUCT_IMAGE는 **실서버에서 동작하지 않습니다**(백엔드에 인식 로직
// 없음). 목업만 성공을 돌려주면 "목업에선 되는데 실서버에선 안 되는" 상태가 되어,
// 스캔이 100% 실패했던 이번 버그가 연동 전까지 안 드러났던 것과 똑같은 함정이 됩니다.
// 그래서 목업도 실서버와 같은 에러를 냅니다. 화면은 이 모드를 서버로 보내기 전에
// 안내로 막고 있어 정상 흐름에선 도달하지 않지만, 카탈로그 등에서 직접 호출할 때를
// 대비한 안전망입니다. 백엔드가 구현하면 이 분기를 지우면 됩니다.
const SCAN_DEMO_PRODUCT_ID: Record<ScanMode, number> = {
  BARCODE: 15,
  PRODUCT_IMAGE: 18,
};

export function scanMockProduct(scanMode: ScanMode): ScanResult {
  if (scanMode === 'PRODUCT_IMAGE') {
    throw new ApiError(
      ErrorCode.SCAN_SERVICE_UNAVAILABLE,
      '상품 사진으로 찾는 기능은 아직 준비 중이에요. 바코드를 스캔하거나 제품명으로 검색해 주세요.'
    );
  }
  if (scanScenario === 'NOT_DETECTED') {
    throw new ApiError(ErrorCode.SCAN_PRODUCT_NOT_DETECTED, '제품을 인식하지 못했어요.');
  }
  if (scanScenario === 'LOW_QUALITY') {
    throw new ApiError(
      ErrorCode.SCAN_LOW_IMAGE_QUALITY,
      '화질이 낮아 인식할 수 없어요. 다시 촬영해 주세요.'
    );
  }
  if (scanScenario === 'UNAVAILABLE') {
    throw new ApiError(
      ErrorCode.SCAN_SERVICE_UNAVAILABLE,
      '스캔 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.'
    );
  }

  const productId = SCAN_DEMO_PRODUCT_ID[scanMode];
  const product = findCatalogProduct(productId);
  if (!product) {
    throw new ApiError(ErrorCode.PRODUCT_NOT_FOUND, '인식했지만 제품 정보를 찾을 수 없어요.');
  }

  return {
    productId: product.productId,
    name: product.name,
    brand: product.brand,
    // BR2: confidence는 PRODUCT_IMAGE 모드에서만 유효. BARCODE는 항상 1.0.
    confidence: scanMode === 'BARCODE' ? 1.0 : 0.94,
  };
}

// ---------------------------------------------------------------------------
// PRODUCT-05 · 제품 기록 저장 (S-14 "기록 완료")
// ---------------------------------------------------------------------------
export function saveMockProductRecord(
  timeSlot: TimeSlot,
  productIds: number[],
  force: boolean
): SaveProductRecordResult {
  if (productIds.length === 0) {
    throw new ApiError(ErrorCode.PRODUCT_RECORD_EMPTY, '기록할 제품이 없어요.');
  }
  if (productIds.length > 30) {
    throw new ApiError(
      ErrorCode.PRODUCT_RECORD_LIMIT_EXCEEDED,
      '한 번에 최대 30개까지 기록할 수 있어요.'
    );
  }
  const hasMissingProduct = productIds.some((id) => !findCatalogProduct(id));
  if (hasMissingProduct) {
    throw new ApiError(ErrorCode.PRODUCT_NOT_FOUND, '존재하지 않는 제품이 포함돼 있어요.');
  }
  if (recordedSlots.has(timeSlot) && !force) {
    throw new ApiError(
      ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT,
      `이미 오늘 ${timeSlot === 'MORNING' ? '모닝' : '나이트'}에 기록한 제품이에요. 기존 기록을 갱신할까요?`
    );
  }

  const now = new Date().toISOString();
  productIds.forEach((id) => savedProducts.set(id, now));
  recordedSlots.add(timeSlot);

  return {
    recordId: Math.floor(Math.random() * 1000) + 100,
    timeSlot,
    recordedAt: now,
    productCount: productIds.length,
    skinRecordSuggested: true,
  };
}

/**
 * PRODUCT-06 · `PATCH /product-records/{recordId}` 목업 (2026-08-20 세션 21).
 *
 * 실서버 `ProductRecordService.update()`가 던지는 예외를 같은 코드로 재현합니다 —
 * 빈 배열(PRODUCT_RECORD_EMPTY), 30개 초과(PRODUCT_RECORD_LIMIT_EXCEEDED),
 * 없는 제품(PRODUCT_NOT_FOUND).
 *
 * ⚠️ 목업은 과거 날짜의 기록을 실제로 들고 있지 않습니다(`api/mock/record.ts`가 날짜
 * 규칙으로 즉석 생성). 그래서 여기서는 **검증과 부수효과만 재현**하고 저장은 하지
 * 않습니다 — 화면 흐름·에러 처리를 목업으로 확인할 수 있으면 목적은 달성됩니다.
 * 시트를 다시 열면 목업이 만든 원래 구성이 돌아오는 건 이 제약 때문이며, 실서버에서는
 * 정상적으로 남습니다.
 */
export function updateMockProductRecord(
  recordId: number,
  productIds: number[]
): SaveProductRecordResult {
  if (productIds.length === 0) {
    throw new ApiError(ErrorCode.PRODUCT_RECORD_EMPTY, '기록할 제품이 없어요.');
  }
  if (productIds.length > 30) {
    throw new ApiError(
      ErrorCode.PRODUCT_RECORD_LIMIT_EXCEEDED,
      '한 번에 최대 30개까지 기록할 수 있어요.'
    );
  }
  if (productIds.some((id) => !findCatalogProduct(id))) {
    throw new ApiError(ErrorCode.PRODUCT_NOT_FOUND, '존재하지 않는 제품이 포함돼 있어요.');
  }

  const now = new Date().toISOString();
  // 실서버 update()도 `saveUserProduct()`로 사용 시각을 갱신합니다(159~161행).
  productIds.forEach((id) => savedProducts.set(id, now));
  persistManualState();

  return {
    recordId,
    // 목업은 슬롯 정보를 들고 있지 않습니다. 호출부(수정 화면)가 자기가 아는 slot을
    // 쓰고 이 값은 보지 않으므로, 응답 형태만 맞춥니다.
    timeSlot: 'MORNING',
    recordedAt: now,
    productCount: productIds.length,
    // 수정은 이미 기록이 있는 슬롯에만 일어나므로 피부 기록 유도는 하지 않습니다.
    skinRecordSuggested: false,
  };
}

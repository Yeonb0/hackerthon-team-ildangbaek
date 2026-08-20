// src/api/queries/product.ts
//
// Phase 7-A 범위: PRODUCT-01(홈) · PRODUCT-02(검색) · PRODUCT-08(루틴 바로 기록).
// Phase 7-B 추가: PRODUCT-03(상세) · PRODUCT-04(스캔) · PRODUCT-05(개별 저장).
import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ApiError, unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import {
  buildMockProductRecordHome,
  buildProductRecordSummary,
  getMockProductDetail,
  listMockSavedProducts,
  registerMockProduct,
  saveMockProduct,
  saveMockProductRecord,
  scanMockProduct,
  searchMockProducts,
  unsaveMockProduct,
  updateMockProductRecord,
} from '@/api/mock/product';
import type { CatalogProduct } from '@/api/mock/product';
import { recordMockProductCompletion } from '@/api/mock/record';
import { ErrorCode } from '@/types/errorCodes';
import {
  LOCAL_ROUTINE_ID,
  LOCAL_ROUTINE_NAME,
  timeSlotOfLocalRoutine,
  useRoutineStore,
} from '@/store/routineStore';
import type { TimeSlot } from '@/app/routes';
import type {
  ProductDetailResult,
  ProductRecordHomeResult,
  ProductSaveResult,
  ProductSearchResult,
  RegisterProductInput,
  RoutineListItem,
  RoutineQuickRecordResult,
  SavedProductSummary,
  SaveProductRecordResult,
  ScanMode,
  ScanResult,
} from '@/types/product';

/** PRODUCT-01 · GET /product-records/home?timeSlot= (S-11) */
export async function getProductRecordHome(timeSlot: TimeSlot): Promise<ProductRecordHomeResult> {
  if (USE_MOCK) {
    return buildMockProductRecordHome(timeSlot);
  }
  return unwrap<ProductRecordHomeResult>(
    apiClient.get('/product-records/home', { params: { timeSlot } })
  );
}

/**
 * `enabled`는 2026-08-20(세션 21)에 추가했습니다 — RoutineEditScreen이 **기록 수정
 * 모드일 때만** 이 목록을 씁니다(추가한 제품의 이름 조회). 루틴 모드에서 불필요한
 * 요청이 나가지 않도록 기본값 true로 두고 호출부가 끕니다.
 */
export function useProductRecordHome(timeSlot: TimeSlot, enabled = true) {
  return useQuery({
    queryKey: ['productRecordHome', timeSlot],
    queryFn: () => getProductRecordHome(timeSlot),
    enabled,
  });
}

/**
 * PRODUCT-02 · GET /products?keyword= (S-12)
 * 검색어 검증(1~20자, 공백만 입력 시 요청 안 함)은 useProductSearch의 enabled에서 처리합니다.
 */
export async function searchProducts(keyword: string): Promise<ProductSearchResult> {
  if (USE_MOCK) {
    return searchMockProducts(keyword);
  }
  return unwrap<ProductSearchResult>(apiClient.get('/products', { params: { keyword } }));
}

export function useProductSearch(keyword: string) {
  const trimmed = keyword.trim();
  return useQuery({
    queryKey: ['productSearch', trimmed],
    queryFn: () => searchProducts(trimmed),
    enabled: trimmed.length >= 1 && trimmed.length <= 20,
    // 2026-08-20 — 검색어가 바뀔 때마다 queryKey가 바뀌면서 data가 undefined로 떨어지고,
    // 화면이 그 한 틱을 "결과 없음/실패"로 오인해 리스트가 깜빡였습니다.
    // 이전 검색어 결과를 그대로 들고 있다가 새 결과가 오면 교체합니다
    // (직전 결과인지 여부는 호출부에서 isPlaceholderData로 구분 가능).
    placeholderData: keepPreviousData,
  });
}

/** PRODUCT-08 · POST /routines/{routineId}/records (S-11 루틴 바로 기록) */
export async function quickRecordRoutine(params: {
  routineId: number;
  timeSlot: TimeSlot;
  force?: boolean;
}): Promise<RoutineQuickRecordResult> {
  const { routineId, timeSlot, force = false } = params;

  // ⚠️ 2026-08-19(세션 18) — `POST /routines/{id}/records`를 **더 이상 쓰지 않습니다.**
  // 루틴이 서버에 존재하지 않아(store/routineStore.ts 주석 참고) 그 경로는 반드시
  // ROUTINE_NOT_FOUND로 떨어집니다.
  //
  // 대신 루틴이 들고 있는 productIds를 그대로 제품 기록 저장으로 보냅니다.
  // **저장 결과는 동일합니다** — 백엔드 `RoutineService.quickRecord()`도 결국
  // `productRecordService.saveProducts(...)`를 호출하고, 차이는 `SourceType`이
  // ROUTINE이냐 MANUAL이냐 뿐입니다(현재 어느 화면도 이 값을 읽지 않습니다).
  //
  // 목업/실서버 분기 **앞에서** 제품을 뽑습니다 — 루틴은 이제 양쪽 모드 모두
  // 같은 로컬 스토어에서 오기 때문입니다.
  const slot = timeSlotOfLocalRoutine(routineId);
  if (!slot) {
    throw new ApiError(ErrorCode.ROUTINE_NOT_FOUND, '루틴을 찾을 수 없어요.');
  }
  const productIds = useRoutineStore.getState().products[slot];
  if (productIds.length === 0) {
    // 백엔드 ROUTINE_EMPTY와 같은 상황을 같은 코드로 재현합니다.
    throw new ApiError(ErrorCode.ROUTINE_EMPTY, '루틴에 담긴 제품이 없어요.');
  }

  const saved = await saveProductRecord({ timeSlot, productIds, force });
  return {
    recordId: saved.recordId,
    timeSlot: saved.timeSlot,
    productCount: saved.productCount,
    // 이 경로에는 "건너뛴 제품" 개념이 없습니다 — 루틴 구성이 곧 요청 목록입니다.
    skippedProductIds: [],
    skinRecordSuggested: saved.skinRecordSuggested,
  };
}

export function useRoutineQuickRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: quickRecordRoutine,
    onSuccess: (_data, variables) => {
      // 홈 화면 alreadyRecorded·저장 제품 lastUsedAt이 바뀌므로 무효화해서 다시 받습니다.
      queryClient.invalidateQueries({ queryKey: ['productRecordHome', variables.timeSlot] });
      // 기록 허브(S-09/10)뿐 아니라 홈 화면(useHome — todayRecord·밤 홈 주간 캘린더)도 오늘
      // 완료 여부를 캐시해서 보여줍니다. AnalyzingSkinScreen이 피부 기록 성공 후 하는 것과
      // 동일한 이유(관리자님 실기기 확인, 2026-08-10: 기록 허브 캘린더는 반영되는데 밤 홈
      // 캘린더는 안 바뀌던 버그 — home.ts가 todayRecord/weeklyCalendar를 별도 고정값으로
      // 갖고 있었던 게 원인이라, 쿼리 자체도 같이 무효화해야 합니다).
      queryClient.invalidateQueries({ queryKey: ['recordToday'] });
      queryClient.invalidateQueries({ queryKey: ['recordCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

/** PRODUCT-03 · GET /products/{productId} (S-14) */
export async function getProductDetail(productId: number): Promise<ProductDetailResult> {
  if (USE_MOCK) {
    return getMockProductDetail(productId);
  }
  return unwrap<ProductDetailResult>(apiClient.get(`/products/${productId}`));
}

export function useProductDetail(productId: number) {
  return useQuery({
    queryKey: ['productDetail', productId],
    queryFn: () => getProductDetail(productId),
    // 2026-08-19 — S-11의 등록 시트가 "아직 제품을 안 골랐다"를 0으로 표현합니다.
    // 이 가드가 없으면 `GET /products/0`이 나가서 404가 계속 찍힙니다.
    enabled: productId > 0,
  });
}

/**
 * PRODUCT-08 · 제품 직접 등록 (F-PRODUCT-08). `POST /products`.
 *
 * 2026-08-18 — 실API에 연결했습니다. 예전 주석은 *"백엔드에 대응 엔드포인트가 없어서
 * USE_MOCK 분기 없이 항상 목업"* 이었는데, 백엔드에 `POST /products`(multipart)가
 * 생겼습니다. 요청 필드는 처음부터 맞아떨어져서 전송 형식만 바꾸면 됐습니다.
 *
 * ⚠️ **`@ModelAttribute`라 JSON body가 아니라 multipart 폼 필드로 보내야 합니다.**
 * `@RequestPart("image")`는 선택이고(촬영 건너뛰면 생략), 나머지 필드는 폼 값입니다.
 * `ingredientNames`는 배열이라 **같은 키를 반복해서 append** 합니다 — Spring이
 * `List<String>`으로 바인딩하는 방식입니다. JSON 문자열로 넣으면 안 됩니다.
 *
 * 응답 `ProductRegisterResponse`는 `{ productId, name, brand, category, imageUrl }`이라
 * `CatalogProduct`(productId/name/brand/category)를 그대로 만족합니다 — 화면이 등록 직후
 * 이 값으로 상세·루틴 추가로 넘어가므로 형태를 유지했습니다.
 */
export async function registerProduct(input: RegisterProductInput): Promise<CatalogProduct> {
  if (USE_MOCK) {
    return registerMockProduct(input);
  }

  const form = new FormData();
  form.append('name', input.name);
  form.append('brand', input.brand);
  form.append('category', input.category);
  // 빈 문자열이 섞이면 백엔드에서 빈 성분이 만들어지므로 화면단 파싱 결과를 한 번 더 거릅니다.
  input.ingredientNames
    .map((n) => n.trim())
    .filter(Boolean)
    .forEach((name) => form.append('ingredientNames', name));

  if (input.imageUri) {
    form.append('image', {
      uri: input.imageUri,
      name: 'product.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  const created = await unwrap<CatalogProduct>(apiClient.post('/products', form));

  // ⚠️ 2026-08-19(세션 18, 관리자님 리포트 "제품 추가해도 저장된 제품에 안 보여")
  //
  // 백엔드 `ProductService.registerProduct()`는 **`Product`만 만들고 `UserProduct`는
  // 만들지 않습니다**(151~204행 확인 — 성분까지 저장하고 바로 응답을 조립합니다).
  // 그런데 "저장된 제품" 목록은 `UserProduct`에서 옵니다:
  //   · `GET /product-records/home` → `userProductRepository.findAllByUserId...`
  //   · `GET /users/me/products`     → 같은 테이블에서 usageStatus=USING만
  // 그래서 직접 등록한 제품은 등록에 성공해도 어떤 목록에도 뜨지 않았습니다.
  //
  // 등록 직후 저장을 이어 붙여 사용자 소유로 만듭니다. 백엔드가 registerProduct 안에서
  // UserProduct까지 만들어 주면 이 호출은 멱등이라 그대로 둬도 무해합니다.
  await saveProductToLibrary(created.productId);
  return created;
}

/**
 * PRODUCT-?? · `GET /products/match?name=&brand=` — 이름+브랜드로 기존 제품 찾기.
 *
 * 2026-08-19(세션 20) 신설. 백엔드에 이미 있는데 프론트가 안 쓰던 엔드포인트입니다
 * (ProductController.match). 직접 등록(S-13) 전에 한 번 물어보면 같은 제품이 계정마다
 * 중복 생성되는 걸 막고, 매칭된 경우 서버가 이미 가진 성분 목록까지 쓸 수 있습니다.
 *
 * ⚠️ 실패해도 등록을 막지 않습니다 — 이 조회는 편의 기능이라, 네트워크 오류로
 * "등록 자체가 안 되는" 상황을 만들면 안 됩니다. 호출부에서 notMatched로 폴백합니다.
 *
 * 목업은 항상 matched=false입니다. 목업 카탈로그는 세션 한정이라 "이미 있는 제품"을
 * 흉내 내면 초기화 시점에 따라 결과가 달라져서 테스트가 오히려 헷갈립니다.
 */
export interface ProductMatchResult {
  matched: boolean;
  productId: number | null;
  category: string | null;
  ingredients: string[];
}

export async function matchProduct(name: string, brand: string): Promise<ProductMatchResult> {
  if (USE_MOCK) {
    return { matched: false, productId: null, category: null, ingredients: [] };
  }
  return unwrap<ProductMatchResult>(
    apiClient.get('/products/match', { params: { name, brand } }),
  );
}

export function useRegisterProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerProduct,
    // 2026-08-19 — 등록이 곧 "저장된 제품" 목록 변경입니다(위 registerProduct 주석 참고).
    // 무효화가 없어서 등록 후 S-11로 돌아가도 목록이 갱신 전 캐시였습니다.
    onSuccess: () => invalidateProductLibrary(queryClient),
  });
}

/**
 * Phase 11-C 추가(관리자님 요청, 2026-08-13) — 등록한 제품을 특정 루틴에 바로 추가.
 * 루틴 수정 API가 없어서 registerProduct와 마찬가지로 항상 목업입니다.
 */
export async function addProductToRoutineRequest(input: {
  routineId: number;
  productId: number;
}): Promise<void> {
  const slot = timeSlotOfLocalRoutine(input.routineId);
  if (!slot) {
    // 로컬 루틴 ID가 아닌 값이 들어오면 조용히 넘기지 않고 드러냅니다 — 서버 루틴이
    // 다시 생겼는데 이 경로가 안 바뀐 상황을 잡기 위한 안전망입니다.
    throw new ApiError(ErrorCode.ROUTINE_NOT_FOUND, '루틴을 찾을 수 없어요.');
  }
  useRoutineStore.getState().addProduct(slot, input.productId);
}

/** 루틴에서 제품 빼기(RoutineEditScreen). 저장 제품 목록 자체는 건드리지 않습니다. */
export async function removeProductFromRoutineRequest(input: {
  routineId: number;
  productId: number;
}): Promise<void> {
  const slot = timeSlotOfLocalRoutine(input.routineId);
  if (!slot) {
    throw new ApiError(ErrorCode.ROUTINE_NOT_FOUND, '루틴을 찾을 수 없어요.');
  }
  useRoutineStore.getState().removeProduct(slot, input.productId);
}

export function useRemoveProductFromRoutine() {
  return useMutation({ mutationFn: removeProductFromRoutineRequest });
}

export function useAddProductToRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addProductToRoutineRequest,
    // Phase 11-C 버그 수정(관리자님 실기기 확인, 2026-08-14) — 이 무효화가 빠져 있어서,
    // 루틴에 제품을 추가해도 이미 화면에 떠 있던 "자주 쓰는 루틴" 카드·기록 허브가
    // 갱신 전 캐시를 계속 보여줬습니다(quickRecordRoutine·saveProductRecord와 같은 패턴).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['productRecordHome'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

/**
 * PRODUCT-09 · `POST /products/{productId}/save` (2026-08-19 세션 18 신설).
 *
 * 관리자님 4번 항목(A안) — 스캔한 제품을 **루틴에 넣지 않고도** 제품 목록에 담습니다.
 * 15번(루틴이 하나도 없으면 제품 추가 자체가 막히던 문제)도 이 경로로 풀립니다:
 * `useAddProductToRoutine`은 백엔드에 대응 API가 없어 100% 목업이라, 루틴이 없는
 * 신규 사용자에게는 **실제로 서버에 남는 유일한 저장 경로**가 이쪽입니다.
 *
 * 백엔드는 멱등입니다 — 이미 저장된 제품을 다시 저장해도 오류가 아닙니다.
 */
export async function saveProductToLibrary(productId: number): Promise<ProductSaveResult> {
  if (USE_MOCK) {
    return saveMockProduct(productId);
  }
  return unwrap<ProductSaveResult>(apiClient.post(`/products/${productId}/save`));
}

/**
 * PRODUCT-09 · `DELETE /products/{productId}/save` (관리자님 3번 항목).
 *
 * 물리 삭제가 아니라 백엔드 `UserProduct.stopUsing()`입니다 — 과거 기록은 그대로 남고
 * "저장된 제품" 목록에서만 빠집니다. **저장돼 있지 않은 제품을 지우면 404**가 납니다.
 */
export async function unsaveProductFromLibrary(productId: number): Promise<ProductSaveResult> {
  if (USE_MOCK) {
    return unsaveMockProduct(productId);
  }
  return unwrap<ProductSaveResult>(apiClient.delete(`/products/${productId}/save`));
}

/**
 * 저장/삭제 후 무효화 대상. `productRecordHome`(S-11 저장된 제품 목록)과
 * `productDetail`(S-14의 `saved` 배지)이 핵심이고, `routines`·`home`은 루틴 카드의
 * 제품 수 요약이 영향을 받을 수 있어 함께 털어냅니다.
 */
function invalidateProductLibrary(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['productRecordHome'] });
  // 2026-08-19 — 이게 빠져 있어서, 제품을 담아도 루틴 카드가 이름을 못 찾아
  // "아직 담긴 제품이 없어요"로 남아 있었습니다(useRoutines가 이 캐시로 이름을 붙입니다).
  queryClient.invalidateQueries({ queryKey: ['savedProducts'] });
  queryClient.invalidateQueries({ queryKey: ['productDetail'] });
  queryClient.invalidateQueries({ queryKey: ['routines'] });
  queryClient.invalidateQueries({ queryKey: ['home'] });
}

export function useSaveProductToLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveProductToLibrary,
    onSuccess: () => invalidateProductLibrary(queryClient),
  });
}

export function useUnsaveProductFromLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsaveProductFromLibrary,
    onSuccess: () => invalidateProductLibrary(queryClient),
  });
}

/**
 * PRODUCT-04 · POST /products/scan (S-13).
 *
 * ⚠️ **2026-08-18 전면 수정.** 백엔드에 이 경로가 **두 개**입니다.
 *
 * | Content-Type | 동작 |
 * | --- | --- |
 * | `application/json` (`{ scanMode, barcode }`) | 실제로 제품을 조회 |
 * | `multipart/form-data` (이미지) | **무조건 `SCAN_SERVICE_UNAVAILABLE`** |
 *
 * 이전 구현은 모드와 무관하게 **이미지 쪽**으로 보내고 있어서, 실서버에서는 스캔이
 * 100% 실패했습니다(목업에서는 정상이라 드러나지 않았습니다). 백엔드
 * `ProductService.scan(ScanMode, MultipartFile)`은 *"이미지에서 바코드를 디코딩하거나
 * 상품을 인식하는 비전 로직이 아직 없다"* 며 예외만 던집니다.
 *
 * 바코드 문자열은 이미 클라이언트가 갖고 있습니다 — `expo-camera`의 `onBarcodeScanned`가
 * 디코딩된 값을 주는데, 예전엔 그걸 버리고 굳이 사진을 찍어 올렸습니다. 이제 그 문자열을
 * 그대로 JSON으로 보냅니다. **촬영·리사이즈 단계가 사라져 스캔이 눈에 띄게 빨라집니다.**
 *
 * `PRODUCT_IMAGE` 모드는 백엔드에 인식 로직 자체가 없어 **연동해도 동작하지 않습니다.**
 * 호출부(S-13)가 이 모드를 서버로 보내지 않고 화면에서 안내로 막습니다 — 여기서도
 * 방어적으로 거부해서, 다른 진입점이 생겨도 무의미한 요청이 나가지 않게 합니다.
 */
export async function scanProduct(params: {
  scanMode: ScanMode;
  /** BARCODE 모드에서 `expo-camera`가 디코딩한 문자열. PRODUCT_IMAGE에는 없습니다. */
  barcode?: string;
}): Promise<ScanResult> {
  const { scanMode, barcode } = params;
  if (USE_MOCK) {
    return scanMockProduct(scanMode);
  }

  if (scanMode !== 'BARCODE' || !barcode) {
    // 백엔드가 명시적으로 미지원 선언한 조합. 서버까지 갔다가 같은 코드로 돌아올 뿐이라
    // 왕복을 아끼고 여기서 같은 에러를 만듭니다(화면 처리 경로는 동일).
    throw new ApiError(
      ErrorCode.SCAN_SERVICE_UNAVAILABLE,
      '이 방식은 아직 준비 중이에요. 바코드로 스캔하거나 검색을 이용해 주세요.'
    );
  }

  return unwrap<ScanResult>(apiClient.post('/products/scan', { scanMode, barcode }));
}

export function useScanProduct() {
  return useMutation({ mutationFn: scanProduct });
}

/** PRODUCT-05 · POST /product-records (S-14 "기록 완료") */
export async function saveProductRecord(params: {
  timeSlot: TimeSlot;
  productIds: number[];
  force?: boolean;
}): Promise<SaveProductRecordResult> {
  const { timeSlot, productIds, force = false } = params;
  if (USE_MOCK) {
    const result = saveMockProductRecord(timeSlot, productIds, force);
    // 루틴 바로 기록(quickRecordRoutine)과 동일한 이유 — 기록 허브·홈 화면 mock이 별도
    // 모듈이라 저장 성공 사실을 여기서 직접 넘겨줘야 합니다.
    recordMockProductCompletion(timeSlot, buildProductRecordSummary(productIds));
    return result;
  }
  return unwrap<SaveProductRecordResult>(
    apiClient.post('/product-records', { timeSlot, productIds, force })
  );
}

/**
 * PRODUCT-06 · `PATCH /product-records/{recordId}` (2026-08-20 세션 21 신설).
 *
 * 월간 기록 시트의 "수정"에서만 씁니다. 백엔드에는 진작 있었는데
 * (`ProductRecordController.update`) 프론트가 안 붙이고 있던 API입니다.
 *
 * ⚠️ **전체 교체입니다.** 서버가 `deleteAllByProductRecordId`로 기존 항목을 전부 지우고
 * 받은 `productIds`로 다시 씁니다(`ProductRecordService:156`). 즉 요청에서 빠진 제품은
 * 그 기록에서 사라집니다 — 호출부는 반드시 **바꾼 뒤의 최종 목록 전체**를 보내야 합니다.
 *
 * 빈 배열은 서버가 `@NotEmpty`로 막습니다(400). 화면에서 미리 막아 주세요.
 */
export async function updateProductRecord(params: {
  recordId: number;
  productIds: number[];
}): Promise<SaveProductRecordResult> {
  const { recordId, productIds } = params;
  if (USE_MOCK) {
    return updateMockProductRecord(recordId, productIds);
  }
  return unwrap<SaveProductRecordResult>(
    apiClient.patch(`/product-records/${recordId}`, { productIds })
  );
}

export function useUpdateProductRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProductRecord,
    onSuccess: () => {
      // 저장(useSaveProductRecord)과 같은 무효화 세트에 `recordDayDetail`을 더합니다 —
      // 수정하고 시트로 돌아왔을 때 방금 바꾼 구성이 그대로 보여야 합니다.
      // timeSlot을 모르므로(수정은 과거 슬롯 대상) productRecordHome은 키 전체를 무효화합니다.
      queryClient.invalidateQueries({ queryKey: ['recordDayDetail'] });
      queryClient.invalidateQueries({ queryKey: ['productRecordHome'] });
      queryClient.invalidateQueries({ queryKey: ['recordToday'] });
      queryClient.invalidateQueries({ queryKey: ['recordCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

/**
 * PRODUCT-10 · `GET /users/me/products` — 사용자가 저장한 제품 전체.
 *
 * 2026-08-19(세션 18) 신설. 백엔드에 이미 있던 엔드포인트인데 프론트가 안 쓰고
 * 있었습니다. 로컬 루틴(routineStore)이 productId만 들고 있어서, 루틴 안에 제품
 * **이름**을 그리려면 이 목록이 필요합니다.
 *
 * `GET /product-records/home`의 savedProducts와 내용이 겹치지만 그쪽은 timeSlot이
 * 필수라 루틴 조회 같은 시간대 무관 화면에서 쓰기에 맞지 않습니다.
 */
export async function getSavedProducts(): Promise<SavedProductSummary[]> {
  if (USE_MOCK) {
    return listMockSavedProducts();
  }
  return unwrap<SavedProductSummary[]>(apiClient.get('/users/me/products'));
}

export function useSavedProducts() {
  return useQuery({
    queryKey: ['savedProducts'],
    queryFn: getSavedProducts,
  });
}

/**
 * PRODUCT-07 · 루틴 목록.
 *
 * ⚠️ **2026-08-19(세션 18) 전면 변경 — 더 이상 `GET /routines`를 부르지 않습니다.**
 *
 * 백엔드에 루틴을 **만드는 코드 경로가 아예 없습니다**(`routineRepository.save` 0건,
 * `Routine.builder()` 0건, 생성 엔드포인트 없음, 운영 시드 SQL 없음). 그래서 실서버
 * 계정에서 `GET /routines`는 항상 빈 배열이고, 루틴 UI가 전부 사라졌습니다. 그동안
 * 목업에 루틴이 하드코딩돼 있어 이 사실이 가려져 있었습니다.
 *
 * 관리자님 A안 결정에 따라 **루틴 2개(모닝·나이트)를 클라이언트가 소유**합니다.
 * 제품이 0개여도 루틴은 항상 존재하고, 사용자는 그 안에서 제품을 넣고 뺍니다.
 * 자세한 배경은 `store/routineStore.ts` 상단 주석을 참고하세요.
 *
 * 이 훅은 react-query가 아니라 **Zustand 구독 + 저장 제품 조회 조합**입니다.
 * 그래서 호출부에서 `queryClient.invalidateQueries(['routines'])`를 해도 이 값은
 * 바뀌지 않습니다 — 스토어가 바뀌면 즉시 리렌더되므로 무효화 자체가 필요 없습니다.
 * (기존 호출부의 무효화 코드는 그대로 둬도 무해합니다.)
 *
 * 백엔드에 루틴 API가 생기면 이 함수 안에서 서버 응답을 우선 쓰도록만 바꾸면 됩니다 —
 * 화면 코드는 `RoutineListItem`만 보므로 손댈 필요가 없습니다.
 */
export function useRoutines(timeSlot?: TimeSlot) {
  const products = useRoutineStore((s) => s.products);
  const hydrated = useRoutineStore((s) => s.hydrated);
  const pruneMissing = useRoutineStore((s) => s.pruneMissing);
  const savedQuery = useSavedProducts();

  const savedProducts = savedQuery.data;

  // 2026-08-19(세션 20) — 앱 시작 후 저장 제품 목록을 처음 받은 시점에, 그 목록에 없는
  // 루틴 항목을 한 번 걷어냅니다. 계정/목업 전환 후에도 기기에 남아 있던 옛 productId가
  // "알 수 없는 제품"으로 보이던 문제입니다. 1회 제한과 이유는 routineStore 주석 참고.
  useEffect(() => {
    if (!hydrated || !savedProducts) return;
    pruneMissing(savedProducts.map((p) => p.productId));
  }, [hydrated, savedProducts, pruneMissing]);

  const nameById = new Map<number, string>(
    (savedProducts ?? []).map((p) => [p.productId, p.name])
  );

  const build = (slot: TimeSlot): RoutineListItem => {
    const ids = products[slot];
    return {
      routineId: LOCAL_ROUTINE_ID[slot],
      name: LOCAL_ROUTINE_NAME[slot],
      timeSlot: slot,
      productCount: ids.length,
      // 저장 제품 목록이 아직 안 왔거나 그 사이 제품이 삭제됐으면 이름을 모릅니다.
      // 그 항목만 빼고 그립니다 — productCount는 루틴이 들고 있는 실제 개수 그대로라
      // 목록 길이와 잠깐 어긋날 수 있지만, 없는 이름을 지어내는 것보다 낫습니다.
      // 2026-08-19 버그 수정(관리자님 리포트 "루틴에 제품이 있는데 없다고 나옴") —
      // 예전엔 이름을 못 찾은 제품을 **목록에서 통째로 빼버려서**, 저장 제품 캐시가
      // 아직 안 왔거나 어긋난 사이 루틴이 비어 보였습니다. 게다가 목록에서 사라지면
      // 루틴 수정 화면에서 지울 수도 없어 유령 제품이 남습니다.
      // 이제 항상 남기고 이름만 자리표시자로 대체합니다.
      products: ids.map((productId) => ({
        productId,
        name: nameById.get(productId) ?? '알 수 없는 제품',
      })),
    };
  };

  const all = timeSlot ? [build(timeSlot)] : [build('MORNING'), build('NIGHT')];

  return {
    data: all,
    // 저장소 복원 전이거나 제품 이름을 아직 못 받았으면 로딩으로 봅니다 — 그래야
    // "루틴이 비었다"가 잠깐 스쳐 지나가지 않습니다.
    isLoading: !hydrated || savedQuery.isLoading,
    isError: savedQuery.isError,
    refetch: savedQuery.refetch,
  };
}

export function useSaveProductRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveProductRecord,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productRecordHome', variables.timeSlot] });
      queryClient.invalidateQueries({ queryKey: ['recordToday'] });
      queryClient.invalidateQueries({ queryKey: ['recordCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}
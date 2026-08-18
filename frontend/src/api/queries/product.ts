// src/api/queries/product.ts
//
// Phase 7-A 범위: PRODUCT-01(홈) · PRODUCT-02(검색) · PRODUCT-08(루틴 바로 기록).
// Phase 7-B 추가: PRODUCT-03(상세) · PRODUCT-04(스캔) · PRODUCT-05(개별 저장).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ApiError, unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import {
  addProductToRoutine,
  buildMockProductRecordHome,
  buildProductRecordSummary,
  buildRoutineRecordSummary,
  getMockProductDetail,
  listMockRoutines,
  recordMockRoutineQuickRecord,
  registerMockProduct,
  saveMockProductRecord,
  scanMockProduct,
  searchMockProducts,
} from '@/api/mock/product';
import type { CatalogProduct } from '@/api/mock/product';
import { recordMockProductCompletion } from '@/api/mock/record';
import { ErrorCode } from '@/types/errorCodes';
import type { TimeSlot } from '@/app/routes';
import type {
  ProductDetailResult,
  ProductRecordHomeResult,
  ProductSearchResult,
  RegisterProductInput,
  RoutineListItem,
  RoutineQuickRecordResult,
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

export function useProductRecordHome(timeSlot: TimeSlot) {
  return useQuery({
    queryKey: ['productRecordHome', timeSlot],
    queryFn: () => getProductRecordHome(timeSlot),
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
  });
}

/** PRODUCT-08 · POST /routines/{routineId}/records (S-11 루틴 바로 기록) */
export async function quickRecordRoutine(params: {
  routineId: number;
  timeSlot: TimeSlot;
  force?: boolean;
}): Promise<RoutineQuickRecordResult> {
  const { routineId, timeSlot, force = false } = params;
  if (USE_MOCK) {
    const result = recordMockRoutineQuickRecord(routineId, timeSlot, force);
    // 기록 허브(useRecordToday) mock이 별도 모듈(api/mock/record.ts)이라 저장 성공 사실이
    // 저절로 안 넘어갑니다 — skin.ts의 recordMockSkinCompletion과 동일한 이유·동일한 패턴.
    recordMockProductCompletion(timeSlot, buildRoutineRecordSummary(routineId));
    return result;
  }
  return unwrap<RoutineQuickRecordResult>(
    apiClient.post(`/routines/${routineId}/records`, { timeSlot, force })
  );
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

  return unwrap<CatalogProduct>(apiClient.post('/products', form));
}

export function useRegisterProduct() {
  return useMutation({ mutationFn: registerProduct });
}

/**
 * Phase 11-C 추가(관리자님 요청, 2026-08-13) — 등록한 제품을 특정 루틴에 바로 추가.
 * 루틴 수정 API가 없어서 registerProduct와 마찬가지로 항상 목업입니다.
 */
export async function addProductToRoutineRequest(input: {
  routineId: number;
  productId: number;
}): Promise<void> {
  addProductToRoutine(input.routineId, input.productId);
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
 * PRODUCT-07 · GET /routines (S-11 루틴 펼치기). ProductRecordHomeResult.routines와 별도로
 * 부르는 이유는 위 types/product.ts의 RoutineListItem 주석 참고 — PRODUCT-01은 요약
 * 문자열만 주고, 실제 제품 목록(펼침 UI에 필요)은 이 API로만 옵니다.
 */
export async function getRoutines(timeSlot?: TimeSlot): Promise<RoutineListItem[]> {
  if (USE_MOCK) {
    return listMockRoutines(timeSlot);
  }
  return unwrap<RoutineListItem[]>(
    apiClient.get('/routines', { params: timeSlot ? { timeSlot } : undefined })
  );
}

export function useRoutines(timeSlot?: TimeSlot) {
  return useQuery({
    queryKey: ['routines', timeSlot ?? 'all'],
    queryFn: () => getRoutines(timeSlot),
  });
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
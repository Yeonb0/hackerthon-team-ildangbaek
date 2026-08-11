// src/api/queries/product.ts
//
// Phase 7-A 범위: PRODUCT-01(홈) · PRODUCT-02(검색) · PRODUCT-08(루틴 바로 기록).
// Phase 7-B 추가: PRODUCT-03(상세) · PRODUCT-04(스캔) · PRODUCT-05(개별 저장).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import {
  buildMockProductRecordHome,
  buildProductRecordSummary,
  buildRoutineRecordSummary,
  getMockProductDetail,
  listMockRoutines,
  recordMockRoutineQuickRecord,
  saveMockProductRecord,
  scanMockProduct,
  searchMockProducts,
} from '@/api/mock/product';
import { recordMockProductCompletion } from '@/api/mock/record';
import type { TimeSlot } from '@/app/routes';
import type {
  ProductDetailResult,
  ProductRecordHomeResult,
  ProductSearchResult,
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
 * PRODUCT-04 · POST /products/scan (S-13). scan.ts가 아니라 이 파일에 그대로 둔 이유는
 * product 도메인 전체가 지금까지 이 한 파일 구조를 유지해왔기 때문입니다(report.ts 등과
 * 같은 컨벤션). skin.ts의 createSkinRecord와 같은 이유로 USE_MOCK 분기 안에서 직접
 * FormData를 만듭니다 — multipart 요청이라 GET류 쿼리들과 패턴이 다릅니다.
 */
export async function scanProduct(params: {
  imageUri: string;
  scanMode: ScanMode;
}): Promise<ScanResult> {
  const { imageUri, scanMode } = params;
  if (USE_MOCK) {
    return scanMockProduct(scanMode);
  }

  const form = new FormData();
  form.append('image', {
    uri: imageUri,
    name: 'product.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('scanMode', scanMode);

  return unwrap<ScanResult>(apiClient.post('/products/scan', form));
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
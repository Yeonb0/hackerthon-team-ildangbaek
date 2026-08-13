// src/api/mock/mockPersistence.ts
//
// ⚠️ 목업(USE_MOCK=true) 전용입니다. 실제 백엔드에서는 온보딩 완료 여부를 서버 DB가 기억하지만,
// 목업 모드엔 서버가 없으니 "이 기기에서 목업 로그인으로 온보딩을 완료했었는지"를
// secureTokenStorage와 같은 방식(웹은 localStorage, 네이티브는 SecureStore)으로 저장해둡니다.
// 이게 없으면 브라우저 새로고침처럼 JS 런타임이 완전히 재시작될 때마다
// GET /users/me/onboarding 목업 응답이 항상 고정값(미완료)을 반환해서, 완료 후에도
// 새로고침하면 다시 온보딩으로 튕기는 문제가 생깁니다.
import { deleteItem, getItem, setItem } from '@/lib/platformStorage';

const MOCK_ONBOARDING_COMPLETED_KEY = 'skinteller.mock.onboardingCompleted';

export async function getMockOnboardingCompleted(): Promise<boolean> {
  return (await getItem(MOCK_ONBOARDING_COMPLETED_KEY)) === 'true';
}

export async function setMockOnboardingCompleted(completed: boolean): Promise<void> {
  if (completed) {
    await setItem(MOCK_ONBOARDING_COMPLETED_KEY, 'true');
  } else {
    await deleteItem(MOCK_ONBOARDING_COMPLETED_KEY);
  }
}

// ---------------------------------------------------------------------------
// Phase 11-C 추가(관리자님 실기기 확인, 2026-08-14) — 제품 직접 등록(PRODUCT-08)으로 만든
// 제품·루틴 추가가 Fast Refresh/새로고침 때마다 사라지는 문제. api/mock/product.ts의
// MANUAL_CATALOG·ROUTINES.productIds는 JS 모듈 레벨 변수라 이 파일 맨 위 설명과 똑같은
// 이유로 초기화됩니다. 위 온보딩 플래그와 같은 방식으로 저장합니다.
// ⚠️ 읽기는 비동기인데 product.ts의 조회 함수들은 동기라, 앱 시작 직후 하이드레이션이
// 끝나기 전 아주 짧은 순간에는 이전 세션에서 등록한 제품이 잠깐 안 보일 수 있습니다 —
// 데모 목적상 감수하기로 했습니다(관리자님 확인 필요하면 말씀해주세요).
// ---------------------------------------------------------------------------
const MOCK_MANUAL_PRODUCTS_KEY = 'skinteller.mock.manualProducts';

export interface PersistedManualProductsState {
  catalog: { productId: number; name: string; brand: string; category: string }[];
  profiles: Record<
    number,
    {
      ingredientCount: number;
      keyIngredients: { ingredientId: number; name: string; status: string; note?: string }[];
      imageUrl?: string | null;
    }
  >;
  nextProductId: number;
  nextIngredientId: number;
  /** routineId → 그 루틴의 현재 전체 productIds (초기값 + 직접 등록으로 추가된 것 포함) */
  routineProductIds: Record<number, number[]>;
  /** 직접 등록한 제품의 savedProducts(저장된 제품 목록) 항목 — [productId, lastUsedAtISO] */
  savedProducts: [number, string][];
}

export async function getMockManualProductsState(): Promise<PersistedManualProductsState | null> {
  const raw = await getItem(MOCK_MANUAL_PRODUCTS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedManualProductsState;
  } catch {
    return null;
  }
}

export async function setMockManualProductsState(state: PersistedManualProductsState): Promise<void> {
  await setItem(MOCK_MANUAL_PRODUCTS_KEY, JSON.stringify(state));
}

export async function clearMockManualProductsState(): Promise<void> {
  await deleteItem(MOCK_MANUAL_PRODUCTS_KEY);
}

// src/types/product.ts
//
// Product API(api_명세서.md §8) 전수 반영. Phase 7-A는 PRODUCT-01·02·08(S-11/12 대응)만
// 실제로 연결하고, PRODUCT-03·04·05(S-13/14 대응)는 7-B에서 mock/query를 붙입니다.
// 타입은 도메인 전체를 한 파일에 미리 선언해뒀습니다 — 화면 구현이 나뉘어도
// 타입 경계는 한 곳에서 관리하는 게 이 코드베이스의 기존 방식(types/report.ts 등)입니다.
import type { TimeSlot } from '@/app/routes';

/** 서버가 자유 문자열로 내려주는 카테고리(TONER, SERUM 등). 화면은 그대로 표시만 합니다. */
export type ProductCategory = string;

/**
 * 기초 화장품 12종 표준 카테고리(관리자님 확정, 2026-08-10). 백엔드에도 product.category
 * 값을 이 12개 코드 중 하나로 고정해달라고 전달 예정입니다 — 지금은 ProductCategory가
 * 여전히 자유 문자열이라(서버가 이 밖의 값을 줘도 화면이 안 깨지도록) 강제 타입으로
 * 바꾸진 않았고, 필터 칩 라벨 등 "알려진 값 매핑" 용도로 씁니다.
 */
export const PRODUCT_CATEGORIES = [
  'TONER',
  'ESSENCE',
  'SERUM',
  'AMPOULE',
  'GEL',
  'LOTION',
  'CREAM',
  'BALM',
  'OIL',
  'SUNCREAM',
  'CLEANSING',
  'MASK',
] as const;

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  TONER: '토너',
  ESSENCE: '에센스',
  SERUM: '세럼',
  AMPOULE: '앰플',
  GEL: '젤',
  LOTION: '로션',
  CREAM: '크림',
  BALM: '밤',
  OIL: '오일',
  SUNCREAM: '선크림',
  CLEANSING: '클렌징',
  MASK: '마스크',
};

export interface RoutineSummaryItem {
  routineId: number;
  name: string;
  timeSlot: TimeSlot;
  productCount: number;
  productSummary: string;
}

/** PRODUCT-07 응답의 제품 1건 — 이름만 옵니다(성분·브랜드는 필요시 PRODUCT-03으로 추가 조회). */
export interface RoutineProductItem {
  productId: number;
  name: string;
}

/**
 * PRODUCT-07 · GET /routines (S-11 루틴 펼치기). RoutineSummaryItem과 별도 타입인 이유는
 * PRODUCT-01(ProductRecordHomeResult.routines)이 productSummary 문자열만 주는 반면,
 * 이건 실제 productId+name 배열을 줘서 펼침 UI(관리자님 요청, 2026-08-10)에 씁니다.
 */
export interface RoutineListItem {
  routineId: number;
  name: string;
  timeSlot: TimeSlot;
  productCount: number;
  products: RoutineProductItem[];
}

export interface SavedProductSummary {
  productId: number;
  name: string;
  brand: string;
  category: ProductCategory;
  lastUsedAt: string;
}

/** PRODUCT-01 · GET /product-records/home?timeSlot= (S-11) */
export interface ProductRecordHomeResult {
  timeSlot: TimeSlot;
  alreadyRecorded: boolean;
  routines: RoutineSummaryItem[];
  savedProducts: SavedProductSummary[];
}

export interface SearchedProduct {
  productId: number;
  name: string;
  brand: string;
  category: ProductCategory;
  /** 이미 저장한 제품이면 true — S-12 '저장됨' 배지 */
  saved: boolean;
}

/** PRODUCT-02 · GET /products?keyword= (S-12) */
export interface ProductSearchResult {
  keyword: string;
  totalCount: number;
  products: SearchedProduct[];
}

export type IngredientStatus = 'GOOD' | 'CAUTION' | 'INSUFFICIENT';

export interface KeyIngredient {
  ingredientId: number;
  name: string;
  status: IngredientStatus;
  /** 예: "50%" — 없을 수 있음 */
  note?: string;
}

export interface IngredientItem {
  ingredientId: number;
  name: string;
}

/**
 * PRODUCT-08 · 제품 직접 등록 (F-PRODUCT-08, TBD-07). 백엔드에 이 기능 자체가 없어서
 * (api_명세서.md 전수 확인, 로그인 방식 3종에도 등록 엔드포인트 없음) 완전히 프론트 목업
 * 전용 타입입니다 — 실제 API가 생기면 그때 필드를 맞추면 됩니다.
 */
export interface RegisterProductInput {
  name: string;
  brand: string;
  category: ProductCategory;
  /** 쉼표로 구분한 자유 텍스트 입력을 화면단에서 파싱한 배열. 비어 있어도 됨(BR 안내 문구 참고) */
  ingredientNames: string[];
  /** 등록 화면에서 카메라로 찍은 제품 사진의 로컬 URI. 촬영을 건너뛰면 undefined. */
  imageUri?: string;
}

/** PRODUCT-03 · GET /products/{productId} (S-14) — 7-B에서 연결 */
export interface ProductDetailResult {
  productId: number;
  name: string;
  brand: string;
  category: ProductCategory;
  saved: boolean;
  ingredientCount: number;
  /** 주요 성분 — 최대 10건, 개인 프로파일 기준 status 포함 */
  keyIngredients: KeyIngredient[];
  ingredients: IngredientItem[];
  /**
   * 제품 사진 URL — 관리자님 요청(2026-08-10)으로 S-14에 사진 자리를 만들었습니다.
   * ⚠️ 현재 api_명세서.md PRODUCT-03 응답 예시에는 이 필드가 없습니다. 백엔드 확정 전까지는
   * 항상 null로 취급하고 자리표시자만 보여줍니다 — 확정되면 필드명만 맞춰주면 됩니다.
   */
  imageUrl?: string | null;
}

export type ScanMode = 'BARCODE' | 'PRODUCT_IMAGE';

/** PRODUCT-04 · POST /products/scan (S-13) — 7-B에서 연결 */
export interface ScanResult {
  productId: number;
  name: string;
  brand: string;
  /** PRODUCT_IMAGE 모드에서만 유효. BARCODE는 항상 1.0 */
  confidence: number;
}

/** PRODUCT-05 · POST /product-records (S-14 저장 지점) — 7-B에서 연결 */
export interface SaveProductRecordResult {
  recordId: number;
  timeSlot: TimeSlot;
  recordedAt: string;
  productCount: number;
  /** 같은 시간대 피부 기록이 없으면 true — F-PRODUCT-07 유도 카드 노출 여부 */
  skinRecordSuggested: boolean;
}

/** PRODUCT-08 · POST /routines/{routineId}/records (S-11 루틴 바로 기록) */
export interface RoutineQuickRecordResult {
  recordId: number;
  timeSlot: TimeSlot;
  productCount: number;
  skippedProductIds: number[];
  skinRecordSuggested: boolean;
}
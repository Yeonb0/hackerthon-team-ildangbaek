// src/types/user.ts
// 명세서 §5 User API(USER-01~07) + §2 AUTH-03(로그아웃) 기준.
//
// ⚠️ 로드맵(frontend-roadmap-phases.md) Phase 8은 S-24를 "정적 JSON + 로컬 필터,
// 네트워크 호출 없이"로 계획했지만, 실제 USER-05/06 명세는 서버 검색 API
// (`GET /locations?keyword=`)로 설계되어 있고 `locationId` 매핑도 서버 쪽 값입니다.
// 프론트에 자체 정적 목록을 심으면 그 지역들의 ID가 백엔드 값과 어긋날 위험이 커서
// (백엔드 명세서 자체도 "현재 지역 데이터가 샘플 6개, 전국 목록 확보 선행 필요"라고
// 명시), 이 타입들은 서버 검색 API 기준으로 작성했습니다(관리자 확인, 2026-08-11).
//
// USER-06(PATCH /users/me/location)은 GPS 좌표도 요청 본문으로 받습니다
// ("권한 허용 시 자동 갱신"). 실제 좌표 측정(expo-location)은 프론트 책임입니다 —
// GET /home이 위경도를 쿼리로 받지 않는 걸 보면, PATCH로 먼저 저장해두고 나서
// GET /home을 부르는 흐름으로 설계되어 있습니다.

// ---------------------------------------------------------------------------
// USER-01 · GET /users/me (S-23 마이페이지)
// ---------------------------------------------------------------------------

export type IngredientStatus = 'GOOD' | 'CAUTION' | 'INSUFFICIENT';

export interface TopIngredientItem {
  ingredientId: number;
  name: string;
  status: IngredientStatus;
}

export interface IngredientProfileSummary {
  /** F-ANALYSIS-05 값 그대로 — 구매 전 확인(Phase 7 CHECK) 화면과 같은 값이어야 함(BR5). */
  completionRate: number;
  goodCount: number;
  cautionCount: number;
  insufficientCount: number;
  /** 요약 노출용 최대 8건. 전체 목록은 USER-02(getIngredientProfile)를 사용. */
  topIngredients: TopIngredientItem[];
}

export interface MyPageResult {
  name: string;
  joinedDays: number;
  totalRecordCount: number;
  skinTypes: string[];
  ingredientProfile: IngredientProfileSummary;
  /** 위치 미설정이면 서버가 null을 줄 수 있음 — 명세서에 명시되어 있진 않지만 방어적으로 nullable 처리. */
  location: string | null;
  notificationEnabled: boolean;
}

// ---------------------------------------------------------------------------
// USER-02 · GET /users/me/ingredient-profile (성분 전체 보기, F-MY-03 신규 화면)
// ---------------------------------------------------------------------------

export interface IngredientListItem {
  ingredientId: number;
  name: string;
  status: IngredientStatus;
  /** INSUFFICIENT면 항상 null — 데이터 부족한 성분에 근거를 지어내지 않는다(BR1). */
  reason: string | null;
  recordCount: number;
}

export interface IngredientProfileResult {
  completionRate: number;
  ingredients: IngredientListItem[];
}

// ---------------------------------------------------------------------------
// USER-05 · GET /locations · USER-06 · PATCH /users/me/location (S-24)
// ---------------------------------------------------------------------------

export interface LocationItem {
  locationId: number;
  name: string;
  /** 사용자가 현재 설정한 지역이면 true — S-24 "현재 설정" 배지. */
  current: boolean;
}

/** (a) 지역 선택 또는 (b) GPS 좌표 — 동시 전달 시 locationId 우선(BR1). */
export type UpdateLocationInput = { locationId: number } | { latitude: number; longitude: number };

// ---------------------------------------------------------------------------
// USER-04 · PATCH /users/me/profile (프로필 수정 — Phase 8 범위는 아니지만
// 타입 경계를 한 곳에 모아두는 기존 컨벤션상 함께 선언)
// ---------------------------------------------------------------------------

export interface UpdateProfileInput {
  name?: string;
  gender?: 'MALE' | 'FEMALE';
  age?: number;
  skinTypes?: string[];
  hormoneStatus?: string;
  lastPeriodStartDate?: string;
  averageCycleDays?: number;
}

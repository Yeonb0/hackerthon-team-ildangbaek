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

import type { Gender, HormoneStatus } from '@/types/onboarding';

export type IngredientStatus = 'GOOD' | 'CAUTION' | 'INSUFFICIENT';

export interface TopIngredientItem {
  ingredientId: number;
  name: string;
  /**
   * 성분 설명 — 백엔드가 2026-08-16(`03283f8`)에 추가한 필드입니다. 세션 16까지
   * 프론트 타입에 없어서 **파싱 단계에서 그냥 버려지고 있었습니다.**
   *
   * ⚠️ 당분간 대부분 null입니다. 백엔드 `Ingredient.description`이 `@Lob`인데
   * 성분 사전 시드 데이터가 아직 없습니다 — 값이 있을 때만 그리세요.
   */
  description: string | null;
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
// GET /users/me/profile (S-23 프로필 부제 — 나이·성별)
//
// USER-01(GET /users/me)에는 나이·성별이 없습니다. Figma MyPage(59:7194)의 부제가
// "26세 · 여성 · 지성·민감성 · 서울 강남구" 형태라 이 둘이 필요한데, 백엔드
// ProfileResponse에는 이미 gender/age가 있어서 별도 요청 없이 이 엔드포인트를
// 같이 부릅니다(백엔드 UserController.getProfile 확인, 2026-08-17).
//
// ⚠️ 마이페이지가 API 두 개에 의존하게 됩니다. profile 쪽이 실패해도 화면 전체가
// 죽지 않도록 화면에서 부제만 축약해 렌더합니다.
// ---------------------------------------------------------------------------

export interface ProfileResult {
  name: string;
  gender: Gender;
  age: number | null;
  skinTypes: string[];
  hormoneStatus: HormoneStatus | null;
  lastPeriodStartDate: string | null;
  averageCycleDays: number | null;
  location: string | null;
  notificationEnabled: boolean;
}

// ---------------------------------------------------------------------------
// USER-02 · GET /users/me/ingredient-profile (성분 전체 보기, F-MY-03 신규 화면)
// ---------------------------------------------------------------------------

export interface IngredientListItem {
  ingredientId: number;
  name: string;
  /**
   * 성분 설명 — 백엔드가 2026-08-16(`03283f8`)에 추가한 필드입니다. 세션 16까지
   * 프론트 타입에 없어서 **파싱 단계에서 그냥 버려지고 있었습니다.**
   *
   * ⚠️ 당분간 대부분 null입니다. 백엔드 `Ingredient.description`이 `@Lob`인데
   * 성분 사전 시드 데이터가 아직 없습니다 — 값이 있을 때만 그리세요.
   */
  description: string | null;
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

// ---------------------------------------------------------------------------
// 회원 탈퇴 · DELETE /users/me
//
// ⚠️ 2026-08-18 정정 — 예전 주석은 "UserController에 대응 엔드포인트가 없다(2026-08-17
// 확인)"였는데 **지금은 있습니다.** `UserController.withdraw()`가 열려 있고
// `queries/user.ts`의 withdrawAccount도 이미 실API를 호출하고 있습니다 —
// 주석만 옛 상태로 남아 있었습니다.
//
// 물리 삭제가 아니라 AccountStatus.WITHDRAWN 전환입니다(명세 BR1). 전환 후에는
// CurrentUserIdArgumentResolver의 isActive 필터에 걸려 남은 토큰으로 어떤 API도
// 통과하지 못합니다.
//
// 아래 WithdrawInput은 아직 어디에도 전달하지 않습니다 — 백엔드가 요청 본문을 받지
// 않습니다(@DeleteMapping에 @RequestBody 없음). 탈퇴 사유 수집이 확정되면 그때
// 본문 스펙을 요청하면 됩니다.
// ---------------------------------------------------------------------------

export interface WithdrawInput {
  /** 탈퇴 사유(선택). 서버 스펙 미확정이라 optional로 둡니다. */
  reason?: string;
}

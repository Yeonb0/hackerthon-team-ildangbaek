// 화면 이름 상수 + 네비게이션 파라미터 타입
// 상수 옆 주석은 대응하는 화면 ID(S-XX)입니다

import type { IngredientStatus } from '@/types/user';

export const AuthRoutes = {
  Login: 'Login', // S-00 (AUTH-01)
  // Phase 11-A — 이메일 로그인/회원가입/인증 플로우 (백엔드 API 없음, 프론트 목업)
  EmailLogin: 'EmailLogin', // AUTH-03
  EmailSignup: 'EmailSignup', // AUTH-04
  PasswordSetup: 'PasswordSetup', // AUTH-05
  EmailVerification: 'EmailVerification', // AUTH-06
  VerificationSuccess: 'VerificationSuccess', // AUTH-06.1
  VerificationFail: 'VerificationFail', // AUTH-06.2
} as const;

export const OnboardingRoutes = {
  BasicInfo: 'BasicInfo', // S-01
  SkinType: 'SkinType', // S-02
  Hormone: 'Hormone', // S-04
  OnboardingComplete: 'OnboardingComplete', // S-05
  NotificationPermission: 'NotificationPermission', // S-06
} as const;

export const MainTabRoutes = {
  Home: 'Home', // S-07(낮) / S-08(밤) — 내부 상태로 분기
  Shopping: 'Shopping', // S-21
  RecordHub: 'RecordHub', // S-09(모닝) / S-10(나이트) — 내부 탭으로 분기
  Report: 'Report', // S-19
  My: 'My', // S-23
} as const;

export const DetailRoutes = {
  ProductRecord: 'ProductRecord', // S-11 / S-12 — 내부 상태로 분기 (기본 ↔ 검색 결과)
  ProductScan: 'ProductScan', // S-13
  IngredientCheck: 'IngredientCheck', // S-14 · 제품 기록 저장 지점
  PhotoGuide: 'PhotoGuide', // S-15
  FaceCapture: 'FaceCapture', // S-16 — 촬영/프리뷰·재촬영 내부 상태 (화면 구조상 별도 미리보기 화면 없음)
  AnalyzingSkin: 'AnalyzingSkin', // S-17
  SkinResult: 'SkinResult', // S-18 · 분석 결과 표시 (저장은 SKIN-01 POST 시점에 이미 완료 — TBD-10b A안)
  MetricDetail: 'MetricDetail', // S-20
  CheckResult: 'CheckResult', // S-22 · Phase 11-C부터 화면 자체는 미사용(아래 ProductDetail 참고).
  // 다른 진입점에서 재사용할 가능성을 고려해 라우트/화면 파일은 남겨둠 (관리자 확인 필요).
  // Phase 11-C — SHOP-02 제품 상세. 추천/검색/스캔 3개 진입 경로가 모두 여기로 모임(관리자 결정,
  // 2026-08-13). CHECK-02(computeCheck)를 그대로 재사용해서 성분별 사유(reason)를 보여주므로
  // 사실상 기존 CheckResult 화면의 상위 호환 — CheckResult는 이제 어디서도 navigate하지 않음.
  ProductDetail: 'ProductDetail',
  LocationSettings: 'LocationSettings', // S-24
  IngredientList: 'IngredientList', // 성분 전체 보기 (F-MY-03 신규 화면, S-23에서 진입)
  // Phase 11-B — PROD-07 루틴 수정(드래그 순서 변경). Figma 구조 기준 별도 화면으로 분리
  // (관리자 결정, 2026-08-13). S-11의 RoutineQuickRecordCard에서 "수정" 진입점으로 연결됩니다.
  RoutineEdit: 'RoutineEdit',
  // Phase 11(세션5) — 루틴 수정 전용 "제품 추가" 화면(관리자님 지시, 2026-08-15). 저장된
  // 제품 중에서 체크박스로 여러 개 골라 루틴에 한 번에 추가합니다. RoutineEditScreen의
  // "+ 제품 추가하기"에서 옴.
  RoutineAddProduct: 'RoutineAddProduct',
  // Phase 11-C — PROD-05 제품 직접 등록(F-PRODUCT-08, TBD-07). 백엔드 API 없이 프론트 목업
  // 전용(관리자 결정, 2026-08-13). ProductRecord(S-11/12)의 "제품 직접 등록" 버튼에서 옴.
  ProductManualRegister: 'ProductManualRegister',
  // Phase 11-D(2번 체크포인트) — F-RECORD-02 월간 기록(Frame 10, 210:835). RecordHub의
  // 캘린더 아이콘 버튼에서 진입, 날짜 탭하면 그 날 기록 바텀시트가 뜹니다.
  RecordCalendar: 'RecordCalendar',
  // 2026-08-17(세션 12) — S-25 장바구니(관리자님 요청). 쇼핑 화면(S-21) 우측 상단
  // 아이콘에서 진입합니다. 백엔드 API가 없어 cartStore(클라이언트 저장) 전용이고,
  // Figma에도 시안이 없습니다(요청서: docs/design-request-cart.md).
  Cart: 'Cart',
} as const;

export type TimeSlot = 'MORNING' | 'NIGHT';

export type AuthStackParamList = {
  [AuthRoutes.Login]: undefined;
  [AuthRoutes.EmailLogin]: undefined;
  [AuthRoutes.EmailSignup]: undefined;
  [AuthRoutes.PasswordSetup]: { email: string };
  [AuthRoutes.EmailVerification]: { email: string; password: string };
  [AuthRoutes.VerificationSuccess]: { email: string; password: string };
  [AuthRoutes.VerificationFail]: { email: string; password: string };
};

export type OnboardingStackParamList = {
  [OnboardingRoutes.BasicInfo]: undefined;
  [OnboardingRoutes.SkinType]: undefined;
  [OnboardingRoutes.Hormone]: undefined;
  [OnboardingRoutes.OnboardingComplete]: undefined;
  [OnboardingRoutes.NotificationPermission]: undefined;
};

export type MainTabParamList = {
  [MainTabRoutes.Home]: undefined;
  [MainTabRoutes.Shopping]: undefined;
  [MainTabRoutes.RecordHub]: { timeSlot?: TimeSlot } | undefined; // S-07/08 CTA가 진입 시점 시간대를 넘김 (F-RECORD-02 BR2)
  [MainTabRoutes.Report]: undefined;
  [MainTabRoutes.My]: undefined;
};

export type DetailStackParamList = {
  Tabs: undefined; // MainTabNavigator 내부의 탭 화면 자체
  [DetailRoutes.ProductRecord]: { timeSlot: TimeSlot };
  // Phase 7-A 수정: PRODUCT-05 저장(POST /product-records) 시 timeSlot이 필수인데
  // 기존엔 이 라우트들에 안 실려 있었습니다. S-11에서 스캔·제품 선택 시점의 시간대를
  // 여기 실어서 S-13/S-14까지 그대로 들고 가도록 고쳤습니다.
  [DetailRoutes.ProductScan]: { timeSlot: TimeSlot };
  [DetailRoutes.IngredientCheck]: { productId: number; timeSlot: TimeSlot };
  [DetailRoutes.PhotoGuide]: { timeSlot: TimeSlot };
  [DetailRoutes.FaceCapture]: { timeSlot: TimeSlot };
  // imageUri: S-16에서 촬영을 마친 로컬 파일 URI. S-17이 이 값을 압축·업로드합니다.
  [DetailRoutes.AnalyzingSkin]: { timeSlot: TimeSlot; imageUri: string };
  // date: 월간 기록(RecordCalendar) 바텀시트의 "자세히 보기"로 들어왔을 때만 실립니다.
  // 있으면 REPORT-03(GET /reports/daily)으로 그 날짜 기록을 읽고, 없으면 기존대로
  // SKIN-02(오늘)를 읽습니다. 지난 날짜로 들어온 화면은 하단 CTA가 "닫기" 하나로
  // 바뀌어 캘린더로 돌아갑니다 — "홈으로 가기"는 방금 기록을 마친 직후 흐름에 맞는
  // 문구라 지난 날짜 조회에는 맞지 않습니다(관리자 결정 A안, 2026-08-18).
  [DetailRoutes.SkinResult]: { timeSlot?: TimeSlot; date?: string };
  // REPORT-02(GET /reports/insights/{insightId}) 기준 — 화면 이름(MetricDetail)은
  // Phase 0 명명을 그대로 두지만, 실제로는 지표가 아니라 인사이트 단위로 조회합니다.
  [DetailRoutes.MetricDetail]: { insightId: number };
  [DetailRoutes.CheckResult]: { productId: number };
  // reason은 추천 카드(CHECK-01)를 통해 들어왔을 때만 있음 — 검색·스캔 진입은 생략.
  [DetailRoutes.ProductDetail]: { productId: number; reason?: string };
  [DetailRoutes.LocationSettings]: undefined;
  // initialStatus: 마이페이지 요약 카드에서 특정 배지(맞음/주의/데이터부족)를 탭해 들어온
  // 경우 그 상태로 필터를 미리 켜둡니다. 없으면 전체 목록.
  [DetailRoutes.IngredientList]: { initialStatus?: IngredientStatus } | undefined;
  [DetailRoutes.RoutineEdit]: { routineId: number };
  [DetailRoutes.RoutineAddProduct]: { routineId: number; timeSlot: TimeSlot };
  // initialKeyword: 검색결과없음(PROD-03) 경로로 들어왔을 때만 있음 — 검색어를 제품명에 prefill
  [DetailRoutes.ProductManualRegister]: {
    timeSlot: TimeSlot;
    initialKeyword?: string;
    // Phase 11(세션5) — RoutineAddProductScreen "새 제품 등록하기"에서 올 때만 실립니다.
    // 이 화면의 "루틴에 추가" 다중 선택 칩에서 해당 루틴을 미리 체크해둡니다
    // (관리자님 지시, 2026-08-15 — 루틴 수정 흐름에서 온 거니 그 루틴을 기본으로 선택).
    initialRoutineId?: number;
  };
  // Phase 11-D(2번 체크포인트) — F-RECORD-02 월간 기록. RecordHub 캘린더 아이콘에서 진입.
  [DetailRoutes.RecordCalendar]: undefined;
  // 2026-08-17(세션 12) — S-25 장바구니. 목록은 cartStore가 들고 있어서 파라미터가 없습니다.
  [DetailRoutes.Cart]: undefined;
};

// Root: Auth ↔ Onboarding ↔ Main 전체 교체 (뒤로가기로 못 돌아감)
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};
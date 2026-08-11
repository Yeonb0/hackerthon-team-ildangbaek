// 화면 이름 상수 + 네비게이션 파라미터 타입
// 상수 옆 주석은 대응하는 화면 ID(S-XX)입니다

export const AuthRoutes = {
  Login: 'Login', // S-00
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
  CheckResult: 'CheckResult', // S-22
  LocationSettings: 'LocationSettings', // S-24
} as const;

export type TimeSlot = 'MORNING' | 'NIGHT';

export type AuthStackParamList = {
  [AuthRoutes.Login]: undefined;
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
  [DetailRoutes.SkinResult]: { timeSlot?: TimeSlot };
  // REPORT-02(GET /reports/insights/{insightId}) 기준 — 화면 이름(MetricDetail)은
  // Phase 0 명명을 그대로 두지만, 실제로는 지표가 아니라 인사이트 단위로 조회합니다.
  [DetailRoutes.MetricDetail]: { insightId: number };
  [DetailRoutes.CheckResult]: { productId: number };
  [DetailRoutes.LocationSettings]: undefined;
};

// Root: Auth ↔ Onboarding ↔ Main 전체 교체 (뒤로가기로 못 돌아감)
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};
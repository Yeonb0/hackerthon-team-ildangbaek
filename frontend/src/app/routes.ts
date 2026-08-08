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
  FaceCapture: 'FaceCapture', // S-16
  AnalyzingSkin: 'AnalyzingSkin', // S-17
  SkinResult: 'SkinResult', // S-18 · 피부 기록 저장 지점
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
  [MainTabRoutes.RecordHub]: undefined;
  [MainTabRoutes.Report]: undefined;
  [MainTabRoutes.My]: undefined;
};

export type DetailStackParamList = {
  Tabs: undefined; // MainTabNavigator 내부의 탭 화면 자체
  [DetailRoutes.ProductRecord]: undefined;
  [DetailRoutes.ProductScan]: undefined;
  [DetailRoutes.IngredientCheck]: { productId: number };
  [DetailRoutes.PhotoGuide]: { timeSlot: TimeSlot };
  [DetailRoutes.FaceCapture]: { timeSlot: TimeSlot };
  [DetailRoutes.AnalyzingSkin]: { timeSlot: TimeSlot };
  [DetailRoutes.SkinResult]: { timeSlot?: TimeSlot };
  [DetailRoutes.MetricDetail]: { metricKey: string };
  [DetailRoutes.CheckResult]: { productId: number };
  [DetailRoutes.LocationSettings]: undefined;
};

// Root: Auth ↔ Onboarding ↔ Main 전체 교체 (뒤로가기로 못 돌아감)
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};
// api/mock/onboarding.ts
//
// ⚠️ 목업 전용 편의 기능입니다. 실제 백엔드는 각 PATCH 호출 시점에 바로 저장하기 때문에
// 클라이언트가 값을 "모아두는" 로직이 필요 없지만(진짜 흐름은 api/onboarding.ts 주석 참고),
// USE_MOCK=true일 때는 저장할 서버가 없다 보니 완료 화면 요약이 항상 고정값으로만 나옵니다.
// 테스트/데모 중에 실제 입력값이 요약에 반영되는 게 훨씬 체감이 잘 되기 때문에,
// 화면 간 입력을 여기 모듈 스코프 변수에 잠깐 기억해뒀다가 완료 요약을 만들 때 씁니다.
// 앱 상태가 아니라 목업 세션 동안만 유지되는 값이고, 실제 authStore/onboardingStore와는 무관합니다.
import type {
  BasicInfoInput,
  BasicInfoResult,
  CompleteOnboardingResult,
  Gender,
  HormoneInput,
  HormoneStatus,
  HormoneResult,
  OnboardingSummaryRow,
  SkinTypeCode,
  SkinTypeInput,
  SkinTypeResult,
} from '@/types/onboarding';

export const mockHormoneResult: HormoneResult = {
  nextStep: 'COMPLETE',
};

// ---------------------------------------------------------------------------
// 목업 세션 (화면 간 입력 기억 — 완료 요약에 실제 입력값을 반영하기 위한 용도)
// ---------------------------------------------------------------------------

const mockSession: {
  name?: string;
  gender?: Gender;
  age?: number;
  skinTypes?: SkinTypeCode[];
  hormoneStatus?: HormoneStatus;
  lastPeriodStartDate?: string;
  averageCycleDays?: number;
} = {};

export function recordMockBasicInfo(input: BasicInfoInput): void {
  mockSession.name = input.name;
  mockSession.gender = input.gender;
  mockSession.age = input.age;
}

/**
 * 실제 선택한 성별을 그대로 반영합니다 (ONBOARD-01 BR1과 동일 규칙: FEMALE→3, 그 외→2).
 * 예전엔 이 값이 고정이라 S-01에서 여성을 골라도 목업상 호르몬 화면(S-04)으로 안 이어졌는데,
 * 이제 mockSession.gender를 그대로 씁니다.
 */
export function buildMockBasicInfoResult(): BasicInfoResult {
  return {
    nextStep: 'SKIN_TYPE',
    totalStepCount: mockSession.gender === 'FEMALE' ? 3 : 2,
  };
}

export function recordMockSkinTypes(input: SkinTypeInput): void {
  mockSession.skinTypes = input.skinTypes;
}

/** ONBOARD-03 BR2와 동일 규칙: 성별이 FEMALE이면 HORMONE, 그 외는 COMPLETE */
export function buildMockSkinTypeResult(): SkinTypeResult {
  return {
    nextStep: mockSession.gender === 'FEMALE' ? 'HORMONE' : 'COMPLETE',
  };
}

export function recordMockHormone(input: HormoneInput): void {
  mockSession.hormoneStatus = input.hormoneStatus;
  mockSession.lastPeriodStartDate = input.lastPeriodStartDate;
  mockSession.averageCycleDays = input.averageCycleDays;
}

/**
 * mockSession을 통째로 비웁니다. 초기화 버튼(DevResetButton)이나 로그아웃 목업에서 호출합니다.
 * 이게 없으면, 예전에 한 번 "저장하고 계속하기"로 호르몬 정보를 저장해본 뒤 초기화하고
 * 새로 온보딩을 시작해서 이번엔 "나중에 설정하기"로 건너뛰어도, 저장 API 자체를 안 부르니까
 * mockSession에 남아있던 지난 값이 그대로 완료 요약에 다시 나오는 문제가 있었습니다.
 */
export function resetMockSession(): void {
  mockSession.name = undefined;
  mockSession.gender = undefined;
  mockSession.age = undefined;
  mockSession.skinTypes = undefined;
  mockSession.hormoneStatus = undefined;
  mockSession.lastPeriodStartDate = undefined;
  mockSession.averageCycleDays = undefined;
}

const GENDER_LABEL: Record<Gender, string> = {
  FEMALE: '여성',
  MALE: '남성',
  UNSPECIFIED: '선택 안 함',
};

const SKIN_TYPE_LABEL: Record<SkinTypeCode, string> = {
  OILY: '지성',
  DRY: '건성',
  SENSITIVE: '민감성',
  UNKNOWN: '모르겠음',
};

const HORMONE_LABEL: Record<HormoneStatus, string> = {
  MENSTRUATING: '생리',
  HORMONE_PILL: '호르몬약',
  HORMONE_INJECTION: '주사',
  MENOPAUSE: '폐경',
};

/** 실제 서버 응답 형태(라벨·값 서버 완성)를 목업으로 흉내 냅니다 — ONBOARD-05 BR4와 동일한 모양 */
export function buildMockCompleteResult(): CompleteOnboardingResult {
  const summary: OnboardingSummaryRow[] = [];

  if (mockSession.name) {
    summary.push({ label: '이름', value: mockSession.name });
  }
  if (mockSession.gender && mockSession.age != null) {
    summary.push({
      label: '성별 · 나이',
      value: `${GENDER_LABEL[mockSession.gender]} · ${mockSession.age}세`,
    });
  }
  if (mockSession.skinTypes?.length) {
    summary.push({
      label: '피부 타입',
      value: mockSession.skinTypes.map((type) => SKIN_TYPE_LABEL[type]).join(' · '),
    });
  }
  if (mockSession.hormoneStatus) {
    summary.push({ label: '생리 상태', value: HORMONE_LABEL[mockSession.hormoneStatus] });
  }
  // 최근 시작일/휴약기 + 평균 주기를 한 줄로 합칩니다. 명세서 예시 응답도
  // { "label": "생리 주기", "value": "28일 · 생리" }처럼 한 행에 묶는 형태였습니다.
  const hasDate = Boolean(mockSession.lastPeriodStartDate);
  const hasCycle = mockSession.averageCycleDays != null;
  if (hasDate || hasCycle) {
    const label = mockSession.hormoneStatus === 'HORMONE_PILL' ? '최근 휴약기' : '최근 시작일';
    const parts = [
      hasDate ? mockSession.lastPeriodStartDate : null,
      hasCycle ? `${mockSession.averageCycleDays}일` : null,
    ].filter(Boolean);
    summary.push({ label, value: parts.join(' · ') });
  }

  return { onboardingCompleted: true, summary };
}
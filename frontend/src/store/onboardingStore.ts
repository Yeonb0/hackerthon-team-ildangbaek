// src/store/onboardingStore.ts
//
// 온보딩 폼 입력값(이름/성별/나이 등) 자체는 각 화면의 로컬 state로 충분합니다 —
// 명세서상 각 화면이 자기 필드만 모아서 그 화면 하나의 PATCH로 저장하지,
// 여러 화면에 걸친 입력값을 한 번에 모아 보내는 구조가 아니기 때문입니다 (ONBOARD-02~05 참고).
//
// 이 스토어가 담당하는 건 딱 하나, 화면을 넘나들며 공유되어야 하는 "진행률 분모"입니다.
// - 신규 사용자: S-01에서 성별을 고르는 순간 클라이언트가 먼저 계산해서 채웁니다
//   (FEMALE→3, 그 외→2 — ONBOARD-01 BR1과 동일한 규칙이라 서버 응답을 기다릴 필요가 없습니다)
// - 재로그인(중간 이탈 후 재개) 사용자: useAuthBootstrap이 GET /users/me/onboarding 응답으로 채웁니다
import { create } from 'zustand';
import type { HormoneInput } from '@/types/onboarding';

interface OnboardingState {
  totalStepCount: number | null;
  setTotalStepCount: (total: number | null) => void;
  /**
   * ⚠️ 임시 (2026-08-19 세션 20) — S-04에서 저장한 호르몬 입력값.
   *
   * 위 원칙("입력값은 각 화면 로컬 state로 충분")의 유일한 예외입니다. 백엔드
   * `buildSummary()`가 완료 화면 요약에 호르몬 행을 안 넣어줘서(3행만 생성), S-05가
   * 그 두 줄을 직접 그리려면 화면을 넘어 값을 들고 가야 합니다. 배경과 제거 방법은
   * `lib/hormoneSummary.ts` 상단 주석 참고.
   *
   * 건너뛰기(ONBOARD-04 BR3)면 null로 남습니다 — 그래야 요약에도 안 나옵니다.
   */
  hormoneInput: HormoneInput | null;
  setHormoneInput: (input: HormoneInput | null) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  totalStepCount: null,
  setTotalStepCount: (total) => set({ totalStepCount: total }),
  hormoneInput: null,
  setHormoneInput: (input) => set({ hormoneInput: input }),
}));

/** 성별에 따른 총 단계 수 계산 (ONBOARD-01 BR1과 동일한 규칙) */
export function calcTotalStepCount(gender: 'FEMALE' | 'MALE' | 'UNSPECIFIED'): number {
  return gender === 'FEMALE' ? 3 : 2;
}

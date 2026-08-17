// src/api/mock/skin.ts
//
// 목업 원본 데이터. 지표 4개(trouble/redness/pores/pigmentation)는 관리자 확인
// (2026-08-09, 프로젝트 지식 문서 기준) — 실제 값이 다르게 확정되면 이 파일만
// 고치면 됩니다 (types/skin.ts 코멘트 참고).
import type { SkinRecordResult } from '@/types/skin';
import type { TimeSlot } from '@/app/routes';

/**
 * 첫 기록(comparison === null) 여부 전환용 목업 시나리오.
 *
 * S-18은 `comparison`이 null이면 FirstSkinResult(첫 기록 축하) 화면으로, 있으면
 * TodaySkin으로 갈라집니다. 목업은 항상 comparison을 채우기 때문에 첫 기록 화면을
 * 실기기에서 볼 방법이 없었습니다 — 실제로 첫 기록을 보려면 계정을 새로 만들어야 하고,
 * 목업 환경에는 그런 경로 자체가 없습니다. DevResetButton에서 전환합니다.
 */
export type MockSkinScenario = 'COMPARED' | 'FIRST';

let skinScenario: MockSkinScenario = 'COMPARED';

export function setMockSkinScenario(scenario: MockSkinScenario): void {
  skinScenario = scenario;
}

export function buildMockSkinRecordResult(timeSlot: TimeSlot): SkinRecordResult {
  return {
    skinRecordId: Math.floor(Math.random() * 1000),
    timeSlot,
    capturedAt: new Date().toISOString(),
    // 2026-08-17(세션 13) — Figma TodaySkin(118:9423) 실측값으로 교체했습니다.
    //
    // 이전 값은 SKIN-01 명세 예시(74/66/70/80, totalScore 78)를 그대로 옮긴 것이었는데
    // 두 가지가 어긋났습니다:
    //   ① 지표 4종은 "낮을수록 좋음"인데(REPORT-01 BR7·Figma) 값이 전부 60 이상이라
    //      화면의 등급 배지가 네 칸 모두 "주의"로 떴습니다 — 데모가 최악의 피부 상태를
    //      보여주는 셈이었습니다.
    //   ② totalScore가 4지표 단순 평균(ADR 0008)이어야 하는데 평균 72.5 ≠ 78이었습니다.
    // 이제 평균(38+62+55+44)/4 = 49.75 ≈ 50과 totalScore가 맞습니다.
    totalScore: 50,
    scores: {
      trouble: 38,
      redness: 62,
      pores: 44,
      pigmentation: 55,
    },
    // SKIN-01 BR3 — 첫 기록이거나 비교 대상이 없으면 null입니다(오류가 아닙니다).
    comparison:
      skinScenario === 'FIRST'
        ? null
        : {
            comparedTo: `어제 ${timeSlot === 'MORNING' ? '모닝' : '나이트'}`,
            previousTotalScore: 54,
            // 지표는 낮을수록 좋으므로 음수가 개선입니다.
            changes: {
              trouble: -6,
              redness: 3,
              pores: -2,
              pigmentation: 1,
            },
          },
  };
}

/** 지연 시뮬레이션 — S-17의 단계 문구 순환이 데모에서도 실제로 보이도록 살짝 기다립니다. */
export function mockSkinAnalysisDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1800));
}
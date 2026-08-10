// src/api/mock/skin.ts
//
// 목업 원본 데이터. 지표 4개(trouble/redness/pores/pigmentation)는 관리자 확인
// (2026-08-09, 프로젝트 지식 문서 기준) — 실제 값이 다르게 확정되면 이 파일만
// 고치면 됩니다 (types/skin.ts 코멘트 참고).
import type { SkinRecordResult } from '@/types/skin';
import type { TimeSlot } from '@/app/routes';

export function buildMockSkinRecordResult(timeSlot: TimeSlot): SkinRecordResult {
  return {
    skinRecordId: Math.floor(Math.random() * 1000),
    timeSlot,
    capturedAt: new Date().toISOString(),
    totalScore: 78,
    scores: {
      trouble: 74,
      redness: 66,
      pores: 70,
      pigmentation: 80,
    },
    comparison: {
      comparedTo: `어제 ${timeSlot === 'MORNING' ? '모닝' : '나이트'}`,
      previousTotalScore: 72,
      changes: {
        trouble: -4,
        redness: 1,
        pores: 3,
        pigmentation: 5,
      },
    },
  };
}

/** 지연 시뮬레이션 — S-17의 단계 문구 순환이 데모에서도 실제로 보이도록 살짝 기다립니다. */
export function mockSkinAnalysisDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1800));
}

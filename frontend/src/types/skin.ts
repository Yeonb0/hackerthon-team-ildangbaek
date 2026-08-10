// src/types/skin.ts
// 명세서 §9 Skin API(SKIN-01/02) 기준.
//
// ⚠️ AI 지표 개수/키: 관리자 확인(2026-08-09, 프로젝트 지식 문서 기준)으로 4개 —
// trouble/redness/pores/pigmentation. GitHub 저장소에 커밋된 api 명세서.md/기능
// 명세서.md는 이 글 작성 시점에 아직 3개(trouble/redness/moisture)로 남아있어서,
// 실제 서버가 이 4개 키로 응답하는지는 백엔드 실연동 전 재확인이 필요합니다.
// scores/changes를 Record<string, number>로 열어둔 이유가 이것 때문입니다 — 지표가
// 3개든 4개든 6개든 adapters.ts의 toMetricList()와 화면 코드가 그대로 동작합니다.
import type { TimeSlot } from '@/app/routes';

export interface SkinComparison {
  comparedTo: string;
  previousTotalScore: number;
  changes: Record<string, number>;
}

export interface SkinRecordResult {
  skinRecordId: number;
  timeSlot: TimeSlot;
  capturedAt: string;
  totalScore: number;
  scores: Record<string, number>;
  /** 첫 기록이거나 비교 대상이 없으면 null입니다 (SKIN-01 BR3 — 오류가 아닙니다). */
  comparison: SkinComparison | null;
}

export interface CreateSkinRecordInput {
  timeSlot: TimeSlot;
  /** S-16에서 촬영·반전 보정까지 끝난 로컬 파일 URI */
  imageUri: string;
}

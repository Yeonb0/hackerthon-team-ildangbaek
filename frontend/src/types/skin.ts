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
  /**
   * OpenAI Vision이 사진을 보고 쓴 한 줄 코멘트 — S-18 "오늘의 피부 요약" 카드
   * (Figma TodaySkin, 관리자님 7번 항목).
   *
   * 2026-08-19(세션 18) 신설. 백엔드 `SkinRecordResponse.skinComment`가 이미 내려주고
   * 있었는데 프론트 타입에 자리가 없어 파싱 시점에 버려지고 있었습니다.
   *
   * ⚠️ **null이 정상입니다.** 백엔드 javadoc 그대로 — 규칙 기반 폴백으로 분석했거나
   * 목업 분석이면 근거가 없어 null을 내려보냅니다. 화면은 null일 때 카드 자체를
   * 그리지 않아야 합니다(빈 카드가 뜨면 분석이 실패한 것처럼 보입니다).
   *
   * REPORT-03(`GET /reports/daily`)의 `records[]`도 같은 DTO라 지난 날짜에서도 옵니다.
   */
  skinComment: string | null;
}

export interface CreateSkinRecordInput {
  timeSlot: TimeSlot;
  /** S-16에서 촬영·반전 보정까지 끝난 로컬 파일 URI */
  imageUri: string;
}

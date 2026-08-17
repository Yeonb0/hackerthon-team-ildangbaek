// src/types/check.ts
//
// Check API(api_명세서.md §10) 반영. "여기서 조회한 제품은 사용 기록으로 저장하지 않는다"
// (F-CHECK-02 BR3) — Product 도메인과 API 자체는 별개입니다.
import type { IngredientStatus } from '@/types/product';

// SHOP-01 3분류(ADR 0018, 2026-08-17 백엔드 구현 완료) — 제품은 항상 정확히 1개 분류만
// 받습니다. 우선순위 TODAY_NEEDED > HUMIDITY_CARE > MATCHED_INGREDIENT.
export type RecommendationCategory = 'TODAY_NEEDED' | 'HUMIDITY_CARE' | 'MATCHED_INGREDIENT';
export type HumidityGrade = 'DRY' | 'NORMAL' | 'HUMID';

export interface CheckRecommendation {
  productId: number;
  name: string;
  brand: string;
  /** 근거 없는 추천은 서버가 아예 안 내려줍니다(BR1) — 그래서 optional이 아니라 필수. */
  reason: string;
  category: RecommendationCategory;
  /** ai-server가 reason을 근거로 생성한 한 줄 코멘트(ADR 0025). 생성 실패 시 null —
   * 추천 자체는 AI 코멘트 없이도 성립합니다. */
  aiComment: string | null;
}

/** 오늘(가장 최근) 피부 기록·환경 데이터 컨텍스트(ADR 0018). 해당 데이터가 없으면 각
 * 필드가 개별적으로 null입니다 — 지어내지 않습니다. */
export interface TodayContext {
  troubleScore: number | null;
  rednessScore: number | null;
  humidity: number | null;
  humidityGrade: HumidityGrade | null;
}

/** CHECK-01 · GET /checks/home (S-21) */
export interface CheckHomeResult {
  /** 0~100. 낮으면 추천이 비어있을 가능성이 높다는 신호로만 씁니다 — 별도 게이팅 로직은 없음. */
  profileCompletion: number;
  recommendations: CheckRecommendation[];
  todayContext: TodayContext;
  failedSections: string[];
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CheckIngredient {
  ingredientId: number;
  name: string;
  status: IngredientStatus;
  /** 근거 있는 성분만 채워집니다. 데이터 부족이면 null(BR4) — product.ts의 note와 달리
   * 여기는 "왜 이 등급인지" 사유라 항상 null 가능성을 열어둡니다. */
  reason: string | null;
}

export interface CheckResultSummary {
  goodCount: number;
  cautionCount: number;
  insufficientCount: number;
}

/** CHECK-02/03 공용 응답 (POST /checks 성공 시, GET /checks/{checkId} 둘 다 동일 구조) */
export interface CheckResult {
  checkId: number;
  productId: number;
  productName: string;
  riskLevel: RiskLevel;
  riskTitle: string;
  riskDescription: string;
  ingredients: CheckIngredient[];
  summary: CheckResultSummary;
}

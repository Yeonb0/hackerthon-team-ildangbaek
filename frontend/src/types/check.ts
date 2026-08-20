// src/types/check.ts
//
// Check API(api_명세서.md §10) 반영. "여기서 조회한 제품은 사용 기록으로 저장하지 않는다"
// (F-CHECK-02 BR3) — Product 도메인과 API 자체는 별개입니다.
import type { IngredientStatus } from '@/types/product';

export interface CheckRecommendation {
  productId: number;
  name: string;
  brand: string;
  /** 근거 없는 추천은 서버가 아예 안 내려줍니다(BR1) — 그래서 optional이 아니라 필수. */
  reason: string;
  imageUrl?: string | null;
}

/** CHECK-01 · GET /checks/home (S-21) */
export interface CheckHomeResult {
  /** 0~100. 낮으면 추천이 비어있을 가능성이 높다는 신호로만 씁니다 — 별도 게이팅 로직은 없음. */
  profileCompletion: number;
  recommendations: CheckRecommendation[];
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

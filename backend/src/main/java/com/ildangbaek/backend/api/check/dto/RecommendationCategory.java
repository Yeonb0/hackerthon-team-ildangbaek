package com.ildangbaek.backend.api.check.dto;

/**
 * CHECK-01 추천 제품 분류(ADR 0018). {@code category} 기준으로 추정 매칭한다 — 값 자체는
 * 재검토 대상이다.
 */
public enum RecommendationCategory {
    TODAY_NEEDED,
    HUMIDITY_CARE,
    MATCHED_INGREDIENT
}

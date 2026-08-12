package com.ildangbaek.backend.api.check.dto;

/**
 * CHECK-01 추천 제품 한 건.
 *
 * @param reason 매칭된 GOOD 성분명으로 조립한 문구. 근거 없는 추천은 만들지 않는다(F-CHECK-01 BR 2).
 */
public record CheckRecommendationResponse(
        Long productId,
        String name,
        String brand,
        String reason
) {
}

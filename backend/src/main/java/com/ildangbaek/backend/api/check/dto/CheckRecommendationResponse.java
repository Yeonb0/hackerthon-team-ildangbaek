package com.ildangbaek.backend.api.check.dto;

/**
 * CHECK-01 추천 제품 한 건.
 *
 * @param reason    매칭된 GOOD 성분명으로 조립한 문구. 근거 없는 추천은 만들지 않는다(F-CHECK-01 BR 2).
 * @param category  추천 근거 분류(ADR 0018). {@code category} 기준 추정 매칭이다.
 * @param aiComment AI(ai-server)가 {@code reason}을 근거로 생성한 자연스러운 한 줄 코멘트.
 *                  생성 실패 시 {@code null}이다 — 추천 자체는 AI 없이도 성립하므로 실패가
 *                  추천 응답을 막지 않는다(ADR 0025).
 */
public record CheckRecommendationResponse(
        Long productId,
        String name,
        String brand,
        String reason,
        RecommendationCategory category,
        String aiComment
) {
}

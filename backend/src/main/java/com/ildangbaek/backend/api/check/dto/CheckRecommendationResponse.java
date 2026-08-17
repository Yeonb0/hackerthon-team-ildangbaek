package com.ildangbaek.backend.api.check.dto;

import java.util.List;

/**
 * CHECK-01 추천 제품 한 건.
 *
 * @param reason    매칭된 GOOD 성분명으로 조립한 문구. 근거 없는 추천은 만들지 않는다(F-CHECK-01 BR 2).
 * @param category  추천 근거 분류(ADR 0018). {@code category} 기준 추정 매칭이다.
 * @param aiComment AI(ai-server)가 {@code reason}을 근거로 생성한 자연스러운 한 줄 코멘트.
 *                  생성 실패 시 {@code null}이다 — 추천 자체는 AI 없이도 성립하므로 실패가
 *                  추천 응답을 막지 않는다(ADR 0025).
 * @param tags      추천 카드에 함께 노출하는 짧은 근거 칩. 규칙으로 도출하며 AI를 쓰지 않는다 —
 *                  단정문이라 틀리면 사실오류가 그대로 노출된다(ADR 0027). 근거가 없는 칩은
 *                  넣지 않으므로 길이는 1 또는 2다.
 */
public record CheckRecommendationResponse(
        Long productId,
        String name,
        String brand,
        String reason,
        RecommendationCategory category,
        String aiComment,
        List<String> tags
) {
}

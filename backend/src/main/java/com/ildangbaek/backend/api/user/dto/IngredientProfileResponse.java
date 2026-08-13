package com.ildangbaek.backend.api.user.dto;

import java.util.List;

/**
 * USER-02 · 성분 프로파일 전체 조회 응답.
 *
 * @param completionRate F-ANALYSIS-05 값(ADR 0011). {@code status} 필터와 무관하게 전체 기준이다.
 */
public record IngredientProfileResponse(
        int completionRate,
        List<IngredientProfileItemResponse> ingredients
) {
}

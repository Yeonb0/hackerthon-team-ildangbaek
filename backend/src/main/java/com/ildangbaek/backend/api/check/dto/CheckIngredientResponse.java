package com.ildangbaek.backend.api.check.dto;

import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;

/**
 * CHECK-02·03 응답의 성분 한 건.
 *
 * @param reason 판단 근거. {@code INSUFFICIENT}이거나 확정 근거 문구가 없으면 항상 {@code null}이다 —
 *               지어내지 않는다 (BR 4).
 */
public record CheckIngredientResponse(
        Long ingredientId,
        String name,
        IngredientStatus status,
        String reason
) {
}

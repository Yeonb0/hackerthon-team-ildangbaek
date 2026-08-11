package com.ildangbaek.backend.api.user.dto;

import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;

/**
 * USER-02 성분 한 건.
 *
 * @param reason      판단 근거. {@code INSUFFICIENT}면 항상 {@code null}이다 (BR 1).
 * @param recordCount 해당 성분에 노출된 일수({@code observation_count}).
 */
public record IngredientProfileItemResponse(
        Long ingredientId,
        String name,
        IngredientStatus status,
        String reason,
        int recordCount
) {
}

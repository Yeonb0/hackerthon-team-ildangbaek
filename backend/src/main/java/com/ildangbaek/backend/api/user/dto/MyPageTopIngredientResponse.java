package com.ildangbaek.backend.api.user.dto;

import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;

/**
 * USER-01 마이페이지 요약 노출용 성분 한 건. 상세(근거·노출 일수)는 USER-02가 담당한다.
 */
public record MyPageTopIngredientResponse(
        Long ingredientId,
        String name,
        IngredientStatus status
) {
}

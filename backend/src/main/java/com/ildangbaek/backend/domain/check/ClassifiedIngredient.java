package com.ildangbaek.backend.domain.check;

import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.product.entity.Ingredient;

/**
 * CHECK-02가 제품 성분 하나를 개인 프로파일과 대조한 결과. {@link com.ildangbaek.backend.api.check.service.CheckWriter}와
 * {@link RiskLevelCalculator}가 함께 참조하므로 api 계층이 아닌 domain에 둔다.
 *
 * @param reactionType 프로파일이 없으면 {@link ReactionType#INSUFFICIENT}
 * @param reason       판단 근거. {@code INSUFFICIENT}이거나 근거 문구가 없으면 {@code null}이다 — 지어내지 않는다.
 */
public record ClassifiedIngredient(Ingredient ingredient, ReactionType reactionType, String reason) {
}

package com.ildangbaek.backend.api.check.dto;

import com.ildangbaek.backend.domain.check.entity.ProductRiskAssessment;
import com.ildangbaek.backend.domain.check.entity.RiskLevel;
import java.util.List;

/**
 * CHECK-02·03 공통 응답. (docs/api_명세서.md)
 *
 * <p>정적 팩토리 {@link #of}가 두 엔드포인트의 유일한 조립 지점이다. CHECK-02는 방금 저장한
 * {@link ProductRiskAssessment}로, CHECK-03은 다시 읽은 같은 엔티티로 호출하므로 두 응답이
 * 구조적으로 어긋날 수 없다.
 */
public record CheckResponse(
        Long checkId,
        Long productId,
        String productName,
        RiskLevel riskLevel,
        String riskTitle,
        String riskDescription,
        List<CheckIngredientResponse> ingredients,
        CheckSummaryResponse summary
) {

    public static CheckResponse of(ProductRiskAssessment assessment, List<CheckIngredientResponse> ingredients) {
        RiskLevel riskLevel = assessment.getRiskLevel();
        return new CheckResponse(
                assessment.getId(),
                assessment.getProduct().getId(),
                assessment.getProduct().getProductName(),
                riskLevel,
                riskLevel.title(),
                riskLevel.description(),
                ingredients,
                new CheckSummaryResponse(
                        assessment.getSuitableCount(), assessment.getCautionCount(), assessment.getInsufficientCount())
        );
    }
}

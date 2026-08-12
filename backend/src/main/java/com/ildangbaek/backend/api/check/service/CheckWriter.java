package com.ildangbaek.backend.api.check.service;

import com.ildangbaek.backend.domain.check.ClassifiedIngredient;
import com.ildangbaek.backend.domain.check.RiskLevelCalculator.RiskOutcome;
import com.ildangbaek.backend.domain.check.entity.ProductRiskAssessment;
import com.ildangbaek.backend.domain.check.entity.ProductRiskIngredient;
import com.ildangbaek.backend.domain.check.repository.ProductRiskAssessmentRepository;
import com.ildangbaek.backend.domain.check.repository.ProductRiskIngredientRepository;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.user.entity.User;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * CHECK-02의 DB 반영만 담당한다. 트랜잭션을 별도 빈으로 분리하는 이유는 {@code ProductRecordWriter}와
 * 같다 — {@code this.save(...)} 호출은 프록시를 거치지 않아 {@code @Transactional}이 무시된다.
 *
 * <p>재분석은 새 행을 추가한다(append-only). 평가는 특정 시점의 판단 스냅샷이라 덮어쓰면 지난 판단이
 * 조용히 재작성된다 — ADR 0015 결정 4.
 */
@Component
@RequiredArgsConstructor
public class CheckWriter {

    private final ProductRiskAssessmentRepository productRiskAssessmentRepository;
    private final ProductRiskIngredientRepository productRiskIngredientRepository;

    /**
     * {@code summary}·{@code contributionScore}는 비워 둔다 — 쓸 값이 없다(ADR 0015 결정 7).
     * 성분 행은 {@code classified} 순서(= 제품 표시 순서) 그대로 저장해 CHECK-03이 같은 순서로
     * 재구성할 수 있게 한다.
     */
    @Transactional
    public ProductRiskAssessment save(User user, Product product, RiskOutcome outcome,
                                       int suitableCount, int cautionCount, int insufficientCount,
                                       List<ClassifiedIngredient> classified) {
        ProductRiskAssessment assessment = productRiskAssessmentRepository.save(ProductRiskAssessment.builder()
                .user(user)
                .product(product)
                .riskLevel(outcome.level())
                .riskScore(outcome.riskScore())
                .cautionCount(cautionCount)
                .suitableCount(suitableCount)
                .insufficientCount(insufficientCount)
                .summary(null)
                .build());

        for (ClassifiedIngredient item : classified) {
            productRiskIngredientRepository.save(ProductRiskIngredient.builder()
                    .assessment(assessment)
                    .ingredient(item.ingredient())
                    .reactionType(item.reactionType())
                    .reason(item.reason())
                    .contributionScore(null)
                    .build());
        }

        return assessment;
    }
}

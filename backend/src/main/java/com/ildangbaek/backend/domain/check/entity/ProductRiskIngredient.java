package com.ildangbaek.backend.domain.check.entity;

import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 11장 ProductRiskIngredient. 위험도 평가 1건에 포함된 성분별 근거.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "product_risk_ingredients",
        uniqueConstraints = @UniqueConstraint(columnNames = {"assessment_id", "ingredient_id"})
)
public class ProductRiskIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "assessment_id", nullable = false)
    private ProductRiskAssessment assessment;

    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false, length = 30)
    private ReactionType reactionType;

    @Column(length = 500)
    private String reason;

    @Column(name = "contribution_score", precision = 8, scale = 4)
    private BigDecimal contributionScore;

    @Builder
    private ProductRiskIngredient(ProductRiskAssessment assessment, Ingredient ingredient,
                                   ReactionType reactionType, String reason, BigDecimal contributionScore) {
        this.assessment = assessment;
        this.ingredient = ingredient;
        this.reactionType = reactionType;
        this.reason = reason;
        this.contributionScore = contributionScore;
    }
}

package com.ildangbaek.backend.domain.analysis.entity;

import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.user.entity.User;
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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 9장 IngredientProfile. 사용자별 성분 반응 프로파일(F-ANALYSIS-04).
 * 데이터가 부족하면 맞음/주의로 임의 분류하지 않고 INSUFFICIENT를 유지한다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "ingredient_profiles",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "ingredient_id"})
)
public class IngredientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false, length = 30)
    private ReactionType reactionType;

    @Column(name = "profile_score", precision = 8, scale = 4)
    private BigDecimal profileScore;

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @Column(name = "observation_count", nullable = false)
    private int observationCount;

    @Column(name = "positive_count", nullable = false)
    private int positiveCount;

    @Column(name = "negative_count", nullable = false)
    private int negativeCount;

    @Column(name = "representative_lag_days")
    private Integer representativeLagDays;

    @Column(name = "reason_summary", length = 500)
    private String reasonSummary;

    @Column(name = "last_analyzed_at")
    private LocalDateTime lastAnalyzedAt;

    @Builder
    private IngredientProfile(User user, Ingredient ingredient) {
        this.user = user;
        this.ingredient = ingredient;
        this.reactionType = ReactionType.INSUFFICIENT;
        this.observationCount = 0;
        this.positiveCount = 0;
        this.negativeCount = 0;
    }

    public void updateAnalysis(ReactionType reactionType, BigDecimal profileScore, BigDecimal confidenceScore,
                                int observationCount, int positiveCount, int negativeCount,
                                Integer representativeLagDays, String reasonSummary) {
        this.reactionType = reactionType;
        this.profileScore = profileScore;
        this.confidenceScore = confidenceScore;
        this.observationCount = observationCount;
        this.positiveCount = positiveCount;
        this.negativeCount = negativeCount;
        this.representativeLagDays = representativeLagDays;
        this.reasonSummary = reasonSummary;
        this.lastAnalyzedAt = LocalDateTime.now();
    }
}

package com.ildangbaek.backend.domain.check.entity;

import com.ildangbaek.backend.domain.product.entity.Product;
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
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 11장 ProductRiskAssessment. 구매 전 확인(F-CHECK-*)에서 조회한 제품의 전체 위험도.
 * 조회한 제품은 실제 사용 기록으로 저장하지 않는다(PRD 8.6).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "product_risk_assessments")
public class ProductRiskAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 20)
    private RiskLevel riskLevel;

    @Column(name = "risk_score", precision = 5, scale = 2)
    private BigDecimal riskScore;

    @Column(name = "caution_count", nullable = false)
    private int cautionCount;

    @Column(name = "suitable_count", nullable = false)
    private int suitableCount;

    @Column(name = "insufficient_count", nullable = false)
    private int insufficientCount;

    @Column(length = 500)
    private String summary;

    @Column(name = "assessed_at", nullable = false)
    private LocalDateTime assessedAt;

    @Builder
    private ProductRiskAssessment(User user, Product product, RiskLevel riskLevel, BigDecimal riskScore,
                                   int cautionCount, int suitableCount, int insufficientCount, String summary) {
        this.user = user;
        this.product = product;
        this.riskLevel = riskLevel;
        this.riskScore = riskScore;
        this.cautionCount = cautionCount;
        this.suitableCount = suitableCount;
        this.insufficientCount = insufficientCount;
        this.summary = summary;
        this.assessedAt = LocalDateTime.now();
    }
}

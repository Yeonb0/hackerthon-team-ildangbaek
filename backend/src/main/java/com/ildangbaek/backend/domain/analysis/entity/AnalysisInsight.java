package com.ildangbaek.backend.domain.analysis.entity;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 10장 AnalysisInsight. 피부 리포트에 노출되는 성분/환경 기반 인사이트(F-REPORT-02).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "analysis_insights")
public class AnalysisInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "insight_type", nullable = false, length = 30)
    private InsightType insightType;

    @Enumerated(EnumType.STRING)
    @Column(name = "metric_type", length = 30)
    private SkinMetricType metricType;

    @Column(nullable = false, length = 200)
    private String title;

    @Lob
    @Column(nullable = false)
    private String description;

    @Lob
    private String recommendation;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Builder
    private AnalysisInsight(User user, InsightType insightType, SkinMetricType metricType, String title,
                             String description, String recommendation, LocalDate startDate, LocalDate endDate,
                             BigDecimal confidenceScore) {
        this.user = user;
        this.insightType = insightType;
        this.metricType = metricType;
        this.title = title;
        this.description = description;
        this.recommendation = recommendation;
        this.startDate = startDate;
        this.endDate = endDate;
        this.confidenceScore = confidenceScore;
        this.generatedAt = LocalDateTime.now();
    }
}

package com.ildangbaek.backend.domain.record.entity;

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
 * docs/ERD.md 7장 SkinMetric. 피부 기록 1건에 대한 지표별(TROUBLE/REDNESS/MOISTURE_OIL) 분석값.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "skin_metrics",
        uniqueConstraints = @UniqueConstraint(columnNames = {"skin_record_id", "metric_type"})
)
public class SkinMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "skin_record_id", nullable = false)
    private SkinRecord skinRecord;

    @Enumerated(EnumType.STRING)
    @Column(name = "metric_type", nullable = false, length = 30)
    private SkinMetricType metricType;

    @Column(name = "metric_value", nullable = false, precision = 8, scale = 2)
    private BigDecimal metricValue;

    @Column(name = "comparison_difference", precision = 8, scale = 2)
    private BigDecimal comparisonDifference;

    @Enumerated(EnumType.STRING)
    @Column(name = "trend_status", length = 20)
    private TrendStatus trendStatus;

    @Builder
    private SkinMetric(SkinRecord skinRecord, SkinMetricType metricType, BigDecimal metricValue,
                        BigDecimal comparisonDifference, TrendStatus trendStatus) {
        this.skinRecord = skinRecord;
        this.metricType = metricType;
        this.metricValue = metricValue;
        this.comparisonDifference = comparisonDifference;
        this.trendStatus = trendStatus;
    }
}

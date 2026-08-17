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
 * docs/ERD.md 7장 SkinMetric. 피부 기록 1건에 대한 지표별(TROUBLE/REDNESS/PORES/PIGMENTATION) 분석값.
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

    /**
     * AI/CV가 실제로 측정한 원시값. {@link #metricValue}(0~100 정규화 점수)로 옮기기 전의
     * 원본이다. 분석 서버가 값을 제공하지 않았거나(목업), 이 지표가 추가되기 전에 저장된
     * 기록이면 {@code null} — 기존 score에서 rawValue를 역산하지 않는다.
     */
    @Column(name = "raw_value")
    private Double rawValue;

    /**
     * 이 분석 결과의 신뢰도. 실제 근거(예: PORES의 카메라 노이즈 대역 판정)가 있을 때만 채운다.
     * 근거 없는 지표는 {@code null}로 둔다 — 임의로 값을 지어내지 않는다.
     */
    @Column(name = "confidence", length = 20)
    private String confidence;

    /**
     * rawValue를 산출한 분석 알고리즘 버전. 근거(분석 서버 응답)가 없으면 {@code null}.
     */
    @Column(name = "algorithm_version", length = 30)
    private String algorithmVersion;

    /**
     * rawValue를 metricValue(score)로 바꾸는 데 쓰인 정규화 기준 버전. 근거가 없으면 {@code null}.
     */
    @Column(name = "normalization_version", length = 30)
    private String normalizationVersion;

    @Builder
    private SkinMetric(SkinRecord skinRecord, SkinMetricType metricType, BigDecimal metricValue,
                        BigDecimal comparisonDifference, TrendStatus trendStatus, Double rawValue,
                        String confidence, String algorithmVersion, String normalizationVersion) {
        this.skinRecord = skinRecord;
        this.metricType = metricType;
        this.metricValue = metricValue;
        this.comparisonDifference = comparisonDifference;
        this.trendStatus = trendStatus;
        this.rawValue = rawValue;
        this.confidence = confidence;
        this.algorithmVersion = algorithmVersion;
        this.normalizationVersion = normalizationVersion;
    }
}

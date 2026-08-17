package com.ildangbaek.backend.api.report.dto;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;

/**
 * REPORT-01 {@code summary}의 지표별 기간 점수. 지표 값은 낮을수록 좋다.
 *
 * @param score 기간 내 해당 지표의 평균 점수
 * @param delta 직전 동일 기간 평균 대비 증감 (이번 평균 - 직전 평균)
 */
public record ReportSummaryMetricResponse(
        SkinMetricType metric,
        int score,
        int delta
) {
}

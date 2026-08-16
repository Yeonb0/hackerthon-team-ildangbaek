package com.ildangbaek.backend.api.report.dto;

/**
 * REPORT-01 인사이트 카드. F-ANALYSIS-01(성분-피부 시차 분석)이 아직 없어 현재는 항상 빈 배열로 내려간다.
 */
public record ReportInsightResponse(
        Long insightId,
        String type,
        String title,
        String description,
        String confidence
) {
}

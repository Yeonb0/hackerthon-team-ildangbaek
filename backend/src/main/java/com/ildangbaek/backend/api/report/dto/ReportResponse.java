package com.ildangbaek.backend.api.report.dto;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.util.List;

/**
 * REPORT-01 응답.
 *
 * @param failedSections 일부 섹션 산출이 실패했을 때 그 이름을 담는다. 현재는 항상 빈 배열이다.
 */
public record ReportResponse(
        int period,
        SkinMetricType metric,
        ReportSummaryResponse summary,
        List<ReportGraphPointResponse> graph,
        List<ReportInsightResponse> insights,
        List<String> failedSections
) {
}

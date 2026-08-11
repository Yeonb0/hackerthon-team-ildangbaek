package com.ildangbaek.backend.api.report.dto;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.util.List;

/**
 * REPORT-02 · 요인 상세 조회 응답.
 *
 * <p>{@code graph}는 REPORT-01과 같은 {@link ReportGraphPointResponse}를 쓴다 — 두 화면이 같은
 * 그래프 컴포넌트를 공유하므로 형태가 갈리면 클라이언트가 두 벌을 알아야 한다 (ADR 0012, 0013).
 *
 * @param metric 인사이트가 다루는 지표를 그대로 돌려준다. 지표 전환은 지원하지 않는다 (TBD-11 해소).
 */
public record ReportInsightDetailResponse(
        Long insightId,
        String type,
        SkinMetricType metric,
        String title,
        String subtitle,
        List<ReportGraphPointResponse> graph,
        List<ReportInsightEventResponse> events
) {
}

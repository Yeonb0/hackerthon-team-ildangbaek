package com.ildangbaek.backend.api.report.dto;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.util.List;

/**
 * REPORT-02 · 요인 상세 조회 응답.
 *
 * <p>{@code graph}는 REPORT-01과 같은 {@link ReportGraphPointResponse}를 쓴다 — 두 화면이 같은
 * 그래프 컴포넌트를 공유하므로 형태가 갈리면 클라이언트가 두 벌을 알아야 한다 (ADR 0012, 0013).
 *
 * @param metric   인사이트가 다루는 지표를 그대로 돌려준다. 지표 전환은 지원하지 않는다 (TBD-11 해소).
 * @param subtitle 기간 길이를 알리는 메타 문구다 ("최근 30일 · 이벤트와 상관관계"). 분석 요약
 *                 문장은 {@code summary}에 따로 싣는다 — 둘은 성격이 달라 한 필드에 겹쳐 쓰지
 *                 않는다 (ADR 0027).
 * @param summary  F-ANALYSIS-01이 인사이트에 저장해 둔 분석 요약 문장. REPORT-01 인사이트 카드의
 *                 {@code description}과 같은 값이다. 저장된 값이 없으면 {@code null}이다.
 * @param tip      AI(ai-server)가 생성한 관리 팁 한 단락. 생성 실패 시 {@code null}이며, 그때
 *                 클라이언트는 팁 섹션을 감춘다 — 팁이 없어도 상세 화면 자체는 성립한다 (ADR 0028).
 */
public record ReportInsightDetailResponse(
        Long insightId,
        String type,
        SkinMetricType metric,
        String title,
        String subtitle,
        String summary,
        List<ReportGraphPointResponse> graph,
        List<ReportInsightEventResponse> events,
        String tip
) {
}

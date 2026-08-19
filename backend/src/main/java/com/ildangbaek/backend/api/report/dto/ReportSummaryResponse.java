package com.ildangbaek.backend.api.report.dto;

import java.util.List;

/**
 * REPORT-01 {@code summary} · 기간 종합 피부 점수. 리포트 화면 상단 카드가 쓴다.
 *
 * @param totalScore 기간 내 지표 4종 평균의 평균을 반올림한 0~100 정수 (ADR 0008과 같은 방식) —
 *                    높을수록 좋다
 * @param totalDelta 직전 동일 기간(예: period=7이면 그 이전 7일) 대비 증감
 * @param metrics    지표 4종 각각의 기간 평균 점수와 직전 동일 기간 대비 증감 — 낮을수록 좋다
 * @param graph      기간 내 일자별 종합 점수 추이. 기록 없는 날짜는 {@code null}
 */
public record ReportSummaryResponse(
        int totalScore,
        int totalDelta,
        List<ReportSummaryMetricResponse> metrics,
        List<ReportSummaryGraphPointResponse> graph
) {
}

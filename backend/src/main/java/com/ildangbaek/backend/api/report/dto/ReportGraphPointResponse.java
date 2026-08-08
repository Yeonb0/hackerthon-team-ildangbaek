package com.ildangbaek.backend.api.report.dto;

import java.time.LocalDate;

/**
 * REPORT-01 그래프의 일자별 지점. 해당 날짜에 기록이 없으면 {@code score}는 {@code null}이다 — 0으로 계산하지 않는다.
 */
public record ReportGraphPointResponse(
        LocalDate date,
        Integer score
) {
}

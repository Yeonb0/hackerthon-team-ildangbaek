package com.ildangbaek.backend.api.report.dto;

import java.time.LocalDate;

/**
 * REPORT-01 그래프의 일자별 지점. 모닝·나이트를 각각 내려준다 — 대표값으로 접지 않는다 (ADR 0012).
 *
 * <p>해당 슬롯에 기록이 없으면 그 점수는 {@code null}이다 — 0으로 계산하지 않는다.
 * 하루에 한쪽만 기록한 날은 한쪽만 값이 있고, 아예 기록이 없는 날은 둘 다 {@code null}이다.
 */
public record ReportGraphPointResponse(
        LocalDate date,
        Integer morningScore,
        Integer nightScore
) {
}

package com.ildangbaek.backend.api.report.dto;

import java.time.LocalDate;

/**
 * REPORT-01 {@code summary}의 일자별 종합 점수 추이. 모닝·나이트를 구분하지 않고 하루 평균을 낸다.
 *
 * <p>해당 날짜에 기록이 하나도 없으면 {@code score}는 {@code null}이다 — 0으로 계산하지 않는다.
 */
public record ReportSummaryGraphPointResponse(
        LocalDate date,
        Integer score
) {
}

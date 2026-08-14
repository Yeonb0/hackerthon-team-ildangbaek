package com.ildangbaek.backend.api.check.dto;

/**
 * CHECK-02·03 응답의 성분 상태 집계. API 필드는 {@code goodCount}이지만 컬럼은
 * {@code suitable_count}다 — API 경계에서 표기를 바꾼다 (ADR 0004).
 */
public record CheckSummaryResponse(
        int goodCount,
        int cautionCount,
        int insufficientCount
) {
}

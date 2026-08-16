package com.ildangbaek.backend.api.report.dto;

import java.time.LocalDate;

/**
 * REPORT-02 요인 상세의 주요 이벤트 한 건.
 *
 * <p>저장된 행이 아니라 조회 시점에 기록에서 도출한다 (ADR 0013). 도출 가능한 유형은
 * 성분 첫 사용과 자외선 급증 두 가지다 — 성분 재시작은 "기록하지 않은 날"과 "쓰지 않은 날"을
 * 구분할 수 없어 만들지 않는다.
 *
 * @param confidence {@code OBSERVED} 또는 {@code OBSERVING}. 확정되지 않은 패턴은 {@code impact}
 *                   문구도 단정하지 않는다 (BR 2).
 */
public record ReportInsightEventResponse(
        LocalDate date,
        String label,
        String impact,
        String confidence
) {
}

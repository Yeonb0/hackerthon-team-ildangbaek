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
 * @param delta      {@code impact} 문구에 실린 지표 변화량을 부호 있는 숫자로 그대로 낸다. 문구를
 *                   만든 근거값이지 새로 계산한 값이 아니다. 단정할 수 없어 문구가 "확인 중"으로
 *                   폴백했다면 {@code null}이다 — 문구와 값이 어긋나지 않는다 (ADR 0027).
 * @param eventKind  도출 유형. 클라이언트가 {@code impact} 문구를 파싱해 유형을 추정하지 않도록 둔다.
 */
public record ReportInsightEventResponse(
        LocalDate date,
        String label,
        String impact,
        String confidence,
        Integer delta,
        InsightEventKind eventKind
) {
}

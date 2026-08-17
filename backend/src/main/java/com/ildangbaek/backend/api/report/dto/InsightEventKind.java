package com.ildangbaek.backend.api.report.dto;

/**
 * REPORT-02 이벤트의 도출 유형. ADR 0013이 확정한 두 가지가 전부다 — 클라이언트가 {@code impact}
 * 문구를 정규식으로 파싱해 유형을 추정하지 않도록 유형 자체를 필드로 내려준다(ADR 0027).
 *
 * <p>명세가 들었던 "성분 재시작"에 해당하는 값은 두지 않는다. 제품 기록이 없는 날은 "쓰지 않았다"가
 * 아니라 "기록하지 않았다"라서 중단을 판정할 수 없고(ADR 0013), 채울 수 없는 값을 열거형에 두면
 * 클라이언트가 오지 않는 분기를 다루게 된다.
 */
public enum InsightEventKind {

    /** 인사이트가 다루는 성분을 창 안에서 처음 사용한 날. */
    INGREDIENT_USAGE,

    /** 자외선 지수가 임계값 이상으로 연속된 구간의 시작일. */
    UV_SPIKE
}

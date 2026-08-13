package com.ildangbaek.backend.api.check.dto;

import java.util.List;

/**
 * CHECK-01 · 쇼핑 홈 조회 응답. (docs/api_명세서.md 10장, F-CHECK-01)
 *
 * @param profileCompletion F-ANALYSIS-05 값(ADR 0011). USER-01·USER-02와 동일해야 한다(BR 4).
 * @param todayContext      오늘 피부 지표·습도 컨텍스트(ADR 0018). 오늘 데이터가 없으면 각 필드가
 *                          {@code null}인 상태로 내려간다.
 * @param failedSections    외부 API 부분 실패 시 채워지는 공용 필드(1.8절). 이 응답은 전부 내부 DB
 *                          조회라 항상 빈 배열이다.
 */
public record CheckHomeResponse(
        int profileCompletion,
        List<CheckRecommendationResponse> recommendations,
        TodayContextResponse todayContext,
        List<Object> failedSections
) {
}

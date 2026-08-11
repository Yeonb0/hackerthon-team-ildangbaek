package com.ildangbaek.backend.api.skin.dto;

/**
 * 전일 동일 시간대 기록과의 비교. 비교 대상이 없으면 이 객체 자체가 {@code null}이다.
 *
 * <p>모닝은 전일 모닝, 나이트는 전일 나이트와 비교한다. (F-SKIN-05)
 *
 * @param comparedTo         비교 대상 기록의 "yyyy-MM-dd SLOT" 표기
 * @param previousTotalScore 비교 대상의 종합 점수
 * @param changes            지표별 증감 (이번 점수 - 이전 점수)
 */
public record SkinComparisonResponse(
        String comparedTo,
        int previousTotalScore,
        SkinScoresResponse changes
) {
}

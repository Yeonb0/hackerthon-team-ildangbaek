package com.ildangbaek.backend.api.check.dto;

import com.ildangbaek.backend.domain.environment.entity.HumidityGrade;

/**
 * CHECK-01 · 오늘 컨텍스트(ADR 0018). 오늘 피부 기록·환경 데이터가 없으면 해당 값은
 * {@code null}이다 — HOME-01의 {@code environment} null 처리와 같은 방식이다.
 */
public record TodayContextResponse(
        Integer troubleScore,
        Integer rednessScore,
        Integer humidity,
        HumidityGrade humidityGrade
) {

    public static TodayContextResponse empty() {
        return new TodayContextResponse(null, null, null, null);
    }
}

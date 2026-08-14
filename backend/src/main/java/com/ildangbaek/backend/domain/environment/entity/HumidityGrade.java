package com.ildangbaek.backend.domain.environment.entity;

import java.math.BigDecimal;

/**
 * 습도 등급. 임계값은 확정 기준이 없어 추정치로 둔다(ADR 0018 참고, 재검토 대상).
 */
public enum HumidityGrade {
    DRY,
    NORMAL,
    HUMID;

    private static final BigDecimal DRY_THRESHOLD = BigDecimal.valueOf(40);
    private static final BigDecimal HUMID_THRESHOLD = BigDecimal.valueOf(70);

    public static HumidityGrade from(BigDecimal humidity) {
        if (humidity.compareTo(DRY_THRESHOLD) < 0) {
            return DRY;
        }
        if (humidity.compareTo(HUMID_THRESHOLD) > 0) {
            return HUMID;
        }
        return NORMAL;
    }
}

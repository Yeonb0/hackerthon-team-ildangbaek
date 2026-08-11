package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.util.Map;

/**
 * 특정 날짜·시간대의 피부 지표 관측값.
 *
 * <p>성분 노출과 같은 슬롯끼리 비교한다. 하루 평균으로 합치면 나이트 제품의 기준값에 그날 모닝
 * 피부 점수가 섞여 노출보다 앞선 관측을 원인으로 해석할 수 있다. (F-ANALYSIS-01 BR 6)
 */
public record SkinObservation(
        LocalDate date,
        TimeSlot timeSlot,
        Map<SkinMetricType, Double> values
) {

    /** 기존 날짜 단위 테스트의 기본 관측은 나이트 슬롯으로 본다. */
    public SkinObservation(LocalDate date, Map<SkinMetricType, Double> values) {
        this(date, TimeSlot.NIGHT, values);
    }
}

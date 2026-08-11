package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.time.LocalDate;
import java.util.Map;

/**
 * 특정 날짜의 피부 지표 관측값. 하루 2건(모닝·나이트)이 있으면 지표별 평균으로 합친 값이다.
 *
 * <p>평균으로 합치는 이유는 시차 분석에 <b>날짜당 관측 하나</b>가 필요하기 때문이다. 두 슬롯 모두
 * 관측된 날 한쪽을 버리면 정보를 잃는다. REPORT-01 그래프는 반대로 접지 않고 모닝·나이트를 각각
 * 내려주는데(ADR 0012), 목적이 달라서다 — 그래프는 사용자가 두 시간대를 구분해 보는 화면이다.
 */
public record SkinObservation(
        LocalDate date,
        Map<SkinMetricType, Double> values
) {
}

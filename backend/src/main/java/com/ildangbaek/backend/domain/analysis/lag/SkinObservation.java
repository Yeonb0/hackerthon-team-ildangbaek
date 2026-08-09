package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.time.LocalDate;
import java.util.Map;

/**
 * 특정 날짜의 피부 지표 관측값. 하루 2건(모닝·나이트)이 있으면 지표별 평균으로 합친 값이다.
 *
 * <p>대표값을 나이트 우선(REPORT-01 TBD-12)이 아니라 평균으로 잡은 이유는 목적이 다르기 때문이다.
 * 리포트는 "그날을 대표하는 한 점"을 그려야 하지만, 시차 분석은 그날 피부 상태의 추정치가 필요하다.
 * 두 슬롯 모두 관측된 날 한쪽을 버리면 정보를 잃는다.
 */
public record SkinObservation(
        LocalDate date,
        Map<SkinMetricType, Double> values
) {
}

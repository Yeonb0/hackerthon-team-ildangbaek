package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;

/**
 * 특정 성분이 특정 날짜·시간대에 사용된 1건. (F-ANALYSIS-01 BR 1, 6)
 *
 * <p>제품 단위가 아니라 <strong>성분 단위</strong>다. 한 번의 제품 기록에 성분이 20개 들어 있으면
 * 노출 20건이 된다. 같은 성분이 여러 제품에 들어 있어도 같은 날 같은 슬롯이면 1건으로 합친다.
 *
 * <p>{@code timeSlot}을 남기는 이유는 BR 6이다. 모닝에 쓴 제품과 나이트에 쓴 제품은 노출 시점이
 * 다르므로, 하루 단위로 뭉개면 "밤에 바른 성분이 그날 아침 피부에 영향을 줬다"는 역방향 해석이 섞인다.
 */
public record IngredientExposure(
        Long ingredientId,
        String ingredientName,
        LocalDate date,
        TimeSlot timeSlot
) {
}

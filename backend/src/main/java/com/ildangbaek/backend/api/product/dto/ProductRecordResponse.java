package com.ildangbaek.backend.api.product.dto;

import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDateTime;

/**
 * PRODUCT-05 응답. (docs/api_명세서.md)
 *
 * <p>{@code skinRecordSuggested}는 같은 시간대의 피부 기록이 없으면 true다. S-14 하단의
 * 피부 기록 유도 카드 노출 여부를 서버가 판단한다. (F-PRODUCT-07)
 */
public record ProductRecordResponse(
        Long recordId,
        TimeSlot timeSlot,
        LocalDateTime recordedAt,
        int productCount,
        boolean skinRecordSuggested
) {

    public static ProductRecordResponse of(ProductRecord record, int productCount, boolean skinRecordSuggested) {
        return new ProductRecordResponse(
                record.getId(), record.getTimeSlot(), record.getRecordedAt(), productCount, skinRecordSuggested);
    }
}

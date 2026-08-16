package com.ildangbaek.backend.api.productrecord.dto.response;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDateTime;

public record SaveProductRecordResponse(
        Long recordId,
        TimeSlot timeSlot,
        LocalDateTime recordedAt,
        int productCount,
        boolean skinRecordSuggested
) {
}

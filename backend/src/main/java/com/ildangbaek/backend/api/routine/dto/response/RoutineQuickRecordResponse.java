package com.ildangbaek.backend.api.routine.dto.response;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.util.List;

public record RoutineQuickRecordResponse(
        Long recordId,
        TimeSlot timeSlot,
        int productCount,
        List<Long> skippedProductIds,
        boolean skinRecordSuggested
) {
}

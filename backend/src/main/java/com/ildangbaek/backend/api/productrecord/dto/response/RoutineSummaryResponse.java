package com.ildangbaek.backend.api.productrecord.dto.response;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;

public record RoutineSummaryResponse(
        Long routineId,
        String name,
        TimeSlot timeSlot,
        int productCount,
        String productSummary
) {
}

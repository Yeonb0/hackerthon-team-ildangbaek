package com.ildangbaek.backend.api.routine.dto.response;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.util.List;

public record RoutineResponse(
        Long routineId,
        String name,
        TimeSlot timeSlot,
        int productCount,
        List<RoutineProductResponse> products
) {
}

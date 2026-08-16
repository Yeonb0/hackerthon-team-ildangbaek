package com.ildangbaek.backend.api.routine.dto.request;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import jakarta.validation.constraints.NotNull;

public record RoutineQuickRecordRequest(
        @NotNull TimeSlot timeSlot,
        Boolean force
) {
    public boolean forceEnabled() {
        return Boolean.TRUE.equals(force);
    }
}

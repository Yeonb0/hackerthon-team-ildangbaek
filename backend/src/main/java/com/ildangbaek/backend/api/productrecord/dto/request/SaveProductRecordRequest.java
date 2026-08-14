package com.ildangbaek.backend.api.productrecord.dto.request;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SaveProductRecordRequest(
        @NotNull TimeSlot timeSlot,
        @NotEmpty List<Long> productIds,
        Boolean force
) {
    public boolean forceEnabled() {
        return Boolean.TRUE.equals(force);
    }
}

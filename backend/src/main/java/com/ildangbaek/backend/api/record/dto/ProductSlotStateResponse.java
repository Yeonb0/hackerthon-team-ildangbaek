package com.ildangbaek.backend.api.record.dto;

public record ProductSlotStateResponse(
        boolean completed,
        Long recordId,
        String summary
) {
}

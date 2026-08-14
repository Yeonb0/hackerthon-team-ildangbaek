package com.ildangbaek.backend.api.record.dto;

public record SkinSlotStateResponse(
        boolean completed,
        Long skinRecordId,
        String summary
) {
}

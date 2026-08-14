package com.ildangbaek.backend.api.record.dto;

public record TimeSlotRecordStateResponse(
        ProductSlotStateResponse product,
        SkinSlotStateResponse skin
) {
}

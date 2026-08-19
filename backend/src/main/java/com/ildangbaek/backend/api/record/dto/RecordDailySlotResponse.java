package com.ildangbaek.backend.api.record.dto;

import java.util.List;

public record RecordDailySlotResponse(
        boolean completed,
        Long recordId,
        List<RecordDailyProductItemResponse> items
) {
}

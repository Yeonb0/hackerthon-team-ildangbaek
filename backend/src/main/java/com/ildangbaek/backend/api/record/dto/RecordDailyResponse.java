package com.ildangbaek.backend.api.record.dto;

import java.time.LocalDate;

public record RecordDailyResponse(
        LocalDate date,
        Integer skinScore,
        RecordDailySlotResponse morningProducts,
        RecordDailySlotResponse nightProducts,
        TimeSlotRecordStateResponse morning,
        TimeSlotRecordStateResponse night
) {
}

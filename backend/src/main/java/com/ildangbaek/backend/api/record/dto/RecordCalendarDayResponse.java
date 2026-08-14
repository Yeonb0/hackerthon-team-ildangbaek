package com.ildangbaek.backend.api.record.dto;

import java.time.LocalDate;

public record RecordCalendarDayResponse(
        LocalDate date,
        RecordDotStatus morning,
        RecordDotStatus night,
        boolean today
) {
}

package com.ildangbaek.backend.api.home.dto;

import com.ildangbaek.backend.api.record.dto.RecordDotStatus;
import java.time.LocalDate;

public record WeeklyCalendarDayResponse(
        LocalDate date,
        RecordDotStatus morning,
        RecordDotStatus night
) {
}

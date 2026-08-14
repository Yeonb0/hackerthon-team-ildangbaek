package com.ildangbaek.backend.api.record.dto;

import java.util.List;

public record RecordCalendarResponse(
        String yearMonth,
        List<RecordCalendarDayResponse> days,
        RecordMonthlySummaryResponse monthlySummary
) {
}

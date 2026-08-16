package com.ildangbaek.backend.api.record.dto;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;

public record RecordTodayResponse(
        LocalDate date,
        TimeSlot defaultTab,
        TimeSlotRecordStateResponse morning,
        TimeSlotRecordStateResponse night
) {
}

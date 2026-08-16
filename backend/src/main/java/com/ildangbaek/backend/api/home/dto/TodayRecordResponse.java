package com.ildangbaek.backend.api.home.dto;

public record TodayRecordResponse(
        TodayRecordSlotResponse morning,
        TodayRecordSlotResponse night
) {
}

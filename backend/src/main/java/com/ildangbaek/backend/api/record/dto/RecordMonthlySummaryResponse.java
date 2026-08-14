package com.ildangbaek.backend.api.record.dto;

public record RecordMonthlySummaryResponse(
        long productRecordCount,
        long skinRecordCount
) {
}

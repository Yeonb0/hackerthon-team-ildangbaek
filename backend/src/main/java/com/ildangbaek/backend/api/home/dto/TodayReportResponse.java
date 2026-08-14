package com.ildangbaek.backend.api.home.dto;

public record TodayReportResponse(
        Long skinRecordId,
        int totalScore,
        Integer previousScore,
        Integer change,
        String comparedTo,
        String summary
) {
}

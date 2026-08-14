package com.ildangbaek.backend.api.home.dto;

import java.util.List;

public record HomeResponse(
        HomeType homeType,
        String greeting,
        String recordPrompt,
        HomeEnvironmentResponse environment,
        RoutineRecommendationResponse routineRecommendation,
        TodayRecordResponse todayRecord,
        List<WeeklyCalendarDayResponse> weeklyCalendar,
        TodayReportResponse todayReport,
        List<FailedSectionResponse> failedSections
) {
}

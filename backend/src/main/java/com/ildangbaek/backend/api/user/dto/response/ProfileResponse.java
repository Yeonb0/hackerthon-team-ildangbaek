package com.ildangbaek.backend.api.user.dto.response;

import com.ildangbaek.backend.api.onboard.dto.request.HormoneStatus;
import java.time.LocalDate;
import java.util.List;

public record ProfileResponse(
        String name,
        String gender,
        Integer age,
        List<String> skinTypes,
        HormoneStatus hormoneStatus,
        LocalDate lastPeriodStartDate,
        Integer averageCycleDays,
        String location,
        boolean notificationEnabled
) {
}

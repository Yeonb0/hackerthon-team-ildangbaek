package com.ildangbaek.backend.api.onboard.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record HormoneRequest(
        @NotNull HormoneStatus hormoneStatus,
        LocalDate lastPeriodStartDate,
        @Min(20) @Max(45) Integer averageCycleDays
) {
}

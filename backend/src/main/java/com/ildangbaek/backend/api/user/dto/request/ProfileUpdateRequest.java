package com.ildangbaek.backend.api.user.dto.request;

import com.ildangbaek.backend.api.onboard.dto.request.HormoneStatus;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record ProfileUpdateRequest(
        @Size(min = 1, max = 10) String name,
        GenderRequest gender,
        @Min(10) @Max(100) Integer age,
        List<SkinTypeCode> skinTypes,
        HormoneStatus hormoneStatus,
        LocalDate lastPeriodStartDate,
        @Min(20) @Max(45) Integer averageCycleDays
) {
}

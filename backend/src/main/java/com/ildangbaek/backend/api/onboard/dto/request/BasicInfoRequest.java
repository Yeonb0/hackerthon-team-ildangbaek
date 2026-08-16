package com.ildangbaek.backend.api.onboard.dto.request;

import com.ildangbaek.backend.api.user.dto.request.GenderRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BasicInfoRequest(
        @NotBlank @Size(max = 10) String name,
        @NotNull GenderRequest gender,
        @NotNull @Min(10) @Max(100) Integer age
) {
}

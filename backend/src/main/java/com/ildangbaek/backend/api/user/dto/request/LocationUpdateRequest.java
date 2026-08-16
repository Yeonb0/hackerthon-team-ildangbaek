package com.ildangbaek.backend.api.user.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record LocationUpdateRequest(
        Long locationId,

        @DecimalMin("-90.0")
        @DecimalMax("90.0")
        Double latitude,

        @DecimalMin("-180.0")
        @DecimalMax("180.0")
        Double longitude
) {

    @AssertTrue(message = "locationId or latitude/longitude is required.")
    public boolean isLocationProvided() {
        return locationId != null || (latitude != null && longitude != null);
    }
}

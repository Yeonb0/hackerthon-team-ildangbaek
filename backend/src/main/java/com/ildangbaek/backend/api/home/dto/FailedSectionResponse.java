package com.ildangbaek.backend.api.home.dto;

public record FailedSectionResponse(
        String section,
        String code,
        String message
) {
}

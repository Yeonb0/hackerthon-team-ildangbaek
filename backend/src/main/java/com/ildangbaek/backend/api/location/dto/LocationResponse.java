package com.ildangbaek.backend.api.location.dto;

public record LocationResponse(
        Long locationId,
        String name,
        boolean current
) {
}

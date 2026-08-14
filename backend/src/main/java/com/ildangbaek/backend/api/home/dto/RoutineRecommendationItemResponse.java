package com.ildangbaek.backend.api.home.dto;

public record RoutineRecommendationItemResponse(
        int rank,
        Long productId,
        String name,
        String reason
) {
}

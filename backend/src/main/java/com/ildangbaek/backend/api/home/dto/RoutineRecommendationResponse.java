package com.ildangbaek.backend.api.home.dto;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.util.List;

public record RoutineRecommendationResponse(
        TimeSlot timeSlot,
        List<RoutineRecommendationItemResponse> items
) {
}

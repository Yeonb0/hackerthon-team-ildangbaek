package com.ildangbaek.backend.api.productrecord.dto.response;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.util.List;

public record ProductRecordHomeResponse(
        TimeSlot timeSlot,
        boolean alreadyRecorded,
        List<RoutineSummaryResponse> routines,
        List<SavedProductSummaryResponse> savedProducts
) {
}

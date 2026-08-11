package com.ildangbaek.backend.api.onboard.dto.response;

import java.util.List;

public record OnboardingCompleteResponse(
        boolean onboardingCompleted,
        List<SummaryItem> summary
) {

    public record SummaryItem(
            String label,
            String value
    ) {
    }
}

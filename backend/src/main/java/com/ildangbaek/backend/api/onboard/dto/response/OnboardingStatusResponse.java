package com.ildangbaek.backend.api.onboard.dto.response;

import java.util.Map;

public record OnboardingStatusResponse(
        boolean onboardingCompleted,
        String nextStep,
        int currentStepIndex,
        int totalStepCount,
        Map<String, StepStatus> steps
) {

    public record StepStatus(
            boolean completed,
            boolean required
    ) {
    }
}

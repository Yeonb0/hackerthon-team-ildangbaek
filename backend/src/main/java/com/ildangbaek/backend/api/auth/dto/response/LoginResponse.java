package com.ildangbaek.backend.api.auth.dto.response;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        boolean isNewUser,
        boolean onboardingCompleted,
        String nextStep
) {
}

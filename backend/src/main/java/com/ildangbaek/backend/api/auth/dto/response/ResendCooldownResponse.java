package com.ildangbaek.backend.api.auth.dto.response;

public record ResendCooldownResponse(
        int remainingSeconds
) {
}

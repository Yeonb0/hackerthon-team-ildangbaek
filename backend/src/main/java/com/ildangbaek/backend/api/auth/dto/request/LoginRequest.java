package com.ildangbaek.backend.api.auth.dto.request;

import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
        @NotNull AuthProvider provider,
        @NotBlank String oauthAccessToken
) {
}

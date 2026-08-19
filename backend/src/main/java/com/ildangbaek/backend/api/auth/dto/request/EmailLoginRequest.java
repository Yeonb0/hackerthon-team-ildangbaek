package com.ildangbaek.backend.api.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailLoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
) {
}

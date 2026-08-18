package com.ildangbaek.backend.api.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendEmailCodeRequest(
        @Email @NotBlank String email
) {
}

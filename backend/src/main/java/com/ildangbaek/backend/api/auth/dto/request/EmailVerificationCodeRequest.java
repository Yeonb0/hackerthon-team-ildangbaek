package com.ildangbaek.backend.api.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record EmailVerificationCodeRequest(
        @Email @NotBlank String email,
        @Pattern(regexp = "^\\d{6}$", message = "인증코드는 6자리 숫자여야 합니다.")
        String code
) {
}

package com.ildangbaek.backend.api.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record EmailSignupRequest(
        @Email @NotBlank String email,
        @NotBlank
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$", message = "영문·숫자 포함 8자 이상 입력해주세요.")
        String password
) {
}

package com.ildangbaek.backend.api.auth.controller;

import com.ildangbaek.backend.api.auth.dto.request.EmailLoginRequest;
import com.ildangbaek.backend.api.auth.dto.request.EmailSignupRequest;
import com.ildangbaek.backend.api.auth.dto.request.EmailVerificationCodeRequest;
import com.ildangbaek.backend.api.auth.dto.request.LoginRequest;
import com.ildangbaek.backend.api.auth.dto.request.SendEmailCodeRequest;
import com.ildangbaek.backend.api.auth.dto.response.EmailVerificationResponse;
import com.ildangbaek.backend.api.auth.dto.response.LoginResponse;
import com.ildangbaek.backend.api.auth.dto.response.RefreshTokenResponse;
import com.ildangbaek.backend.api.auth.dto.response.ResendCooldownResponse;
import com.ildangbaek.backend.api.auth.service.AuthService;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/email/login")
    public ApiResponse<LoginResponse> emailLogin(@Valid @RequestBody EmailLoginRequest request) {
        return ApiResponse.success(authService.emailLogin(request));
    }

    @PostMapping("/email/send-code")
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody SendEmailCodeRequest request) {
        authService.sendEmailCode(request);
        return ApiResponse.success();
    }

    @PostMapping("/email/verify-code")
    public ApiResponse<EmailVerificationResponse> verifyEmailCode(
            @Valid @RequestBody EmailVerificationCodeRequest request
    ) {
        return ApiResponse.success(authService.verifyEmailCode(request));
    }

    @PostMapping("/email/signup")
    public ApiResponse<LoginResponse> emailSignup(@Valid @RequestBody EmailSignupRequest request) {
        return ApiResponse.success(authService.emailSignup(request));
    }

    @PostMapping("/email/resend-cooldown")
    public ApiResponse<ResendCooldownResponse> emailResendCooldown(
            @Valid @RequestBody SendEmailCodeRequest request
    ) {
        return ApiResponse.success(authService.emailResendCooldown(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<RefreshTokenResponse> refresh(
            @RequestHeader(value = "Refresh-Token", required = false) String refreshToken
    ) {
        return ApiResponse.success(authService.refresh(refreshToken));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.success();
    }
}

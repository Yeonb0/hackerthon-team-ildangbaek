package com.ildangbaek.backend.api.onboard.controller;

import com.ildangbaek.backend.api.auth.service.CurrentUserResolver;
import com.ildangbaek.backend.api.onboard.dto.request.BasicInfoRequest;
import com.ildangbaek.backend.api.onboard.dto.request.HormoneRequest;
import com.ildangbaek.backend.api.onboard.dto.request.SkinTypesRequest;
import com.ildangbaek.backend.api.onboard.dto.response.HormoneResponse;
import com.ildangbaek.backend.api.onboard.dto.response.OnboardingCompleteResponse;
import com.ildangbaek.backend.api.onboard.dto.response.OnboardingStatusResponse;
import com.ildangbaek.backend.api.onboard.service.OnboardingService;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me/onboarding")
public class OnboardingController {

    private final CurrentUserResolver currentUserResolver;
    private final OnboardingService onboardingService;

    @GetMapping
    public ApiResponse<OnboardingStatusResponse> getStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(onboardingService.getStatus(user));
    }

    @PatchMapping("/basic-info")
    public ApiResponse<OnboardingStatusResponse> saveBasicInfo(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody BasicInfoRequest request
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(onboardingService.saveBasicInfo(user, request));
    }

    @PatchMapping("/skin-types")
    public ApiResponse<OnboardingStatusResponse> saveSkinTypes(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody SkinTypesRequest request
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(onboardingService.saveSkinTypes(user, request));
    }

    @PatchMapping("/hormone")
    public ApiResponse<HormoneResponse> saveHormone(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody HormoneRequest request
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(onboardingService.saveHormone(user, request));
    }

    @PostMapping("/complete")
    public ApiResponse<OnboardingCompleteResponse> complete(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(onboardingService.complete(user));
    }
}

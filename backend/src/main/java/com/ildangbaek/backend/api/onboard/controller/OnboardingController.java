package com.ildangbaek.backend.api.onboard.controller;

import com.ildangbaek.backend.api.onboard.dto.request.BasicInfoRequest;
import com.ildangbaek.backend.api.onboard.dto.request.HormoneRequest;
import com.ildangbaek.backend.api.onboard.dto.request.SkinTypesRequest;
import com.ildangbaek.backend.api.onboard.dto.response.HormoneResponse;
import com.ildangbaek.backend.api.onboard.dto.response.OnboardingCompleteResponse;
import com.ildangbaek.backend.api.onboard.dto.response.OnboardingStatusResponse;
import com.ildangbaek.backend.api.onboard.service.OnboardingService;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me/onboarding")
public class OnboardingController {

    private final OnboardingService onboardingService;

    @GetMapping
    public ApiResponse<OnboardingStatusResponse> getStatus(
            @CurrentUserId User user
    ) {
        return ApiResponse.success(onboardingService.getStatus(user));
    }

    @PatchMapping("/basic-info")
    public ApiResponse<OnboardingStatusResponse> saveBasicInfo(
            @CurrentUserId User user,
            @Valid @RequestBody BasicInfoRequest request
    ) {
        return ApiResponse.success(onboardingService.saveBasicInfo(user, request));
    }

    @PatchMapping("/skin-types")
    public ApiResponse<OnboardingStatusResponse> saveSkinTypes(
            @CurrentUserId User user,
            @Valid @RequestBody SkinTypesRequest request
    ) {
        return ApiResponse.success(onboardingService.saveSkinTypes(user, request));
    }

    @PatchMapping("/hormone")
    public ApiResponse<HormoneResponse> saveHormone(
            @CurrentUserId User user,
            @Valid @RequestBody HormoneRequest request
    ) {
        return ApiResponse.success(onboardingService.saveHormone(user, request));
    }

    @PostMapping("/complete")
    public ApiResponse<OnboardingCompleteResponse> complete(
            @CurrentUserId User user
    ) {
        return ApiResponse.success(onboardingService.complete(user));
    }
}

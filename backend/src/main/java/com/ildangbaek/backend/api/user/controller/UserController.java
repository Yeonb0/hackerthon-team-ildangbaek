package com.ildangbaek.backend.api.user.controller;

import com.ildangbaek.backend.api.auth.service.CurrentUserResolver;
import com.ildangbaek.backend.api.user.dto.request.NotificationSettingRequest;
import com.ildangbaek.backend.api.user.dto.response.MyPageResponse;
import com.ildangbaek.backend.api.user.dto.response.NotificationSettingResponse;
import com.ildangbaek.backend.api.user.dto.response.SavedProductResponse;
import com.ildangbaek.backend.api.user.service.UserService;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me")
public class UserController {

    private final CurrentUserResolver currentUserResolver;
    private final UserService userService;

    @GetMapping
    public ApiResponse<MyPageResponse> getMe(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(userService.getMe(user));
    }

    @PatchMapping("/notification")
    public ApiResponse<NotificationSettingResponse> updateNotification(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody NotificationSettingRequest request
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(userService.updateNotification(user, request));
    }

    @GetMapping("/products")
    public ApiResponse<List<SavedProductResponse>> getSavedProducts(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(userService.getSavedProducts(user));
    }
}

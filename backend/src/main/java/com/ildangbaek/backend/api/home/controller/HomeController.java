package com.ildangbaek.backend.api.home.controller;

import com.ildangbaek.backend.api.home.dto.HomeResponse;
import com.ildangbaek.backend.api.home.dto.HomeType;
import com.ildangbaek.backend.api.home.service.HomeService;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/home")
public class HomeController {

    private final HomeService homeService;

    @GetMapping
    public ApiResponse<HomeResponse> getHome(
            @CurrentUserId Long userId,
            @RequestParam(required = false) HomeType homeType
    ) {
        return ApiResponse.success(homeService.getHome(userId, homeType));
    }
}

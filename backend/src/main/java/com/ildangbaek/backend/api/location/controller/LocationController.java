package com.ildangbaek.backend.api.location.controller;

import com.ildangbaek.backend.api.location.dto.LocationResponse;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/locations")
public class LocationController {

    private static final List<LocationSeed> LOCATIONS = List.of(
            new LocationSeed(1L, "Seoul"),
            new LocationSeed(2L, "Gyeonggi"),
            new LocationSeed(3L, "Incheon"),
            new LocationSeed(4L, "Busan"),
            new LocationSeed(5L, "Daegu"),
            new LocationSeed(6L, "Gwangju")
    );

    private final UserProfileRepository userProfileRepository;

    @GetMapping
    public ApiResponse<List<LocationResponse>> searchLocations(
            @CurrentUserId Long userId,
            @RequestParam(required = false) String keyword
    ) {
        String current = userProfileRepository.findByUserId(userId)
                .map(UserProfile::getRegionName)
                .orElse(null);
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        List<LocationResponse> result = LOCATIONS.stream()
                .filter(location -> normalizedKeyword.isBlank()
                        || location.name().toLowerCase(Locale.ROOT).contains(normalizedKeyword))
                .map(location -> new LocationResponse(
                        location.locationId(),
                        location.name(),
                        location.name().equals(current)))
                .toList();

        return ApiResponse.success(result);
    }

    private record LocationSeed(Long locationId, String name) {
    }
}

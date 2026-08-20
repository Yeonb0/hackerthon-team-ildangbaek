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
            new LocationSeed(1L, "서울 강남구"),
            new LocationSeed(2L, "서울 마포구"),
            new LocationSeed(3L, "서울 종로구"),
            new LocationSeed(4L, "서울 송파구"),
            new LocationSeed(5L, "서울 서대문구"),
            new LocationSeed(6L, "인천 연수구"),
            new LocationSeed(7L, "인천 남동구"),
            new LocationSeed(8L, "경기 성남시 분당구"),
            new LocationSeed(9L, "경기 수원시 영통구"),
            new LocationSeed(10L, "경기 고양시 일산동구"),
            new LocationSeed(11L, "부산 해운대구"),
            new LocationSeed(12L, "부산 수영구"),
            new LocationSeed(13L, "대구 수성구"),
            new LocationSeed(14L, "광주 서구"),
            new LocationSeed(15L, "대전 유성구"),
            new LocationSeed(16L, "울산 남구"),
            new LocationSeed(17L, "세종특별자치시"),
            new LocationSeed(18L, "강원 춘천시"),
            new LocationSeed(19L, "강원 강릉시"),
            new LocationSeed(20L, "충북 청주시 흥덕구"),
            new LocationSeed(21L, "충남 천안시 서북구"),
            new LocationSeed(22L, "전북 전주시 완산구"),
            new LocationSeed(23L, "전남 여수시"),
            new LocationSeed(24L, "경북 포항시 남구"),
            new LocationSeed(25L, "경남 창원시 성산구"),
            new LocationSeed(26L, "제주 제주시"),
            new LocationSeed(27L, "제주 서귀포시")
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

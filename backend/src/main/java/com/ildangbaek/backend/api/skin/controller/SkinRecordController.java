package com.ildangbaek.backend.api.skin.controller;

import com.ildangbaek.backend.api.skin.dto.SkinRecordCreateRequest;
import com.ildangbaek.backend.api.skin.dto.SkinRecordResponse;
import com.ildangbaek.backend.api.skin.service.SkinRecordService;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 피부 기록 API. (docs/api_명세서.md 9장)
 */
@RestController
@RequestMapping("/api/v1/skin-records")
@RequiredArgsConstructor
public class SkinRecordController {

    private final SkinRecordService skinRecordService;

    /**
     * SKIN-01 · 피부 기록 생성 및 분석.
     *
     * <p>{@code ApiResponse.created(...)}는 body의 code만 바꿀 뿐 HTTP 상태를 201로 만들지 않는다.
     * 명세가 201을 요구하므로 {@code @ResponseStatus}를 함께 붙인다.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SkinRecordResponse> create(
            @CurrentUserId Long userId,
            @RequestPart("image") MultipartFile image,
            @Valid @ModelAttribute SkinRecordCreateRequest request) {
        return ApiResponse.created(skinRecordService.create(userId, image, request.toTimeSlot()));
    }

    /**
     * SKIN-02 · 오늘 피부 결과 조회. {@code timeSlot} 미지정 시 가장 최근 기록을 반환한다.
     */
    @GetMapping("/today")
    public ApiResponse<SkinRecordResponse> getToday(
            @CurrentUserId Long userId,
            @RequestParam(required = false) String timeSlot) {
        return ApiResponse.success(skinRecordService.getToday(userId, parseTimeSlot(timeSlot)));
    }

    /**
     * SKIN-03 · 피부 기록 상세 조회.
     */
    @GetMapping("/{skinRecordId}")
    public ApiResponse<SkinRecordResponse> getDetail(
            @CurrentUserId Long userId,
            @PathVariable Long skinRecordId) {
        return ApiResponse.success(skinRecordService.getDetail(userId, skinRecordId));
    }

    private TimeSlot parseTimeSlot(String timeSlot) {
        if (timeSlot == null || timeSlot.isBlank()) {
            return null;
        }
        try {
            return TimeSlot.valueOf(timeSlot.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.RECORD_INVALID_TIME_SLOT);
        }
    }
}

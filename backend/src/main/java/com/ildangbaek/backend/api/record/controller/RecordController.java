package com.ildangbaek.backend.api.record.controller;

import com.ildangbaek.backend.api.record.dto.RecordCalendarResponse;
import com.ildangbaek.backend.api.record.dto.RecordTodayResponse;
import com.ildangbaek.backend.api.record.service.RecordHubService;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.response.ApiResponse;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/records")
public class RecordController {

    private final RecordHubService recordHubService;

    @GetMapping("/calendar")
    public ApiResponse<RecordCalendarResponse> getCalendar(
            @CurrentUserId Long userId,
            @RequestParam(required = false) String yearMonth
    ) {
        return ApiResponse.success(recordHubService.getCalendar(userId, parseYearMonth(yearMonth)));
    }

    @GetMapping("/today")
    public ApiResponse<RecordTodayResponse> getToday(@CurrentUserId Long userId) {
        return ApiResponse.success(recordHubService.getToday(userId));
    }

    private YearMonth parseYearMonth(String yearMonth) {
        if (yearMonth == null || yearMonth.isBlank()) {
            return null;
        }
        try {
            return YearMonth.parse(yearMonth);
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ErrorCode.RECORD_INVALID_MONTH);
        }
    }
}

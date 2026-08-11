package com.ildangbaek.backend.api.report.controller;

import com.ildangbaek.backend.api.report.dto.ReportDailyResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightDetailResponse;
import com.ildangbaek.backend.api.report.dto.ReportResponse;
import com.ildangbaek.backend.api.report.service.ReportService;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.response.ApiResponse;
import java.time.LocalDate;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 리포트 API. (docs/api_명세서.md 11장)
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final SkinMetricType DEFAULT_METRIC = SkinMetricType.TROUBLE;

    private final ReportService reportService;

    /**
     * REPORT-01 · 리포트 조회.
     */
    @GetMapping
    public ApiResponse<ReportResponse> getReport(
            @CurrentUserId Long userId,
            @RequestParam int period,
            @RequestParam(required = false) String metric) {
        return ApiResponse.success(reportService.getReport(userId, period, parseMetric(metric)));
    }

    /**
     * REPORT-02 · 요인 상세 조회.
     *
     * <p>지표 전환은 지원하지 않는다 — 인사이트가 다루는 지표를 그대로 내려준다 (TBD-11 해소).
     */
    @GetMapping("/insights/{insightId}")
    public ApiResponse<ReportInsightDetailResponse> getInsightDetail(
            @CurrentUserId Long userId,
            @PathVariable Long insightId) {
        return ApiResponse.success(reportService.getInsightDetail(userId, insightId));
    }

    /**
     * REPORT-03 · 일자별 리포트 조회. {@code timeSlot} 미지정 시 그 날짜의 모든 기록을 배열로 반환한다.
     */
    @GetMapping("/daily")
    public ApiResponse<ReportDailyResponse> getDailyReport(
            @CurrentUserId Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String timeSlot) {
        return ApiResponse.success(reportService.getDailyReport(userId, date, parseTimeSlot(timeSlot)));
    }

    /**
     * SKIN-02와 같은 규칙으로 읽는다 — 정의되지 않은 값은 400 {@code RECORD_INVALID_TIME_SLOT}이다.
     */
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

    private SkinMetricType parseMetric(String metric) {
        if (metric == null || metric.isBlank()) {
            return DEFAULT_METRIC;
        }
        try {
            return SkinMetricType.valueOf(metric.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED);
        }
    }
}

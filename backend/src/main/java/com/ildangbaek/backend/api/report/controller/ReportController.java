package com.ildangbaek.backend.api.report.controller;

import com.ildangbaek.backend.api.report.dto.ReportResponse;
import com.ildangbaek.backend.api.report.service.ReportService;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.response.ApiResponse;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
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

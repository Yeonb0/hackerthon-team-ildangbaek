package com.ildangbaek.backend.api.report.service;

import com.ildangbaek.backend.api.report.dto.ReportGraphPointResponse;
import com.ildangbaek.backend.api.report.dto.ReportResponse;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * REPORT-01 · 리포트 조회. Analysis 결과를 보여줄 뿐 분석 자체를 실행하지 않는다.
 *
 * <p>{@code insights}는 F-ANALYSIS-01(성분-피부 시차 분석)이 아직 구현되지 않아 항상 빈 배열이다.
 * 실제 분석 데이터가 있는 인사이트만 반환한다는 명세 규칙과 정합적이다.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final Set<Integer> ALLOWED_PERIODS = Set.of(7, 30);

    private final SkinRecordRepository skinRecordRepository;
    private final SkinMetricRepository skinMetricRepository;

    public ReportResponse getReport(Long userId, int period, SkinMetricType metric) {
        if (!ALLOWED_PERIODS.contains(period)) {
            throw new BusinessException(ErrorCode.REPORT_INVALID_PERIOD);
        }

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(period - 1L);

        List<SkinRecord> records = skinRecordRepository
                .findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, startDate, endDate);
        if (records.isEmpty()) {
            throw new BusinessException(ErrorCode.REPORT_DATA_INSUFFICIENT);
        }

        Map<LocalDate, SkinRecord> representativeByDate = pickRepresentativePerDate(records);
        Map<Long, Integer> scoreByRecordId = loadMetricScores(representativeByDate.values(), metric);

        List<ReportGraphPointResponse> graph = startDate.datesUntil(endDate.plusDays(1))
                .map(date -> {
                    SkinRecord record = representativeByDate.get(date);
                    Integer score = record == null ? null : scoreByRecordId.get(record.getId());
                    return new ReportGraphPointResponse(date, score);
                })
                .toList();

        return new ReportResponse(period, metric, graph, List.of(), Collections.emptyList());
    }

    /**
     * 하루 2건(모닝·나이트)이 있을 수 있다. 대표값은 나이트 우선, 없으면 모닝이다. (TBD-12, 제안 규칙)
     */
    private Map<LocalDate, SkinRecord> pickRepresentativePerDate(List<SkinRecord> records) {
        Map<LocalDate, SkinRecord> representative = new HashMap<>();
        for (SkinRecord record : records) {
            SkinRecord current = representative.get(record.getRecordDate());
            if (current == null || record.getTimeSlot() == TimeSlot.NIGHT) {
                representative.put(record.getRecordDate(), record);
            }
        }
        return representative;
    }

    private Map<Long, Integer> loadMetricScores(java.util.Collection<SkinRecord> records, SkinMetricType metric) {
        List<Long> recordIds = records.stream().map(SkinRecord::getId).toList();
        Map<Long, Integer> scoreByRecordId = new HashMap<>();
        for (SkinMetric skinMetric : skinMetricRepository.findAllBySkinRecordIdIn(recordIds)) {
            if (skinMetric.getMetricType() == metric) {
                scoreByRecordId.put(skinMetric.getSkinRecord().getId(), skinMetric.getMetricValue().intValue());
            }
        }
        return scoreByRecordId;
    }
}

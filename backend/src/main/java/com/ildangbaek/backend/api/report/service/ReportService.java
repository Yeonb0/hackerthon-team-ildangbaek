package com.ildangbaek.backend.api.report.service;

import com.ildangbaek.backend.api.report.dto.ReportGraphPointResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightResponse;
import com.ildangbaek.backend.api.report.dto.ReportResponse;
import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import com.ildangbaek.backend.domain.analysis.repository.AnalysisInsightRepository;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.math.BigDecimal;
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
 * <p>{@code insights}는 F-ANALYSIS-01이 {@code analysis_insights}에 남긴 행을 읽어 채운다.
 * 분석 결과가 없으면 빈 배열이며, 이는 명세 BR 4("실제 분석 데이터가 있는 인사이트만 반환")와 정합적이다.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final Set<Integer> ALLOWED_PERIODS = Set.of(7, 30);

    /**
     * {@code confidence}를 OBSERVED로 표시할 하한. F-ANALYSIS-01의 패턴 확정 임계값과 같은 값이라
     * "확정된 패턴 = OBSERVED"가 성립한다. (ADR 0009)
     */
    private static final BigDecimal OBSERVED_THRESHOLD = BigDecimal.valueOf(67);

    private final SkinRecordRepository skinRecordRepository;
    private final SkinMetricRepository skinMetricRepository;
    private final AnalysisInsightRepository analysisInsightRepository;

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

        return new ReportResponse(period, metric, graph, loadInsights(userId, startDate),
                Collections.emptyList());
    }

    /**
     * F-ANALYSIS-01이 남긴 인사이트를 카드로 변환한다. 분석 결과가 없으면 빈 배열이다. (BR 4)
     */
    private List<ReportInsightResponse> loadInsights(Long userId, LocalDate startDate) {
        return analysisInsightRepository
                .findAllByUserIdAndStartDateGreaterThanEqualOrderByConfidenceScoreDesc(userId, startDate)
                .stream()
                .map(insight -> new ReportInsightResponse(
                        insight.getId(),
                        insight.getInsightType().name(),
                        insight.getTitle(),
                        insight.getDescription(),
                        confidenceOf(insight)))
                .toList();
    }

    /**
     * 신뢰도 점수를 화면 문구로 바꾼다. 임계값 미만은 반복성이 확보되지 않은 상태이므로 OBSERVING이다.
     */
    private String confidenceOf(AnalysisInsight insight) {
        BigDecimal score = insight.getConfidenceScore();
        return score != null && score.compareTo(OBSERVED_THRESHOLD) >= 0 ? "OBSERVED" : "OBSERVING";
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

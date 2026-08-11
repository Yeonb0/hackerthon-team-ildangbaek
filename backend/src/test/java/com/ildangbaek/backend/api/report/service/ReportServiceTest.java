package com.ildangbaek.backend.api.report.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.report.dto.ReportGraphPointResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightResponse;
import com.ildangbaek.backend.api.report.dto.ReportResponse;
import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import com.ildangbaek.backend.domain.analysis.entity.InsightType;
import com.ildangbaek.backend.domain.analysis.repository.AnalysisInsightRepository;
import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * REPORT-01의 업무 규칙을 고정한다 — 기간 검증 · 결측 null · 모닝/나이트 분리 반환(ADR 0012).
 * DB 없이 돌도록 리포지토리는 목으로 둔다.
 */
@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private SkinRecordRepository skinRecordRepository;
    @Mock
    private SkinMetricRepository skinMetricRepository;
    @Mock
    private AnalysisInsightRepository analysisInsightRepository;

    private ReportService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new ReportService(skinRecordRepository, skinMetricRepository, analysisInsightRepository);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
    }

    private SkinRecord record(Long id, LocalDate date, TimeSlot slot) {
        SkinRecord record = SkinRecord.builder()
                .user(user)
                .recordDate(date)
                .timeSlot(slot)
                .imageUrl("/images/x.jpg")
                .analysisMethod(AnalysisMethod.MOCK)
                .capturedAt(LocalDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(), 8, 0))
                .build();
        record.completeAnalysis(BigDecimal.valueOf(70));
        ReflectionTestUtils.setField(record, "id", id);
        return record;
    }

    private SkinMetric metric(SkinRecord record, SkinMetricType type, int value) {
        return SkinMetric.builder()
                .skinRecord(record)
                .metricType(type)
                .metricValue(BigDecimal.valueOf(value))
                .build();
    }

    @DisplayName("period가 7, 30이 아니면 422 REPORT_INVALID_PERIOD")
    @Test
    void rejectsInvalidPeriod() {
        assertThatThrownBy(() -> service.getReport(1L, 14, SkinMetricType.TROUBLE))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPORT_INVALID_PERIOD);
    }

    @DisplayName("기간 내 기록이 하나도 없으면 409 REPORT_DATA_INSUFFICIENT")
    @Test
    void rejectsWhenNoRecords() {
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> service.getReport(1L, 7, SkinMetricType.TROUBLE))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPORT_DATA_INSUFFICIENT);
    }

    @DisplayName("기록이 없는 날짜는 두 슬롯 모두 null이다 — 0으로 계산하지 않는다")
    @Test
    void missingDateHasNullScores() {
        LocalDate today = LocalDate.now();
        SkinRecord onlyRecord = record(1L, today, TimeSlot.MORNING);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(onlyRecord));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList()))
                .thenReturn(List.of(metric(onlyRecord, SkinMetricType.TROUBLE, 74)));

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.TROUBLE);

        assertThat(response.graph()).hasSize(7);
        long emptyDays = response.graph().stream()
                .filter(p -> p.morningScore() == null && p.nightScore() == null).count();
        assertThat(emptyDays).isEqualTo(6);
        assertThat(pointOf(response, today).morningScore()).isEqualTo(74);
    }

    @DisplayName("하루 2건이면 모닝·나이트를 각각 내려준다 — 대표값으로 접지 않는다")
    @Test
    void keepsBothSlotsForOneDate() {
        LocalDate today = LocalDate.now();
        SkinRecord morning = record(1L, today, TimeSlot.MORNING);
        SkinRecord night = record(2L, today, TimeSlot.NIGHT);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(morning, night));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(List.of(
                metric(morning, SkinMetricType.TROUBLE, 60),
                metric(night, SkinMetricType.TROUBLE, 90)));

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.TROUBLE);

        ReportGraphPointResponse todayPoint = pointOf(response, today);
        assertThat(todayPoint.morningScore()).isEqualTo(60);
        assertThat(todayPoint.nightScore()).isEqualTo(90);
    }

    @DisplayName("하루에 한쪽만 기록한 날은 없는 슬롯이 null이다")
    @Test
    void missingSlotIsNullOnPartiallyRecordedDate() {
        LocalDate today = LocalDate.now();
        SkinRecord morning = record(1L, today, TimeSlot.MORNING);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(morning));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList()))
                .thenReturn(List.of(metric(morning, SkinMetricType.TROUBLE, 60)));

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.TROUBLE);

        ReportGraphPointResponse todayPoint = pointOf(response, today);
        assertThat(todayPoint.morningScore()).isEqualTo(60);
        assertThat(todayPoint.nightScore()).isNull();
    }

    private ReportGraphPointResponse pointOf(ReportResponse response, LocalDate date) {
        return response.graph().stream()
                .filter(p -> p.date().equals(date)).findFirst().orElseThrow();
    }

    @DisplayName("분석 인사이트가 없으면 insights는 빈 배열이다")
    @Test
    void insightsEmptyWhenNoAnalysis() {
        LocalDate today = LocalDate.now();
        SkinRecord onlyRecord = record(1L, today, TimeSlot.MORNING);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(onlyRecord));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList()))
                .thenReturn(List.of(metric(onlyRecord, SkinMetricType.TROUBLE, 74)));
        when(analysisInsightRepository.findAllByUserIdAndStartDateGreaterThanEqualOrderByConfidenceScoreDesc(
                anyLong(), any())).thenReturn(List.of());

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.TROUBLE);

        assertThat(response.insights()).isEmpty();
        assertThat(response.failedSections()).isEmpty();
    }

    @DisplayName("신뢰도 임계값을 넘으면 OBSERVED, 못 넘으면 OBSERVING으로 내려간다")
    @Test
    void mapsConfidenceScoreToLabel() {
        LocalDate today = LocalDate.now();
        SkinRecord onlyRecord = record(1L, today, TimeSlot.MORNING);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(onlyRecord));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList()))
                .thenReturn(List.of(metric(onlyRecord, SkinMetricType.TROUBLE, 74)));
        when(analysisInsightRepository.findAllByUserIdAndStartDateGreaterThanEqualOrderByConfidenceScoreDesc(
                anyLong(), any())).thenReturn(List.of(
                        insight(101L, "레티놀", BigDecimal.valueOf(80)),
                        insight(102L, "나이아신아마이드", BigDecimal.valueOf(50))));

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.TROUBLE);

        assertThat(response.insights()).extracting(
                        ReportInsightResponse::insightId, ReportInsightResponse::confidence)
                .containsExactly(tuple(101L, "OBSERVED"), tuple(102L, "OBSERVING"));
        assertThat(response.insights().get(0).type()).isEqualTo("INGREDIENT");
    }

    private AnalysisInsight insight(Long id, String title, BigDecimal confidenceScore) {
        AnalysisInsight insight = AnalysisInsight.builder()
                .user(user)
                .insightType(InsightType.INGREDIENT)
                .metricType(SkinMetricType.TROUBLE)
                .title(title)
                .description("%s 사용 후 2일 뒤 트러블이 반복적으로 증가해요".formatted(title))
                .confidenceScore(confidenceScore)
                .build();
        ReflectionTestUtils.setField(insight, "id", id);
        return insight;
    }

    @DisplayName("metric 파라미터에 해당하는 지표만 그래프에 반영한다")
    @Test
    void usesOnlyRequestedMetric() {
        LocalDate today = LocalDate.now();
        SkinRecord onlyRecord = record(1L, today, TimeSlot.MORNING);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(onlyRecord));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(List.of(
                metric(onlyRecord, SkinMetricType.TROUBLE, 74),
                metric(onlyRecord, SkinMetricType.REDNESS, 66)));

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.REDNESS);

        assertThat(pointOf(response, today).morningScore()).isEqualTo(66);
        assertThat(response.metric()).isEqualTo(SkinMetricType.REDNESS);
    }
}

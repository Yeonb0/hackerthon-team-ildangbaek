package com.ildangbaek.backend.api.report.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.report.dto.ReportDailyResponse;
import com.ildangbaek.backend.api.report.dto.ReportGraphPointResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightDetailResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightEventResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightResponse;
import com.ildangbaek.backend.api.report.dto.ReportResponse;
import com.ildangbaek.backend.api.skin.dto.SkinRecordResponse;
import com.ildangbaek.backend.api.skin.dto.SkinScoresResponse;
import com.ildangbaek.backend.api.skin.service.SkinRecordService;
import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import com.ildangbaek.backend.domain.analysis.entity.InsightType;
import com.ildangbaek.backend.domain.analysis.repository.AnalysisInsightRepository;
import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import com.ildangbaek.backend.domain.environment.entity.EnvironmentDataSource;
import com.ildangbaek.backend.domain.environment.repository.DailyEnvironmentRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.SourceType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
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
import java.util.Optional;
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
    @Mock
    private SkinRecordService skinRecordService;

    @Mock
    private ProductRecordRepository productRecordRepository;
    @Mock
    private ProductRecordItemRepository productRecordItemRepository;
    @Mock
    private ProductIngredientRepository productIngredientRepository;
    @Mock
    private DailyEnvironmentRepository dailyEnvironmentRepository;

    private ReportService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new ReportService(skinRecordRepository, skinMetricRepository, analysisInsightRepository,
                skinRecordService, productRecordRepository, productRecordItemRepository,
                productIngredientRepository, dailyEnvironmentRepository);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", 1L);
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
        when(analysisInsightRepository.findAllByUserIdAndEndDateGreaterThanEqualOrderByConfidenceScoreDesc(
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
        when(analysisInsightRepository.findAllByUserIdAndEndDateGreaterThanEqualOrderByConfidenceScoreDesc(
                anyLong(), any())).thenReturn(List.of(
                        insight(101L, "레티놀", BigDecimal.valueOf(80)),
                        insight(102L, "나이아신아마이드", BigDecimal.valueOf(50))));

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.TROUBLE);

        assertThat(response.insights()).extracting(
                        ReportInsightResponse::insightId, ReportInsightResponse::confidence)
                .containsExactly(tuple(101L, "OBSERVED"), tuple(102L, "OBSERVING"));
        assertThat(response.insights().get(0).type()).isEqualTo("INGREDIENT");
    }

    @DisplayName("7일 리포트도 최근 30일 분석이 오늘 끝났으면 인사이트를 반환한다")
    @Test
    void includesRecentThirtyDayInsightInSevenDayReport() {
        LocalDate today = LocalDate.now();
        SkinRecord onlyRecord = record(1L, today, TimeSlot.MORNING);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(onlyRecord));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList()))
                .thenReturn(List.of(metric(onlyRecord, SkinMetricType.TROUBLE, 74)));
        when(analysisInsightRepository.findAllByUserIdAndEndDateGreaterThanEqualOrderByConfidenceScoreDesc(
                1L, today.minusDays(6)))
                .thenReturn(List.of(insight(101L, "레티놀", BigDecimal.valueOf(80))));

        ReportResponse response = service.getReport(1L, 7, SkinMetricType.TROUBLE);

        assertThat(response.insights()).extracting(ReportInsightResponse::insightId).containsExactly(101L);
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

    // --- REPORT-03 · 일자별 리포트 조회 ---

    private SkinRecordResponse response(SkinRecord record) {
        return new SkinRecordResponse(
                record.getId(),
                record.getTimeSlot(),
                record.getCapturedAt().atZone(java.time.ZoneId.of("Asia/Seoul")).toOffsetDateTime(),
                70,
                new SkinScoresResponse(74, 66, 71, 69),
                null);
    }

    @DisplayName("timeSlot 미지정이면 그 날짜의 모든 기록을 배열로 반환한다")
    @Test
    void dailyReturnsAllRecordsWhenSlotOmitted() {
        LocalDate date = LocalDate.now().minusDays(1);
        SkinRecord morning = record(1L, date, TimeSlot.MORNING);
        SkinRecord night = record(2L, date, TimeSlot.NIGHT);

        when(skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(1L, date))
                .thenReturn(List.of(morning, night));
        when(skinRecordService.toResponse(anyLong(), any()))
                .thenAnswer(invocation -> response(invocation.getArgument(1)));

        ReportDailyResponse response = service.getDailyReport(1L, date, null);

        assertThat(response.date()).isEqualTo(date);
        assertThat(response.records()).extracting(SkinRecordResponse::timeSlot)
                .containsExactly(TimeSlot.MORNING, TimeSlot.NIGHT);
    }

    @DisplayName("timeSlot을 지정하면 해당 슬롯 기록만 반환한다")
    @Test
    void dailyFiltersByTimeSlot() {
        LocalDate date = LocalDate.now().minusDays(1);
        SkinRecord morning = record(1L, date, TimeSlot.MORNING);
        SkinRecord night = record(2L, date, TimeSlot.NIGHT);

        when(skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(1L, date))
                .thenReturn(List.of(morning, night));
        when(skinRecordService.toResponse(anyLong(), any()))
                .thenAnswer(invocation -> response(invocation.getArgument(1)));

        ReportDailyResponse response = service.getDailyReport(1L, date, TimeSlot.NIGHT);

        assertThat(response.records()).extracting(SkinRecordResponse::timeSlot)
                .containsExactly(TimeSlot.NIGHT);
    }

    @DisplayName("기록이 없는 날짜는 빈 배열이다 — 오류가 아니다")
    @Test
    void dailyReturnsEmptyArrayWhenNoRecords() {
        LocalDate date = LocalDate.now().minusDays(3);

        when(skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(1L, date))
                .thenReturn(List.of());

        ReportDailyResponse response = service.getDailyReport(1L, date, null);

        assertThat(response.date()).isEqualTo(date);
        assertThat(response.records()).isEmpty();
    }

    @DisplayName("지정한 슬롯에 기록이 없으면 빈 배열이다 — 404가 아니다")
    @Test
    void dailyReturnsEmptyArrayWhenRequestedSlotMissing() {
        LocalDate date = LocalDate.now().minusDays(1);
        SkinRecord morning = record(1L, date, TimeSlot.MORNING);

        when(skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(1L, date))
                .thenReturn(List.of(morning));

        ReportDailyResponse response = service.getDailyReport(1L, date, TimeSlot.NIGHT);

        assertThat(response.records()).isEmpty();
    }

    @DisplayName("미래 날짜는 422 RECORD_FUTURE_DATE_NOT_ALLOWED")
    @Test
    void dailyRejectsFutureDate() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        assertThatThrownBy(() -> service.getDailyReport(1L, tomorrow, null))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.RECORD_FUTURE_DATE_NOT_ALLOWED);
    }

    @DisplayName("오늘 날짜는 미래로 보지 않는다")
    @Test
    void dailyAcceptsToday() {
        LocalDate today = LocalDate.now();

        when(skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(1L, today))
                .thenReturn(List.of());

        assertThat(service.getDailyReport(1L, today, null).records()).isEmpty();
    }

    // --- REPORT-02 · 요인 상세 조회 ---

    private static final LocalDate WINDOW_END = LocalDate.now();
    private static final LocalDate WINDOW_START = WINDOW_END.minusDays(29);

    private AnalysisInsight detailInsight(Long id, InsightType type, SkinMetricType metricType, String title,
                                          BigDecimal confidenceScore, Integer lagDays, BigDecimal averageDelta) {
        AnalysisInsight insight = AnalysisInsight.builder()
                .user(user)
                .insightType(type)
                .metricType(metricType)
                .title(title)
                .description("설명")
                .startDate(WINDOW_START)
                .endDate(WINDOW_END)
                .confidenceScore(confidenceScore)
                .lagDays(lagDays)
                .averageDelta(averageDelta)
                .build();
        ReflectionTestUtils.setField(insight, "id", id);
        return insight;
    }

    /** 성분 첫 사용 이벤트를 만들려면 제품 기록 → 항목 → 성분 세 조회가 모두 맞물려야 한다. */
    private void givenIngredientUsedOn(String ingredientName, LocalDate... dates) {
        Product product = Product.builder()
                .brandName("브랜드")
                .productName("세럼")
                .category(ProductCategory.SERUM)
                .dataSource(ProductDataSource.SAMPLE)
                .build();
        ReflectionTestUtils.setField(product, "id", 501L);

        Ingredient ingredient = Ingredient.builder().koreanName(ingredientName).build();
        ReflectionTestUtils.setField(ingredient, "id", 601L);

        List<ProductRecord> records = new java.util.ArrayList<>();
        List<ProductRecordItem> items = new java.util.ArrayList<>();
        long recordId = 701L;
        for (LocalDate date : dates) {
            ProductRecord productRecord = ProductRecord.builder()
                    .user(user)
                    .recordDate(date)
                    .timeSlot(TimeSlot.NIGHT)
                    .sourceType(SourceType.INDIVIDUAL)
                    .build();
            ReflectionTestUtils.setField(productRecord, "id", recordId++);
            records.add(productRecord);
            items.add(ProductRecordItem.builder().productRecord(productRecord).product(product).build());
        }

        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(records);
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList())).thenReturn(items);
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList())).thenReturn(
                List.of(ProductIngredient.builder().product(product).ingredient(ingredient).build()));
    }

    private DailyEnvironment environment(LocalDate date, BigDecimal uvIndexMax) {
        return DailyEnvironment.builder()
                .user(user)
                .recordDate(date)
                .uvIndexMax(uvIndexMax)
                .dataSource(EnvironmentDataSource.MOCK)
                .build();
    }

    @DisplayName("존재하지 않는 인사이트를 조회하면 404 REPORT_INSIGHT_NOT_FOUND")
    @Test
    void detailRejectsMissingInsight() {
        when(analysisInsightRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getInsightDetail(1L, 999L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPORT_INSIGHT_NOT_FOUND);
    }

    @DisplayName("다른 사용자의 인사이트는 존재 여부를 알리지 않고 404다 — 403이 아니다")
    @Test
    void detailHidesOtherUsersInsight() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "레티놀", BigDecimal.valueOf(80), 2, BigDecimal.valueOf(18));
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));

        assertThatThrownBy(() -> service.getInsightDetail(2L, 101L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPORT_INSIGHT_NOT_FOUND);
    }

    @DisplayName("그래프는 인사이트 기간을 조밀하게 채우고 기록 없는 슬롯은 null이다")
    @Test
    void detailGraphFillsWindowWithNulls() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "레티놀", BigDecimal.valueOf(80), 2, BigDecimal.valueOf(18));
        SkinRecord night = record(1L, WINDOW_END, TimeSlot.NIGHT);

        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(night));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList()))
                .thenReturn(List.of(metric(night, SkinMetricType.TROUBLE, 65)));

        ReportInsightDetailResponse response = service.getInsightDetail(1L, 101L);

        assertThat(response.graph()).hasSize(30);
        ReportGraphPointResponse last = response.graph().get(29);
        assertThat(last.nightScore()).isEqualTo(65);
        assertThat(last.morningScore()).isNull();
        assertThat(response.graph().get(0).nightScore()).isNull();
    }

    @DisplayName("metric은 인사이트의 지표를 그대로 돌려준다 — 지표 전환은 지원하지 않는다")
    @Test
    void detailEchoesInsightMetric() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.REDNESS,
                "레티놀", BigDecimal.valueOf(80), 2, BigDecimal.valueOf(12));
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());

        ReportInsightDetailResponse response = service.getInsightDetail(1L, 101L);

        assertThat(response.metric()).isEqualTo(SkinMetricType.REDNESS);
        assertThat(response.title()).isEqualTo("레티놀 추이");
        assertThat(response.subtitle()).isEqualTo("최근 30일 · 이벤트와 상관관계");
    }

    @DisplayName("인사이트에 지표가 없으면 트러블로 대체한다")
    @Test
    void detailFallsBackToTroubleWhenMetricMissing() {
        AnalysisInsight insight = detailInsight(101L, InsightType.ENVIRONMENT, null,
                "자외선", BigDecimal.valueOf(80), null, null);
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());

        assertThat(service.getInsightDetail(1L, 101L).metric()).isEqualTo(SkinMetricType.TROUBLE);
    }

    @DisplayName("성분 인사이트는 제목과 이름이 같은 성분의 기간 내 최초 사용일을 이벤트로 남긴다")
    @Test
    void detailAddsFirstUsageEvent() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "레티놀", BigDecimal.valueOf(80), 2, BigDecimal.valueOf(18));
        LocalDate firstUse = WINDOW_END.minusDays(18);

        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        givenIngredientUsedOn("레티놀", WINDOW_END.minusDays(12), firstUse, WINDOW_END.minusDays(6));

        List<ReportInsightEventResponse> events = service.getInsightDetail(1L, 101L).events();

        assertThat(events).hasSize(1);
        assertThat(events.get(0).date()).isEqualTo(firstUse);
        assertThat(events.get(0).label()).isEqualTo("레티놀 이 기간 첫 사용");
        assertThat(events.get(0).confidence()).isEqualTo("OBSERVED");
    }

    @DisplayName("확정된 인사이트의 이벤트는 시차와 변화량을 문구에 싣는다")
    @Test
    void detailObservedEventCarriesLagAndDelta() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "레티놀", BigDecimal.valueOf(80), 2, BigDecimal.valueOf(18));
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        givenIngredientUsedOn("레티놀", WINDOW_END.minusDays(18));

        assertThat(service.getInsightDetail(1L, 101L).events().get(0).impact())
                .isEqualTo("이후 2일 뒤 트러블 수치 +18");
    }

    @DisplayName("확인 중인 인사이트의 이벤트는 OBSERVING이고 수치를 단정하지 않는다")
    @Test
    void detailObservingEventAvoidsAssertiveWording() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "판테놀", BigDecimal.valueOf(66), 3, BigDecimal.valueOf(9));
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        givenIngredientUsedOn("판테놀", WINDOW_END.minusDays(18));

        ReportInsightEventResponse event = service.getInsightDetail(1L, 101L).events().get(0);

        assertThat(event.confidence()).isEqualTo("OBSERVING");
        assertThat(event.impact()).isEqualTo("이후 트러블 변화를 확인 중이에요");
        assertThat(event.impact()).doesNotContain("반복");
    }

    @DisplayName("신뢰도 67은 확정으로 본다 — ADR 0009 경계값")
    @Test
    void detailTreatsThresholdAsObserved() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "레티놀", BigDecimal.valueOf(67), 2, BigDecimal.valueOf(18));
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        givenIngredientUsedOn("레티놀", WINDOW_END.minusDays(18));

        assertThat(service.getInsightDetail(1L, 101L).events().get(0).confidence()).isEqualTo("OBSERVED");
    }

    @DisplayName("시차·변화량이 없는 인사이트는 확인 중 문구로 대체한다")
    @Test
    void detailFallsBackWhenLagMissing() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "레티놀", BigDecimal.valueOf(80), null, null);
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        givenIngredientUsedOn("레티놀", WINDOW_END.minusDays(18));

        assertThat(service.getInsightDetail(1L, 101L).events().get(0).impact())
                .isEqualTo("이후 트러블 변화를 확인 중이에요");
    }

    @DisplayName("제목과 일치하는 성분이 없으면 이벤트는 비어 있고 오류가 아니다")
    @Test
    void detailReturnsEmptyEventsWhenIngredientUnmatched() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "나이아신아마이드", BigDecimal.valueOf(80), 2, BigDecimal.valueOf(18));
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        givenIngredientUsedOn("레티놀", WINDOW_END.minusDays(18));

        assertThat(service.getInsightDetail(1L, 101L).events()).isEmpty();
    }

    @DisplayName("자외선 지수가 8 이상으로 2일 연속이면 이벤트를 남긴다")
    @Test
    void detailAddsUvSpikeEvent() {
        AnalysisInsight insight = detailInsight(101L, InsightType.ENVIRONMENT, SkinMetricType.TROUBLE,
                "자외선", BigDecimal.valueOf(80), null, null);
        LocalDate spikeStart = WINDOW_END.minusDays(7);

        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        when(dailyEnvironmentRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(
                        environment(spikeStart, BigDecimal.valueOf(9)),
                        environment(spikeStart.plusDays(1), BigDecimal.valueOf(8)),
                        environment(spikeStart.plusDays(2), BigDecimal.valueOf(9))));

        List<ReportInsightEventResponse> events = service.getInsightDetail(1L, 101L).events();

        assertThat(events).hasSize(1);
        assertThat(events.get(0).date()).isEqualTo(spikeStart);
        assertThat(events.get(0).label()).isEqualTo("자외선 지수 8 이상 3일 연속");
        assertThat(events.get(0).confidence()).isEqualTo("OBSERVED");
    }

    @DisplayName("자외선 급증이 하루뿐이면 이벤트로 보지 않는다")
    @Test
    void detailIgnoresSingleDayUvSpike() {
        AnalysisInsight insight = detailInsight(101L, InsightType.ENVIRONMENT, SkinMetricType.TROUBLE,
                "자외선", BigDecimal.valueOf(80), null, null);
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        when(dailyEnvironmentRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(
                        environment(WINDOW_END.minusDays(7), BigDecimal.valueOf(9)),
                        environment(WINDOW_END.minusDays(6), BigDecimal.valueOf(3))));

        assertThat(service.getInsightDetail(1L, 101L).events()).isEmpty();
    }

    @DisplayName("환경 데이터가 없는 날은 자외선 연속을 끊는다")
    @Test
    void detailBreaksUvStreakOnMissingDay() {
        AnalysisInsight insight = detailInsight(101L, InsightType.ENVIRONMENT, SkinMetricType.TROUBLE,
                "자외선", BigDecimal.valueOf(80), null, null);
        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        // 8일 전과 6일 전은 각각 임계값을 넘지만 7일 전 행이 없어 연속이 아니다.
        when(dailyEnvironmentRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(
                        environment(WINDOW_END.minusDays(8), BigDecimal.valueOf(9)),
                        environment(WINDOW_END.minusDays(6), BigDecimal.valueOf(9))));

        assertThat(service.getInsightDetail(1L, 101L).events()).isEmpty();
    }

    @DisplayName("성분 인사이트에 붙는 자외선 이벤트는 항상 OBSERVING이다")
    @Test
    void detailUvEventOnIngredientInsightStaysObserving() {
        AnalysisInsight insight = detailInsight(101L, InsightType.INGREDIENT, SkinMetricType.TROUBLE,
                "레티놀", BigDecimal.valueOf(80), 2, BigDecimal.valueOf(18));
        LocalDate spikeStart = WINDOW_END.minusDays(5);

        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        givenIngredientUsedOn("레티놀", WINDOW_END.minusDays(18));
        when(dailyEnvironmentRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(
                        environment(spikeStart, BigDecimal.valueOf(9)),
                        environment(spikeStart.plusDays(1), BigDecimal.valueOf(9))));

        List<ReportInsightEventResponse> events = service.getInsightDetail(1L, 101L).events();

        // 날짜 오름차순이므로 첫 사용(18일 전)이 앞, 자외선(5일 전)이 뒤다. (BR 1)
        assertThat(events).extracting(ReportInsightEventResponse::confidence)
                .containsExactly("OBSERVED", "OBSERVING");
        assertThat(events.get(0).date()).isBefore(events.get(1).date());
    }

    @DisplayName("환경 인사이트는 성분 이벤트 없이 자외선 이벤트만 남긴다")
    @Test
    void detailEnvironmentInsightSkipsIngredientEvent() {
        AnalysisInsight insight = detailInsight(101L, InsightType.ENVIRONMENT, SkinMetricType.TROUBLE,
                "자외선", BigDecimal.valueOf(50), null, null);
        LocalDate spikeStart = WINDOW_END.minusDays(4);

        when(analysisInsightRepository.findById(101L)).thenReturn(Optional.of(insight));
        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        when(dailyEnvironmentRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(
                        environment(spikeStart, BigDecimal.valueOf(9)),
                        environment(spikeStart.plusDays(1), BigDecimal.valueOf(9))));

        List<ReportInsightEventResponse> events = service.getInsightDetail(1L, 101L).events();

        assertThat(events).hasSize(1);
        assertThat(events.get(0).label()).startsWith("자외선 지수");
        assertThat(events.get(0).confidence()).isEqualTo("OBSERVING");
    }
}

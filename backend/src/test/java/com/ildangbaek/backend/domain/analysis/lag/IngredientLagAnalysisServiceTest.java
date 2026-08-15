package com.ildangbaek.backend.domain.analysis.lag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.ildangbaek.backend.domain.analysis.hormone.MenstrualCycleCalculator;
import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import com.ildangbaek.backend.domain.environment.entity.EnvironmentDataSource;
import com.ildangbaek.backend.domain.environment.entity.WeatherCondition;
import com.ildangbaek.backend.domain.environment.repository.DailyEnvironmentRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * DB 어댑터의 조회 규칙을 고정한다 — 완료된 기록만 사용 · 조회 횟수 고정.
 *
 * <p>계산 규칙은 {@link LagCorrelationAnalyzerTest}가 담당한다. 여기서는 "무엇을 읽어서 넘기는가"만 본다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IngredientLagAnalysisServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 9);

    @Mock
    private ProductRecordRepository productRecordRepository;
    @Mock
    private ProductRecordItemRepository productRecordItemRepository;
    @Mock
    private ProductIngredientRepository productIngredientRepository;
    @Mock
    private SkinRecordRepository skinRecordRepository;
    @Mock
    private SkinMetricRepository skinMetricRepository;
    @Mock
    private UserProfileRepository userProfileRepository;
    @Mock
    private DailyEnvironmentRepository dailyEnvironmentRepository;
    @Mock
    private LagInsightWriter insightWriter;
    @Mock
    private IngredientProfileWriter profileWriter;

    private IngredientLagAnalysisService service;
    private User user;
    private Product serum;
    private Ingredient retinol;

    @BeforeEach
    void setUp() {
        when(userProfileRepository.findByUserId(anyLong())).thenReturn(java.util.Optional.empty());
        when(dailyEnvironmentRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of());
        service = new IngredientLagAnalysisService(productRecordRepository, productRecordItemRepository,
                productIngredientRepository, skinRecordRepository, skinMetricRepository, userProfileRepository,
                dailyEnvironmentRepository, new LagCorrelationAnalyzer(), new MenstrualCycleCalculator(),
                insightWriter, profileWriter);

        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", 1L);

        serum = Product.builder().productName("레티놀 세럼").category(ProductCategory.SERUM)
                .dataSource(ProductDataSource.SAMPLE).build();
        ReflectionTestUtils.setField(serum, "id", 100L);

        retinol = Ingredient.builder().koreanName("레티놀").build();
        ReflectionTestUtils.setField(retinol, "id", 200L);
    }

    @DisplayName("분석 실패한 피부 기록은 관측에서 제외한다 — 없는 변화를 패턴으로 잡으면 안 된다")
    @SuppressWarnings("unchecked") // ArgumentCaptor는 제네릭 리스트를 그대로 잡지 못한다
    @Test
    void ignoresFailedSkinRecords() {
        // 모든 날 트러블 50으로 평탄하다. 단, 성분 사용 2일 뒤에 해당하는 날짜(12·6·0일 전)의 기록만
        // FAILED이면서 값이 90이다. 이 실패 기록을 걸러내지 않으면 "2일 뒤 +40" 패턴이 확정된다.
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        List<Integer> spikeDays = List.of(12, 6, 0);
        for (int day = 0; day < 20; day++) {
            boolean spike = spikeDays.contains(day);
            SkinRecord record = skinRecord((long) day + 1, TODAY.minusDays(day), !spike);
            records.add(record);
            metrics.add(metric(record, spike ? 90 : 50));
        }

        List<ProductRecord> productRecords = new ArrayList<>();
        List<ProductRecordItem> items = new ArrayList<>();
        for (int day : List.of(14, 8, 2)) {
            ProductRecord productRecord = productRecord((long) day + 1, TODAY.minusDays(day));
            productRecords.add(productRecord);
            items.add(productRecordItem(productRecord, serum));
        }

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(productRecords);
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList())).thenReturn(items);
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList()))
                .thenReturn(List.of(productIngredient(serum, retinol)));
        when(insightWriter.write(any(), anyList(), any(), any())).thenReturn(List.of());

        service.analyzeAndStore(user, TODAY);

        // 실패 기록이 걸러졌다면 남은 값이 전부 50이라 확정될 패턴이 없다.
        ArgumentCaptor<List<LagPattern>> captor = ArgumentCaptor.forClass(List.class);
        verify(insightWriter).write(any(), captor.capture(), any(), any());
        assertThat(captor.getValue()).noneMatch(LagPattern::confirmed);
    }

    @DisplayName("생리 중인 사용자의 관측이 절반 이상 걸치면 방향이 일치해도 확정하지 않는다")
    @SuppressWarnings("unchecked")
    @Test
    void appliesMenstrualCorrectionWhenLoadingObservations() {
        // 주기를 6일로 잡아 0, 6, 12, 18일차 사용이 매번 같은 위상(생리 0일차)에서 일어나고,
        // 그 D+2 관측일(각 -2, 4, 10, 16일차)도 매번 생리 기간(0~4일차)에 걸리게 한다.
        // 기준선(사용일) 트러블을 50, D+2를 65로 둬 세 쌍은 +15(악화)로, 마지막 사용(18일차)의
        // D+2(16일차)만 -15(개선)로 반대 방향을 심는다. 방향 일치율은 75%(3/4)로 기본 임계값(67%)은
        // 넘지만 생리 보정 임계값(80%)은 못 넘는다.
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        List<Integer> useDays = List.of(0, 6, 12, 18);
        List<Integer> afterDays = List.of(-2, 4, 10, 16);
        for (int day = -2; day < 20; day++) {
            int value = 50;
            if (afterDays.contains(day)) {
                value = day == 16 ? 35 : 65;
            }
            SkinRecord record = skinRecord((long) day + 100, TODAY.minusDays(day), true);
            records.add(record);
            metrics.add(metric(record, value));
        }

        List<ProductRecord> productRecords = new ArrayList<>();
        List<ProductRecordItem> items = new ArrayList<>();
        for (int day : useDays) {
            ProductRecord productRecord = productRecord((long) day + 1, TODAY.minusDays(day));
            productRecords.add(productRecord);
            items.add(productRecordItem(productRecord, serum));
        }

        com.ildangbaek.backend.domain.user.entity.UserProfile profile =
                com.ildangbaek.backend.domain.user.entity.UserProfile.builder()
                        .user(user).nickname("검증용")
                        .gender(com.ildangbaek.backend.domain.user.entity.Gender.FEMALE)
                        .build();
        profile.updateHormoneInfo(com.ildangbaek.backend.domain.user.entity.MenstrualStatus.MENSTRUATING,
                TODAY.minusDays(18), (short) 6, false, false, false);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(productRecords);
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList())).thenReturn(items);
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList()))
                .thenReturn(List.of(productIngredient(serum, retinol)));
        when(userProfileRepository.findByUserId(anyLong())).thenReturn(java.util.Optional.of(profile));
        when(insightWriter.write(any(), anyList(), any(), any())).thenReturn(List.of());

        service.analyzeAndStore(user, TODAY);

        ArgumentCaptor<List<LagPattern>> captor = ArgumentCaptor.forClass(List.class);
        verify(insightWriter).write(any(), captor.capture(), any(), any());
        LagPattern found = captor.getValue().stream()
                .filter(pattern -> pattern.metricType() == SkinMetricType.TROUBLE && pattern.lagDays() == 2)
                .findFirst().orElseThrow();
        assertThat(found.menstrualAffectedCount()).isEqualTo(4);
        assertThat(found.confirmed()).isFalse();
    }

    @DisplayName("자외선이 급변한 날짜에 관측이 절반 이상 걸치면 방향이 일치해도 확정하지 않는다")
    @SuppressWarnings("unchecked")
    @Test
    void appliesEnvironmentCorrectionWhenLoadingObservations() {
        // 0, 6, 12, 18일차 사용이 각각 D+2 관측일(-2, 4, 10, 16일차)에 자외선 급변(전일 대비 +5)을
        // 겪게 한다(ADR 0021의 급변 정의는 전일 대비 변화폭 3 이상). 기준선(사용일) 트러블을 50,
        // D+2를 65로 둬 세 쌍은 +15(악화)로, 마지막 사용(18일차)의 D+2(16일차)만 -15(개선)로 반대
        // 방향을 심는다. 방향 일치율은 75%(3/4)로 기본 임계값(67%)은 넘지만 환경 보정 임계값(80%)은
        // 못 넘는다.
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        List<Integer> useDays = List.of(0, 6, 12, 18);
        List<Integer> afterDays = List.of(-2, 4, 10, 16);
        for (int day = -2; day < 20; day++) {
            int value = 50;
            if (afterDays.contains(day)) {
                value = day == 16 ? 35 : 65;
            }
            SkinRecord record = skinRecord((long) day + 100, TODAY.minusDays(day), true);
            records.add(record);
            metrics.add(metric(record, value));
        }

        List<ProductRecord> productRecords = new ArrayList<>();
        List<ProductRecordItem> items = new ArrayList<>();
        for (int day : useDays) {
            ProductRecord productRecord = productRecord((long) day + 1, TODAY.minusDays(day));
            productRecords.add(productRecord);
            items.add(productRecordItem(productRecord, serum));
        }

        List<DailyEnvironment> environments = new ArrayList<>();
        for (int day = -2; day < 20; day++) {
            boolean spike = afterDays.contains(day);
            environments.add(environment(TODAY.minusDays(day), spike ? BigDecimal.valueOf(8) : BigDecimal.valueOf(3)));
        }
        // 조회 순서(과거 → 최근)로 정렬해 서비스가 전일 대비 변화를 올바르게 계산하게 한다.
        environments.sort(java.util.Comparator.comparing(DailyEnvironment::getRecordDate));

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(productRecords);
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList())).thenReturn(items);
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList()))
                .thenReturn(List.of(productIngredient(serum, retinol)));
        when(dailyEnvironmentRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(environments);
        when(insightWriter.write(any(), anyList(), any(), any())).thenReturn(List.of());

        service.analyzeAndStore(user, TODAY);

        ArgumentCaptor<List<LagPattern>> captor = ArgumentCaptor.forClass(List.class);
        verify(insightWriter).write(any(), captor.capture(), any(), any());
        LagPattern found = captor.getValue().stream()
                .filter(pattern -> pattern.metricType() == SkinMetricType.TROUBLE && pattern.lagDays() == 2)
                .findFirst().orElseThrow();
        assertThat(found.environmentAffectedCount()).isEqualTo(4);
        assertThat(found.confirmed()).isFalse();
    }

    @DisplayName("제품 기록이 없으면 분석하지 않는다 — 제품 기록 API(A 담당) 도입 전의 정상 상태")
    @Test
    void skipsWhenNoProductRecords() {
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        for (int day = 0; day < 10; day++) {
            SkinRecord record = skinRecord((long) day + 1, TODAY.minusDays(day), true);
            records.add(record);
            metrics.add(metric(record, 50));
        }

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(List.of());

        assertThat(service.analyzeAndStore(user, TODAY)).isZero();
        verify(insightWriter, never()).write(any(), anyList(), any(), any());
    }

    @DisplayName("피부 기록이 3일 미만이어도 노출 성분을 데이터 부족 프로파일로 저장한다")
    @SuppressWarnings("unchecked")
    @Test
    void writesInsufficientProfileWhenSkinRecordsAreBelowThreeDays() {
        SkinRecord firstRecord = skinRecord(1L, TODAY.minusDays(1), true);
        SkinRecord secondRecord = skinRecord(2L, TODAY, true);
        ProductRecord productRecord = productRecord(1L, TODAY);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(List.of(firstRecord, secondRecord));
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList()))
                .thenReturn(List.of(metric(firstRecord, 50), metric(secondRecord, 55)));
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(List.of(productRecord));
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList()))
                .thenReturn(List.of(productRecordItem(productRecord, serum)));
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList()))
                .thenReturn(List.of(productIngredient(serum, retinol)));

        assertThat(service.analyzeAndStore(user, TODAY)).isZero();

        ArgumentCaptor<List<LagPattern>> captor = ArgumentCaptor.forClass(List.class);
        verify(profileWriter).write(any(), anyList(), captor.capture());
        assertThat(captor.getValue()).isEmpty();
        verify(insightWriter, never()).write(any(), anyList(), any(), any());
    }

    @DisplayName("확정 패턴이 없어도 성분 프로파일은 갱신한다 — USER-02가 데이터 부족 성분도 보여준다")
    @Test
    void updatesProfileEvenWithoutConfirmedPattern() {
        // 모든 날 트러블 50으로 평탄해 확정될 패턴이 없다. 그래도 레티놀을 3일 썼다는 사실은 남아야 한다.
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        for (int day = 0; day < 20; day++) {
            SkinRecord record = skinRecord((long) day + 1, TODAY.minusDays(day), true);
            records.add(record);
            metrics.add(metric(record, 50));
        }

        List<ProductRecord> productRecords = new ArrayList<>();
        List<ProductRecordItem> items = new ArrayList<>();
        for (int day : List.of(14, 8, 2)) {
            ProductRecord productRecord = productRecord((long) day + 1, TODAY.minusDays(day));
            productRecords.add(productRecord);
            items.add(productRecordItem(productRecord, serum));
        }

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(productRecords);
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList())).thenReturn(items);
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList()))
                .thenReturn(List.of(productIngredient(serum, retinol)));
        when(insightWriter.write(any(), anyList(), any(), any())).thenReturn(List.of());

        service.analyzeAndStore(user, TODAY);

        verify(profileWriter).write(any(), anyList(), anyList());
    }

    @DisplayName("관측 쌍이 없어 패턴이 비면 이전 성분 인사이트를 정리하도록 writer를 호출한다")
    @SuppressWarnings("unchecked")
    @Test
    void clearsInsightsWhenNoPatternsRemain() {
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        for (int day = 0; day < 20; day++) {
            SkinRecord record = skinRecord((long) day + 1, TODAY.minusDays(day), true);
            records.add(record);
            metrics.add(metric(record, 50));
        }
        ProductRecord latestProductRecord = productRecord(1L, TODAY);

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(List.of(latestProductRecord));
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList()))
                .thenReturn(List.of(productRecordItem(latestProductRecord, serum)));
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList()))
                .thenReturn(List.of(productIngredient(serum, retinol)));
        when(insightWriter.write(any(), anyList(), any(), any())).thenReturn(List.of());

        assertThat(service.analyzeAndStore(user, TODAY)).isZero();

        ArgumentCaptor<List<LagPattern>> captor = ArgumentCaptor.forClass(List.class);
        verify(insightWriter).write(any(), captor.capture(), any(), any());
        assertThat(captor.getValue()).isEmpty();
    }

    @DisplayName("제품 기록이 없으면 프로파일도 갱신하지 않는다")
    @Test
    void skipsProfileWhenNoProductRecords() {
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        for (int day = 0; day < 10; day++) {
            SkinRecord record = skinRecord((long) day + 1, TODAY.minusDays(day), true);
            records.add(record);
            metrics.add(metric(record, 50));
        }

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(List.of());

        service.analyzeAndStore(user, TODAY);

        verify(profileWriter, never()).write(any(), anyList(), anyList());
    }

    @DisplayName("제품 기록 수와 무관하게 노출 조회는 3번이다 — 기록마다 조회하면 N+1이 된다")
    @Test
    void loadsExposuresInFixedNumberOfQueries() {
        List<SkinRecord> records = new ArrayList<>();
        List<SkinMetric> metrics = new ArrayList<>();
        for (int day = 0; day < 20; day++) {
            SkinRecord record = skinRecord((long) day + 1, TODAY.minusDays(day), true);
            records.add(record);
            metrics.add(metric(record, day % 2 == 0 ? 50 : 70));
        }

        List<ProductRecord> productRecords = new ArrayList<>();
        List<ProductRecordItem> items = new ArrayList<>();
        for (int day = 0; day < 15; day++) {
            ProductRecord productRecord = productRecord((long) day + 1, TODAY.minusDays(day));
            productRecords.add(productRecord);
            items.add(productRecordItem(productRecord, serum));
        }

        when(skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                anyLong(), any(), any())).thenReturn(records);
        when(skinMetricRepository.findAllBySkinRecordIdIn(anyList())).thenReturn(metrics);
        when(productRecordRepository.findAllByUserIdAndRecordDateBetween(anyLong(), any(), any()))
                .thenReturn(productRecords);
        when(productRecordItemRepository.findAllWithProductByProductRecordIdIn(anyList())).thenReturn(items);
        when(productIngredientRepository.findAllWithIngredientByProductIdIn(anyList()))
                .thenReturn(List.of(productIngredient(serum, retinol)));
        when(insightWriter.write(any(), anyList(), any(), any())).thenReturn(List.of());

        service.analyzeAndStore(user, TODAY);

        // 제품 기록 15건이어도 각 리포지토리는 한 번씩만 호출되어야 한다.
        verify(productRecordRepository).findAllByUserIdAndRecordDateBetween(anyLong(), any(), any());
        verify(productRecordItemRepository).findAllWithProductByProductRecordIdIn(anyList());
        verify(productIngredientRepository).findAllWithIngredientByProductIdIn(anyList());
        verify(productRecordItemRepository, never()).findAllByProductRecordId(anyLong());
        verify(productIngredientRepository, never()).findAllByProductIdOrderByDisplayOrderAsc(anyLong());
    }

    private SkinRecord skinRecord(Long id, LocalDate date, boolean completed) {
        SkinRecord record = SkinRecord.builder()
                .user(user)
                .recordDate(date)
                .timeSlot(TimeSlot.NIGHT)
                .imageUrl("/images/x.jpg")
                .analysisMethod(AnalysisMethod.MOCK)
                .capturedAt(LocalDateTime.of(date, java.time.LocalTime.of(22, 0)))
                .build();
        if (completed) {
            record.completeAnalysis(BigDecimal.valueOf(60));
        } else {
            record.failAnalysis();
        }
        ReflectionTestUtils.setField(record, "id", id);
        return record;
    }

    private SkinMetric metric(SkinRecord record, int value) {
        return SkinMetric.builder()
                .skinRecord(record)
                .metricType(SkinMetricType.TROUBLE)
                .metricValue(BigDecimal.valueOf(value))
                .build();
    }

    private DailyEnvironment environment(LocalDate date, BigDecimal uvIndexMax) {
        return DailyEnvironment.builder()
                .user(user)
                .recordDate(date)
                .regionName("서울")
                .weatherCondition(WeatherCondition.SUNNY)
                .temperature(BigDecimal.valueOf(24))
                .humidity(BigDecimal.valueOf(55))
                .uvIndexCurrent(uvIndexMax)
                .uvIndexMax(uvIndexMax)
                .dataSource(EnvironmentDataSource.MOCK)
                .build();
    }

    private ProductRecord productRecord(Long id, LocalDate date) {
        ProductRecord record = ProductRecord.builder()
                .user(user)
                .recordDate(date)
                .timeSlot(TimeSlot.NIGHT)
                .sourceType(SourceType.INDIVIDUAL)
                .build();
        ReflectionTestUtils.setField(record, "id", id);
        return record;
    }

    private ProductRecordItem productRecordItem(ProductRecord productRecord, Product product) {
        return ProductRecordItem.builder()
                .productRecord(productRecord)
                .product(product)
                .usageOrder(1)
                .build();
    }

    private ProductIngredient productIngredient(Product product, Ingredient ingredient) {
        return ProductIngredient.builder()
                .product(product)
                .ingredient(ingredient)
                .displayOrder(1)
                .keyIngredient(true)
                .build();
    }
}

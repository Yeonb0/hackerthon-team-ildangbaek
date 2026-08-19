package com.ildangbaek.backend.api.report.service;

import com.ildangbaek.backend.api.report.dto.InsightEventKind;
import com.ildangbaek.backend.api.report.dto.ReportDailyResponse;
import com.ildangbaek.backend.api.report.dto.ReportGraphPointResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightDetailResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightEventResponse;
import com.ildangbaek.backend.api.report.dto.ReportInsightResponse;
import com.ildangbaek.backend.api.report.dto.ReportResponse;
import com.ildangbaek.backend.api.report.dto.ReportSummaryGraphPointResponse;
import com.ildangbaek.backend.api.report.dto.ReportSummaryMetricResponse;
import com.ildangbaek.backend.api.report.dto.ReportSummaryResponse;
import com.ildangbaek.backend.api.skin.dto.SkinRecordResponse;
import com.ildangbaek.backend.api.skin.service.SkinRecordService;
import com.ildangbaek.backend.domain.analysis.client.InsightTipClient;
import com.ildangbaek.backend.domain.analysis.client.InsightTipClient.InsightTipRequest;
import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import com.ildangbaek.backend.domain.analysis.entity.InsightType;
import com.ildangbaek.backend.domain.analysis.repository.AnalysisInsightRepository;
import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import com.ildangbaek.backend.domain.environment.repository.DailyEnvironmentRepository;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * REPORT-01 · 리포트 조회, REPORT-02 · 요인 상세 조회, REPORT-03 · 일자별 리포트 조회.
 * 저장된 결과를 보여줄 뿐 분석 자체를 실행하지 않는다.
 *
 * <p>{@code insights}는 F-ANALYSIS-01이 {@code analysis_insights}에 남긴 행을 읽어 채운다.
 * 분석 결과가 없으면 빈 배열이며, 이는 명세 BR 4("실제 분석 데이터가 있는 인사이트만 반환")와 정합적이다.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private static final Set<Integer> ALLOWED_PERIODS = Set.of(7, 30);

    /** 인사이트에 지표가 없을 때 쓴다. {@code ReportController.DEFAULT_METRIC}과 같은 기본값이다. */
    private static final SkinMetricType DEFAULT_METRIC = SkinMetricType.TROUBLE;

    /** 인사이트 기간이 비어 있을 때 그래프에 쓸 창 길이. F-ANALYSIS-01의 분석 창과 같다. */
    private static final int FALLBACK_WINDOW_DAYS = 30;

    /** 자외선 "급증"으로 볼 하한. 기상청 UV 등급에서 8 이상이 "매우 높음"이다. */
    private static final BigDecimal UV_SPIKE_THRESHOLD = BigDecimal.valueOf(8);

    /** 하루짜리 스파이크는 노이즈로 보고 넘긴다. */
    private static final int UV_SPIKE_MIN_DAYS = 2;

    /**
     * {@code confidence}를 OBSERVED로 표시할 하한. F-ANALYSIS-01의 패턴 확정 임계값과 같은 값이라
     * "확정된 패턴 = OBSERVED"가 성립한다. (ADR 0009)
     */
    private static final BigDecimal OBSERVED_THRESHOLD = BigDecimal.valueOf(67);

    private final SkinRecordRepository skinRecordRepository;
    private final SkinMetricRepository skinMetricRepository;
    private final AnalysisInsightRepository analysisInsightRepository;

    /** REPORT-03이 SKIN-01과 같은 응답 구조를 내려주기 위해 쓴다. 비교 계산을 두 벌로 두지 않는다. */
    private final SkinRecordService skinRecordService;

    /** 아래 셋은 REPORT-02가 성분 첫 사용일을 찾을 때만 쓴다. */
    private final ProductRecordRepository productRecordRepository;
    private final ProductRecordItemRepository productRecordItemRepository;
    private final ProductIngredientRepository productIngredientRepository;

    /** REPORT-02의 자외선 급증 이벤트. */
    private final DailyEnvironmentRepository dailyEnvironmentRepository;

    /** REPORT-02의 관리 팁. 실패해도 상세 응답을 막지 않는다 (ADR 0028). */
    private final InsightTipClient insightTipClient;

    @Transactional(readOnly = true)
    public ReportResponse getReport(Long userId, int period, SkinMetricType metric) {
        if (!ALLOWED_PERIODS.contains(period)) {
            throw new BusinessException(ErrorCode.REPORT_INVALID_PERIOD);
        }

        LocalDate endDate = LocalDate.now(KST);
        LocalDate startDate = endDate.minusDays(period - 1L);

        List<SkinRecord> records = skinRecordRepository
                .findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, startDate, endDate);
        if (records.isEmpty()) {
            throw new BusinessException(ErrorCode.REPORT_DATA_INSUFFICIENT);
        }

        return new ReportResponse(period, metric, buildSummary(userId, records, period, startDate, endDate),
                buildGraph(records, metric, startDate, endDate),
                loadInsights(userId, startDate), Collections.emptyList());
    }

    /**
     * REPORT-01 {@code summary} · 기간 종합 점수 카드.
     *
     * <p>{@code totalScore}는 SKIN-01의 산출식(ADR 0008)을 기간 단위로 그대로 확장한다 — 기간 내
     * 모든 지표값을 한데 모은 평균이다. 직전 동일 기간(같은 길이의 바로 전 구간)에 기록이 없으면
     * 증감은 0으로 둔다 — 비교 대상이 없을 때 임의로 단정하지 않는다.
     */
    private ReportSummaryResponse buildSummary(
            Long userId, List<SkinRecord> records, int period, LocalDate startDate, LocalDate endDate) {
        Map<SkinMetricType, List<Integer>> scoresByMetric = loadScoresByMetric(records);

        LocalDate previousEndDate = startDate.minusDays(1);
        LocalDate previousStartDate = previousEndDate.minusDays(period - 1L);
        List<SkinRecord> previousRecords = skinRecordRepository
                .findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, previousStartDate, previousEndDate);
        Map<SkinMetricType, List<Integer>> previousScoresByMetric = loadScoresByMetric(previousRecords);

        List<ReportSummaryMetricResponse> metrics = new ArrayList<>();
        for (SkinMetricType type : SkinMetricType.values()) {
            int score = averageOf(scoresByMetric.get(type));
            metrics.add(new ReportSummaryMetricResponse(type, score, deltaOf(score, previousScoresByMetric.get(type))));
        }

        int totalScore = averageOfAll(scoresByMetric);
        int totalDelta = previousRecords.isEmpty() ? 0 : totalScore - averageOfAll(previousScoresByMetric);

        return new ReportSummaryResponse(
                totalScore, totalDelta, metrics, buildSummaryGraph(records, startDate, endDate));
    }

    /** 직전 기간에 해당 지표 기록 자체가 없으면 0(비교 없음)이다 — 있었는데 값이 0인 경우와 구별한다. */
    private int deltaOf(int score, List<Integer> previousScores) {
        if (previousScores == null || previousScores.isEmpty()) {
            return 0;
        }
        return score - averageOf(previousScores);
    }

    /**
     * 하루에 모닝·나이트가 다 있으면 두 슬롯의 종합 점수 평균을 그날의 값으로 쓴다 — 대표값 하나로 접는다.
     *
     * <p>기록별 종합 점수는 {@link SkinRecord#getOverallScore()}를 그대로 쓴다 — SKIN-01 저장 시점에
     * 이미 ADR 0008 방식(지표 4종 단순 평균)으로 계산되어 있어, 지표가 일부만 있는 기록도 이 계산을
     * 다시 하지 않고 동일한 값을 재사용한다.
     */
    private List<ReportSummaryGraphPointResponse> buildSummaryGraph(
            List<SkinRecord> records, LocalDate startDate, LocalDate endDate) {
        Map<LocalDate, List<Integer>> scoresByDate = new HashMap<>();
        for (SkinRecord record : records) {
            if (record.getOverallScore() == null) {
                continue;
            }
            scoresByDate.computeIfAbsent(record.getRecordDate(), date -> new ArrayList<>())
                    .add(record.getOverallScore().intValue());
        }

        return startDate.datesUntil(endDate.plusDays(1))
                .map(date -> new ReportSummaryGraphPointResponse(date, averageOfNullable(scoresByDate.get(date))))
                .toList();
    }

    private Map<SkinMetricType, List<Integer>> loadScoresByMetric(List<SkinRecord> records) {
        Map<SkinMetricType, List<Integer>> scoresByMetric = new EnumMap<>(SkinMetricType.class);
        List<Long> recordIds = records.stream().map(SkinRecord::getId).toList();
        for (SkinMetric skinMetric : skinMetricRepository.findAllBySkinRecordIdIn(recordIds)) {
            scoresByMetric.computeIfAbsent(skinMetric.getMetricType(), type -> new ArrayList<>())
                    .add(skinMetric.getMetricValue().intValue());
        }
        return scoresByMetric;
    }

    /** 지표 4종의 점수 리스트를 하나로 합쳐 평균 낸다 — SKIN-01 totalScore(ADR 0008)의 기간판이다. */
    private int averageOfAll(Map<SkinMetricType, List<Integer>> scoresByMetric) {
        List<Integer> all = scoresByMetric.values().stream().flatMap(List::stream).toList();
        return averageOf(all);
    }

    private int averageOf(List<Integer> scores) {
        if (scores == null || scores.isEmpty()) {
            return 0;
        }
        return (int) Math.round(scores.stream().mapToInt(Integer::intValue).average().orElse(0));
    }

    private Integer averageOfNullable(List<Integer> scores) {
        if (scores == null || scores.isEmpty()) {
            return null;
        }
        return (int) Math.round(scores.stream().mapToInt(Integer::intValue).average().orElse(0));
    }

    /**
     * REPORT-02 · 요인 상세 조회.
     *
     * <p>인사이트가 만들어진 기간을 그대로 창으로 쓴다 — 이벤트가 그 창에서 도출되므로 그래프가
     * 다른 창이면 이벤트가 그래프 밖에 놓인다.
     *
     * <p>{@code insightId}는 영속 식별자가 아니다. F-ANALYSIS-01이 기록 저장마다 성분 인사이트를
     * 지우고 다시 넣으므로 이전에 받은 id는 사라질 수 있고, 그때 404가 나는 것이 정상이다.
     *
     * @throws BusinessException 없거나 다른 사용자의 것이면 {@code REPORT_INSIGHT_NOT_FOUND}
     */
    @Transactional(readOnly = true)
    public ReportInsightDetailResponse getInsightDetail(Long userId, Long insightId) {
        AnalysisInsight insight = analysisInsightRepository.findById(insightId)
                .filter(found -> found.getUser().getId().equals(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.REPORT_INSIGHT_NOT_FOUND));

        LocalDate endDate = insight.getEndDate() != null ? insight.getEndDate() : LocalDate.now(KST);
        LocalDate startDate = insight.getStartDate() != null
                ? insight.getStartDate()
                : endDate.minusDays(FALLBACK_WINDOW_DAYS - 1L);
        SkinMetricType metric = insight.getMetricType() != null ? insight.getMetricType() : DEFAULT_METRIC;

        List<SkinRecord> records = skinRecordRepository
                .findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, startDate, endDate);

        return new ReportInsightDetailResponse(
                insight.getId(),
                insight.getInsightType().name(),
                metric,
                insight.getTitle() + " 추이",
                subtitleOf(insight.getStartDate(), insight.getEndDate()),
                insight.getDescription(),
                buildGraph(records, metric, startDate, endDate),
                buildEvents(userId, insight, metric, startDate, endDate),
                loadTip(insight, metric));
    }

    /**
     * 관리 팁은 ai-server가 생성한다(ADR 0028). 실패하면 {@code null}이다 — 팁이 없어도 상세
     * 화면은 성립하므로 상세 조회 전체를 막지 않는다.
     *
     * <p>AI에 넘기는 시차·변화량은 {@code impact} 문구에 싣는 것과 **같은 기준으로 거른다**
     * ({@link #firstUsageDelta}). 확정되지 않은 패턴의 변화량을 넘기면 AI가 그 부호로 "악화됐다"고
     * 단정해 버려, 화면은 "확인 중"인데 팁만 단정하는 모순이 생긴다 (BR 2).
     */
    private String loadTip(AnalysisInsight insight, SkinMetricType metric) {
        Integer delta = firstUsageDelta(insight);
        return insightTipClient.generateTip(new InsightTipRequest(
                        insight.getTitle(),
                        metricName(metric),
                        insight.getDescription(),
                        confidenceOf(insight),
                        delta == null ? null : insight.getLagDays(),
                        delta == null ? null : BigDecimal.valueOf(delta)))
                .orElse(null);
    }

    /** 기록이 있는 날만이 아니라 창 전체를 조밀하게 채운다 — 결측 날짜는 두 슬롯 모두 {@code null}이다. */
    private List<ReportGraphPointResponse> buildGraph(
            List<SkinRecord> records, SkinMetricType metric, LocalDate startDate, LocalDate endDate) {
        Map<Long, Integer> scoreByRecordId = loadMetricScores(records, metric);
        Map<LocalDate, Map<TimeSlot, Integer>> scoreByDateAndSlot = groupScoresByDateAndSlot(records, scoreByRecordId);

        return startDate.datesUntil(endDate.plusDays(1))
                .map(date -> {
                    Map<TimeSlot, Integer> slots = scoreByDateAndSlot.getOrDefault(date, Map.of());
                    return new ReportGraphPointResponse(
                            date, slots.get(TimeSlot.MORNING), slots.get(TimeSlot.NIGHT));
                })
                .toList();
    }

    /**
     * REPORT-03 · 일자별 리포트 조회.
     *
     * <p>{@code timeSlot}이 {@code null}이면 그 날짜의 모든 기록을 배열로 반환한다 (BR 1).
     * 기록이 없으면 빈 배열이며 오류가 아니다 — 캘린더에서 임의 날짜를 여는 화면이라
     * "그날은 기록이 없다"가 정상 상태다.
     *
     * @throws BusinessException 미래 날짜면 {@code RECORD_FUTURE_DATE_NOT_ALLOWED} (BR 2)
     */
    @Transactional(readOnly = true)
    public ReportDailyResponse getDailyReport(Long userId, LocalDate date, TimeSlot timeSlot) {
        if (date.isAfter(LocalDate.now(KST))) {
            throw new BusinessException(ErrorCode.RECORD_FUTURE_DATE_NOT_ALLOWED);
        }

        List<SkinRecordResponse> records =
                skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(userId, date).stream()
                        .filter(record -> timeSlot == null || record.getTimeSlot() == timeSlot)
                        .map(record -> skinRecordService.toResponse(userId, record))
                        .toList();

        return new ReportDailyResponse(date, records);
    }

    /**
     * F-ANALYSIS-01이 남긴 인사이트를 카드로 변환한다. 분석 결과가 없으면 빈 배열이다. (BR 4)
     */
    private List<ReportInsightResponse> loadInsights(Long userId, LocalDate startDate) {
        return analysisInsightRepository
                .findAllByUserIdAndEndDateGreaterThanEqualOrderByConfidenceScoreDesc(userId, startDate)
                .stream()
                .map(insight -> new ReportInsightResponse(
                        insight.getId(),
                        insight.getInsightType().name(),
                        insight.getTitle(),
                        insight.getDescription(),
                        confidenceOf(insight)))
                .toList();
    }

    /** 인사이트 기간 길이를 문구로 만든다. 기간이 비어 있으면 길이를 말하지 않는다. */
    private String subtitleOf(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return "이벤트와 상관관계";
        }
        return "최근 %d일 · 이벤트와 상관관계".formatted(ChronoUnit.DAYS.between(startDate, endDate) + 1);
    }

    /**
     * 주요 이벤트를 조회 시점에 도출한다 (ADR 0013). 저장된 이벤트 테이블은 없다.
     *
     * <p>도출 유형은 성분 첫 사용과 자외선 급증 둘뿐이다. 명세가 든 "성분 재시작"은 만들지 않는다 —
     * 제품 기록이 없는 날은 "쓰지 않았다"가 아니라 "기록하지 않았다"라서 중단을 판정할 수 없다.
     *
     * <p>날짜 오름차순으로 정렬한다 (BR 1). 같은 날짜면 성분 이벤트를 앞에 둔다.
     */
    private List<ReportInsightEventResponse> buildEvents(
            Long userId, AnalysisInsight insight, SkinMetricType metric,
            LocalDate startDate, LocalDate endDate) {
        List<ReportInsightEventResponse> events = new ArrayList<>();

        if (insight.getInsightType() == InsightType.INGREDIENT) {
            Integer delta = firstUsageDelta(insight);
            findFirstUsageDate(userId, insight.getTitle(), startDate, endDate)
                    .map(date -> new ReportInsightEventResponse(
                            date,
                            "%s 이 기간 첫 사용".formatted(insight.getTitle()),
                            firstUsageImpact(insight, delta, metric),
                            confidenceOf(insight),
                            delta,
                            InsightEventKind.INGREDIENT_USAGE))
                    .ifPresent(events::add);
        }

        events.addAll(uvSpikeEvents(userId, insight, metric, startDate, endDate));
        events.sort(Comparator.comparing(ReportInsightEventResponse::date));
        return List.copyOf(events);
    }

    /**
     * 문구에 실을 수 있는 변화량. 확정되지 않았거나 시차·변화량이 없으면 {@code null}이다 (BR 2) —
     * {@link #firstUsageImpact}가 "확인 중"으로 폴백하는 조건과 같아, 문구와 {@code delta} 필드가
     * 어긋날 수 없다.
     */
    private Integer firstUsageDelta(AnalysisInsight insight) {
        BigDecimal averageDelta = insight.getAverageDelta();
        if (!"OBSERVED".equals(confidenceOf(insight)) || insight.getLagDays() == null || averageDelta == null) {
            return null;
        }
        // 지표값 기준이라 양수면 증상 악화다. 부호를 그대로 보존한다.
        return averageDelta.intValue();
    }

    /**
     * 확정된 패턴만 시차와 변화량을 문구에 싣는다. 확인 중이거나 값이 없으면 단정하지 않는다 (BR 2).
     */
    private String firstUsageImpact(AnalysisInsight insight, Integer delta, SkinMetricType metric) {
        String metricName = metricName(metric);
        if (delta == null) {
            return "이후 %s 변화를 확인 중이에요".formatted(metricName);
        }
        return "이후 %d일 뒤 %s 수치 %s%d".formatted(
                insight.getLagDays(), metricName, delta < 0 ? "-" : "+", Math.abs(delta));
    }

    /**
     * 자외선 지수가 임계값 이상으로 연속된 구간마다 구간 시작일에 이벤트 한 건을 남긴다.
     *
     * <p>환경 데이터가 없는 날은 연속을 끊는다 — 결측을 0으로도, 이어짐으로도 취급하지 않는다.
     */
    private List<ReportInsightEventResponse> uvSpikeEvents(
            Long userId, AnalysisInsight insight, SkinMetricType metric,
            LocalDate startDate, LocalDate endDate) {
        List<DailyEnvironment> environments = dailyEnvironmentRepository
                .findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, startDate, endDate);

        // 성분 인사이트의 신뢰도는 그 성분에 대한 것이지 자외선에 대한 것이 아니다.
        String confidence = insight.getInsightType() == InsightType.INGREDIENT
                ? "OBSERVING"
                : confidenceOf(insight);

        List<ReportInsightEventResponse> events = new ArrayList<>();
        LocalDate spikeStart = null;
        LocalDate previousDate = null;
        int streak = 0;

        for (DailyEnvironment environment : environments) {
            BigDecimal uvIndexMax = environment.getUvIndexMax();
            boolean spike = uvIndexMax != null && uvIndexMax.compareTo(UV_SPIKE_THRESHOLD) >= 0;
            boolean continues = spike && previousDate != null && environment.getRecordDate().equals(previousDate.plusDays(1));

            if (continues) {
                streak++;
            } else {
                addUvSpikeEvent(events, spikeStart, streak, metric, confidence);
                spikeStart = spike ? environment.getRecordDate() : null;
                streak = spike ? 1 : 0;
            }
            previousDate = spike ? environment.getRecordDate() : null;
        }
        addUvSpikeEvent(events, spikeStart, streak, metric, confidence);
        return events;
    }

    private void addUvSpikeEvent(List<ReportInsightEventResponse> events, LocalDate spikeStart, int streak,
                                 SkinMetricType metric, String confidence) {
        if (spikeStart == null || streak < UV_SPIKE_MIN_DAYS) {
            return;
        }
        // 자외선 이벤트는 변화량을 산출할 근거가 없다 — 단정하지 않는다는 BR 2 그대로다.
        events.add(new ReportInsightEventResponse(
                spikeStart,
                "자외선 지수 %d 이상 %d일 연속".formatted(UV_SPIKE_THRESHOLD.intValue(), streak),
                "이 기간 %s 변화를 확인 중이에요".formatted(metricName(metric)),
                confidence,
                null,
                InsightEventKind.UV_SPIKE));
    }

    /**
     * 창 안에서 {@code ingredientName} 성분을 처음 쓴 날. 없으면 empty.
     *
     * <p>조회 3번으로 고정한다 — 제품 기록 · 기록 항목 · 성분. F-ANALYSIS-01의
     * {@code loadExposures}와 같은 모양이지만 그쪽은 성분 전체의 노출 목록이 필요하고 여기는 이름이
     * 일치하는 성분의 최초 날짜 하나만 필요해 반환 형태가 다르다. 공용화하면 한쪽이 결과 대부분을 버린다.
     *
     * <p>이름으로 맞추는 이유: {@code LagInsightWriter}가 인사이트 제목에 성분명을 그대로 넣고,
     * 그 값도 여기서 읽는 값도 출처가 {@code ingredients.korean_name} 하나다.
     */
    private Optional<LocalDate> findFirstUsageDate(
            Long userId, String ingredientName, LocalDate startDate, LocalDate endDate) {
        List<ProductRecord> productRecords =
                productRecordRepository.findAllByUserIdAndRecordDateBetween(userId, startDate, endDate);
        if (productRecords.isEmpty()) {
            return Optional.empty();
        }

        Map<Long, LocalDate> dateByRecordId = new HashMap<>();
        productRecords.forEach(record -> dateByRecordId.put(record.getId(), record.getRecordDate()));

        List<ProductRecordItem> items = productRecordItemRepository
                .findAllWithProductByProductRecordIdIn(List.copyOf(dateByRecordId.keySet()));
        if (items.isEmpty()) {
            return Optional.empty();
        }

        List<Long> productIds = items.stream().map(item -> item.getProduct().getId()).distinct().toList();
        Set<Long> matchingProductIds = productIngredientRepository.findAllWithIngredientByProductIdIn(productIds)
                .stream()
                .filter(productIngredient ->
                        ingredientName.equals(productIngredient.getIngredient().getKoreanName()))
                .map(productIngredient -> productIngredient.getProduct().getId())
                .collect(Collectors.toSet());

        return items.stream()
                .filter(item -> matchingProductIds.contains(item.getProduct().getId()))
                .map(item -> dateByRecordId.get(item.getProductRecord().getId()))
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder());
    }

    /** {@code LagInsightWriter.metricName}과 같은 표기다. 4줄짜리를 계층을 넘겨 공유하지 않는다. */
    private String metricName(SkinMetricType metricType) {
        return switch (metricType) {
            case TROUBLE -> "트러블";
            case REDNESS -> "홍조";
            case PORES -> "모공";
            case PIGMENTATION -> "색소침착";
        };
    }

    /**
     * 신뢰도 점수를 화면 문구로 바꾼다. 임계값 미만은 반복성이 확보되지 않은 상태이므로 OBSERVING이다.
     */
    private String confidenceOf(AnalysisInsight insight) {
        BigDecimal score = insight.getConfidenceScore();
        return score != null && score.compareTo(OBSERVED_THRESHOLD) >= 0 ? "OBSERVED" : "OBSERVING";
    }

    /**
     * 하루 2건(모닝·나이트)을 접지 않고 슬롯별로 나눠 담는다. (ADR 0012)
     *
     * <p>지표 값이 없는 기록(분석 미완료 등)은 담지 않는다 — 해당 슬롯이 {@code null}로 남아
     * 결측과 같게 표현된다.
     */
    private Map<LocalDate, Map<TimeSlot, Integer>> groupScoresByDateAndSlot(
            List<SkinRecord> records, Map<Long, Integer> scoreByRecordId) {
        Map<LocalDate, Map<TimeSlot, Integer>> grouped = new HashMap<>();
        for (SkinRecord record : records) {
            Integer score = scoreByRecordId.get(record.getId());
            if (score == null) {
                continue;
            }
            grouped.computeIfAbsent(record.getRecordDate(), date -> new EnumMap<>(TimeSlot.class))
                    .put(record.getTimeSlot(), score);
        }
        return grouped;
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

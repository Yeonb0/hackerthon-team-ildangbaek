package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.record.entity.AnalysisStatus;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * F-ANALYSIS-01의 DB 어댑터. 제품 기록과 피부 기록을 읽어 {@link LagCorrelationAnalyzer}에 넘기고,
 * 나온 패턴 후보를 인사이트로 남긴다.
 *
 * <p>계산은 전부 분석기에 있다. 이 클래스는 조회와 형변환만 한다.
 *
 * <p><strong>제품 기록 쓰기 API(PRODUCT-05, A 담당)가 아직 없다.</strong> 그래서 실사용 데이터에서는
 * {@code product_records}가 비어 있고 노출이 0건이라 결과도 비어 있다. 이는 정상 동작이다 — 명세 BR 4,
 * 5가 데이터 부족 시 패턴을 확정하지 말라고 요구한다. 표는 이미 존재하므로 A의 API가 붙는 즉시
 * 이 클래스는 코드 변경 없이 실데이터로 동작한다. 검증은 목업 시드 데이터로 했다(backend/README.md).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IngredientLagAnalysisService {

    /** 분석 대상 기간. 시차 최대 7일을 감안해 30일을 본다. */
    private static final int ANALYSIS_WINDOW_DAYS = 30;

    private final ProductRecordRepository productRecordRepository;
    private final ProductRecordItemRepository productRecordItemRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final SkinRecordRepository skinRecordRepository;
    private final SkinMetricRepository skinMetricRepository;
    private final LagCorrelationAnalyzer analyzer;
    private final LagInsightWriter insightWriter;

    /**
     * 사용자 한 명의 최근 기록을 분석해 인사이트를 갱신한다.
     *
     * @return 확정 여부와 무관하게 저장된 패턴 후보 수. 데이터가 부족하면 0이다.
     */
    @Transactional
    public int analyzeAndStore(User user, LocalDate today) {
        LocalDate startDate = today.minusDays(ANALYSIS_WINDOW_DAYS - 1L);

        List<SkinObservation> observations = loadObservations(user.getId(), startDate, today);
        if (observations.size() < LagCorrelationAnalyzer.MIN_RECORD_DAYS) {
            log.debug("기록 부족으로 시차 분석을 건너뜁니다. userId={} days={}", user.getId(), observations.size());
            return 0;
        }

        List<IngredientExposure> exposures = loadExposures(user.getId(), startDate, today);
        if (exposures.isEmpty()) {
            log.debug("제품 기록이 없어 시차 분석을 건너뜁니다. userId={}", user.getId());
            return 0;
        }

        List<LagPattern> patterns = analyzer.analyze(exposures, observations);
        if (patterns.isEmpty()) {
            return 0;
        }

        return insightWriter.write(user, patterns, startDate, today).size();
    }

    /**
     * 날짜별 피부 관측값. 하루 2건이면 지표별 평균으로 합친다.
     */
    private List<SkinObservation> loadObservations(Long userId, LocalDate startDate, LocalDate endDate) {
        List<SkinRecord> records = skinRecordRepository
                .findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, startDate, endDate);
        if (records.isEmpty()) {
            return List.of();
        }

        // 분석이 완료된 기록만 쓴다. 실패·진행 중 기록은 지표가 없거나 믿을 수 없는데,
        // 이 값이 기준선이 되면 있지도 않은 변화를 패턴으로 잡는다.
        Map<Long, LocalDate> dateByRecordId = new HashMap<>();
        records.stream()
                .filter(record -> record.getAnalysisStatus() == AnalysisStatus.COMPLETED)
                .forEach(record -> dateByRecordId.put(record.getId(), record.getRecordDate()));
        if (dateByRecordId.isEmpty()) {
            return List.of();
        }

        Map<LocalDate, Map<SkinMetricType, List<Double>>> collected = new HashMap<>();
        for (SkinMetric metric : skinMetricRepository.findAllBySkinRecordIdIn(List.copyOf(dateByRecordId.keySet()))) {
            LocalDate date = dateByRecordId.get(metric.getSkinRecord().getId());
            if (date == null) {
                continue;
            }
            collected.computeIfAbsent(date, key -> new EnumMap<>(SkinMetricType.class))
                    .computeIfAbsent(metric.getMetricType(), key -> new ArrayList<>())
                    .add(metric.getMetricValue().doubleValue());
        }

        return collected.entrySet().stream()
                .map(entry -> new SkinObservation(entry.getKey(), averageByMetric(entry.getValue())))
                .sorted(Comparator.comparing(SkinObservation::date))
                .toList();
    }

    private Map<SkinMetricType, Double> averageByMetric(Map<SkinMetricType, List<Double>> values) {
        Map<SkinMetricType, Double> averaged = new EnumMap<>(SkinMetricType.class);
        values.forEach((metric, list) ->
                averaged.put(metric, list.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)));
        return averaged;
    }

    /**
     * 제품 기록 → 제품 → 성분으로 펼쳐 성분 단위 노출을 만든다. (BR 1)
     *
     * <p>조회를 3번으로 고정한다 — 제품 기록 · 기록 항목 · 성분. 기록마다 항목을 조회하고 제품마다
     * 성분을 조회하면 30일 분석에서 쿼리가 수십~수백 번 나간다. 이 분석이 피부 기록 저장 경로
     * (SKIN-01)에서 동기로 실행되므로 응답 시간에 그대로 얹힌다.
     */
    private List<IngredientExposure> loadExposures(Long userId, LocalDate startDate, LocalDate endDate) {
        List<ProductRecord> productRecords =
                productRecordRepository.findAllByUserIdAndRecordDateBetween(userId, startDate, endDate);
        if (productRecords.isEmpty()) {
            return List.of();
        }

        Map<Long, ProductRecord> recordById = new HashMap<>();
        productRecords.forEach(record -> recordById.put(record.getId(), record));

        List<ProductRecordItem> items = productRecordItemRepository
                .findAllWithProductByProductRecordIdIn(List.copyOf(recordById.keySet()));
        if (items.isEmpty()) {
            return List.of();
        }

        List<Long> productIds = items.stream()
                .map(item -> item.getProduct().getId())
                .distinct()
                .toList();
        Map<Long, List<ProductIngredient>> ingredientsByProduct =
                productIngredientRepository.findAllWithIngredientByProductIdIn(productIds).stream()
                        .collect(Collectors.groupingBy(productIngredient -> productIngredient.getProduct().getId()));

        // 같은 성분이 같은 날 같은 슬롯에 여러 제품으로 들어오면 중복이므로 Set으로 합친다.
        Set<IngredientExposure> exposures = new LinkedHashSet<>();
        for (ProductRecordItem item : items) {
            ProductRecord productRecord = recordById.get(item.getProductRecord().getId());
            if (productRecord == null) {
                continue;
            }
            for (ProductIngredient productIngredient
                    : ingredientsByProduct.getOrDefault(item.getProduct().getId(), List.of())) {
                exposures.add(new IngredientExposure(
                        productIngredient.getIngredient().getId(),
                        productIngredient.getIngredient().getKoreanName(),
                        productRecord.getRecordDate(),
                        productRecord.getTimeSlot()));
            }
        }
        return List.copyOf(exposures);
    }
}

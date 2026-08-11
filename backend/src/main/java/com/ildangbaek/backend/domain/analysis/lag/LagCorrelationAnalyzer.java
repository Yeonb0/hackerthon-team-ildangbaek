package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * F-ANALYSIS-01 · 성분-피부 변화 시간차 분석.
 *
 * <p>DB를 모른다. 성분 노출 목록과 피부 관측 목록만 받아 성분별 패턴 후보를 낸다. 이렇게 분리한 이유는
 * 이 계산이 F-ANALYSIS-01의 전부이기 때문이다 — 조회를 섞으면 "2일 뒤 트러블 증가가 반복되는가"라는
 * 판정 자체를 DB 없이 검증할 수 없게 된다.
 *
 * <h2>계산 방식</h2>
 * 성분을 사용한 날 D에 대해, D의 피부 지표를 기준선으로 두고 D+lag(1~7)의 지표와 비교한다.
 * 두 날짜 모두 관측이 있어야 한 쌍이 성립한다. 같은 (성분, 지표, lag) 조합에서 이 쌍을 모아
 * 다수 방향을 패턴 방향으로 잡고, 반복성이 충분하면 확정한다.
 *
 * <h2>확정 기준 (BR 3, 4)</h2>
 * <ul>
 *   <li>관측 쌍이 {@value #MIN_OBSERVATIONS}건 이상</li>
 *   <li>같은 방향 비율이 {@value #MIN_AGREEMENT_RATE} 이상</li>
 *   <li>평균 변화량의 절대값이 {@value #MIN_MEANINGFUL_DELTA}점 이상</li>
 * </ul>
 * 셋 중 하나라도 못 넘으면 확정하지 않고 "확인 중"으로 남긴다. 임계값에 이론적 근거는 없다 —
 * 목업 데이터로 조정한 초기값이며, 실사용 데이터가 쌓이면 재검토 대상이다. (ADR 0009)
 *
 * <p>노출이 아예 없으면 빈 목록을 낸다. 제품 기록이 없는 사용자에게 억지 패턴을 만들지 않기 위해서다.
 */
@Component
public class LagCorrelationAnalyzer {

    /** 추적할 시차 범위. 명세 BR 2가 1~7일로 못박았다. */
    public static final int MIN_LAG_DAYS = 1;
    public static final int MAX_LAG_DAYS = 7;

    /** 기록 3일 미만은 데이터 부족으로 처리한다. (BR 5) */
    public static final int MIN_RECORD_DAYS = 3;

    /** 반복성 판정 임계값. 한 번의 우연을 패턴으로 부르지 않기 위한 하한이다. */
    static final int MIN_OBSERVATIONS = 3;
    static final double MIN_AGREEMENT_RATE = 0.67;
    static final double MIN_MEANINGFUL_DELTA = 3.0;

    /**
     * @param exposures    성분 사용 이력. 같은 성분이 같은 날 여러 슬롯에 있어도 된다.
     * @param observations 날짜·시간대별 피부 관측값
     * @return 성분별 패턴 후보. 확정된 것과 확인 중인 것이 모두 들어 있다.
     */
    public List<LagPattern> analyze(List<IngredientExposure> exposures, List<SkinObservation> observations) {
        long observedDays = observations.stream().map(SkinObservation::date).distinct().count();
        if (observedDays < MIN_RECORD_DAYS || exposures.isEmpty()) {
            return List.of();
        }

        Map<ObservationKey, Map<SkinMetricType, Double>> byDateAndSlot = observations.stream()
                .collect(Collectors.toMap(
                        observation -> new ObservationKey(observation.date(), observation.timeSlot()),
                        SkinObservation::values,
                        (first, ignored) -> first));

        // 같은 성분이라도 모닝과 나이트는 노출 시점이 다르므로 각각의 동일 슬롯 관측과 비교한다.
        Map<Long, IngredientUsage> usageByIngredient = groupUsageByIngredient(exposures);

        List<LagPattern> patterns = new ArrayList<>();
        for (IngredientUsage usage : usageByIngredient.values()) {
            for (SkinMetricType metric : SkinMetricType.values()) {
                for (int lag = MIN_LAG_DAYS; lag <= MAX_LAG_DAYS; lag++) {
                    collectPattern(usage, metric, lag, byDateAndSlot).ifPresent(patterns::add);
                }
            }
        }

        // 확정된 패턴을 먼저, 그 안에서는 변화량이 큰 순으로. 인사이트는 상위 몇 건만 노출되므로
        // 정렬이 곧 "무엇을 보여줄지"를 결정한다.
        patterns.sort(Comparator
                .comparing(LagPattern::confirmed).reversed()
                .thenComparing(pattern -> Math.abs(pattern.averageDelta()), Comparator.reverseOrder()));
        return patterns;
    }

    private Map<Long, IngredientUsage> groupUsageByIngredient(List<IngredientExposure> exposures) {
        Map<Long, IngredientUsage> usageByIngredient = new HashMap<>();
        for (IngredientExposure exposure : exposures) {
            usageByIngredient
                    .computeIfAbsent(exposure.ingredientId(),
                            id -> new IngredientUsage(id, exposure.ingredientName(), new java.util.HashSet<>()))
                    .observationKeys()
                    .add(new ObservationKey(exposure.date(), exposure.timeSlot()));
        }
        return usageByIngredient;
    }

    /**
     * 한 (성분, 지표, 시차) 조합의 패턴 후보를 만든다. 관측 쌍이 하나도 없으면 후보 자체가 없다.
     */
    private Optional<LagPattern> collectPattern(IngredientUsage usage, SkinMetricType metric, int lagDays,
                                                Map<ObservationKey, Map<SkinMetricType, Double>> byDateAndSlot) {
        List<Double> deltas = new ArrayList<>();
        for (ObservationKey usedOn : usage.observationKeys()) {
            Double baseline = valueAt(byDateAndSlot, usedOn, metric);
            Double after = valueAt(byDateAndSlot,
                    new ObservationKey(usedOn.date().plusDays(lagDays), usedOn.timeSlot()), metric);
            if (baseline == null || after == null) {
                continue;
            }
            deltas.add(after - baseline);
        }
        if (deltas.isEmpty()) {
            return Optional.empty();
        }

        int worsened = (int) deltas.stream().filter(delta -> delta > 0).count();
        int improved = (int) deltas.stream().filter(delta -> delta < 0).count();
        // 변화가 없는(0) 쌍은 어느 방향도 지지하지 않지만 관측 쌍으로는 센다. 분모에 남겨야
        // "매번 썼는데 대부분 그대로였다"가 반복성으로 둔갑하지 않는다.
        PatternDirection direction = worsened >= improved ? PatternDirection.WORSENED : PatternDirection.IMPROVED;
        int agreement = direction == PatternDirection.WORSENED ? worsened : improved;

        double averageDelta = deltas.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        int observations = deltas.size();
        boolean confirmed = observations >= MIN_OBSERVATIONS
                && (double) agreement / observations >= MIN_AGREEMENT_RATE
                && Math.abs(averageDelta) >= MIN_MEANINGFUL_DELTA;

        return Optional.of(new LagPattern(usage.ingredientId(), usage.ingredientName(), metric,
                lagDays, direction, observations, agreement, averageDelta, confirmed));
    }

    private Double valueAt(Map<ObservationKey, Map<SkinMetricType, Double>> byDateAndSlot, ObservationKey key,
                           SkinMetricType metric) {
        Map<SkinMetricType, Double> values = byDateAndSlot.get(key);
        return values == null ? null : values.get(metric);
    }

    /** 성분 하나와 그 성분을 쓴 날짜·슬롯 조합(중복 제거). */
    private record IngredientUsage(Long ingredientId, String ingredientName, Set<ObservationKey> observationKeys) {
    }

    /** 분석에서 기준선과 이후 값을 연결하는 키. */
    private record ObservationKey(LocalDate date, TimeSlot timeSlot) {
    }
}

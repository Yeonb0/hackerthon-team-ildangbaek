package com.ildangbaek.backend.domain.analysis.lag;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * F-ANALYSIS-01의 업무 규칙을 고정한다 — 1~7일 추적 · 반복성 확정 · 데이터 부족 처리.
 *
 * <p>목업 데이터를 여기서 직접 만든다. 의도한 패턴(예: "사용 2일 뒤 트러블 +15가 반복")을 심어야
 * 분석기가 그 패턴을 잡아내는지 확인할 수 있다. 무작위 데이터로는 검증 자체가 불가능하다. (ADR 0003)
 */
class LagCorrelationAnalyzerTest {

    private static final LocalDate DAY_ONE = LocalDate.of(2026, 7, 1);
    private static final Long RETINOL = 1L;

    private final LagCorrelationAnalyzer analyzer = new LagCorrelationAnalyzer();

    @DisplayName("사용 2일 뒤 트러블 증가가 반복되면 패턴으로 확정한다")
    @Test
    void confirmsRepeatedWorsening() {
        // 0, 6, 12일차에 사용. 각 사용일의 트러블 50 → 2일 뒤 65로 반복 상승.
        List<Integer> useDays = List.of(0, 6, 12);
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        useDays.forEach(day -> mockup.use(RETINOL, "레티놀", day).bump(SkinMetricType.TROUBLE, day + 2, 15));

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(20));

        LagPattern found = pick(patterns, SkinMetricType.TROUBLE, 2);
        assertThat(found.confirmed()).isTrue();
        assertThat(found.direction()).isEqualTo(PatternDirection.WORSENED);
        assertThat(found.observationCount()).isEqualTo(3);
        assertThat(found.agreementCount()).isEqualTo(3);
        assertThat(found.averageDelta()).isEqualTo(15.0);
        assertThat(found.ingredientName()).isEqualTo("레티놀");
    }

    @DisplayName("변화 방향이 엇갈리면 반복성이 없다고 보고 확정하지 않는다")
    @Test
    void doesNotConfirmWhenDirectionsDisagree() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        mockup.use(RETINOL, "레티놀", 0).bump(SkinMetricType.TROUBLE, 2, 15);
        mockup.use(RETINOL, "레티놀", 6).bump(SkinMetricType.TROUBLE, 8, -14);
        mockup.use(RETINOL, "레티놀", 12).bump(SkinMetricType.TROUBLE, 14, 13);

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(20));

        assertThat(pick(patterns, SkinMetricType.TROUBLE, 2).confirmed()).isFalse();
    }

    @DisplayName("관측 쌍이 3건 미만이면 방향이 일치해도 확정하지 않는다")
    @Test
    void doesNotConfirmBelowMinimumObservations() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        mockup.use(RETINOL, "레티놀", 0).bump(SkinMetricType.TROUBLE, 2, 20);
        mockup.use(RETINOL, "레티놀", 6).bump(SkinMetricType.TROUBLE, 8, 20);

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(20));

        LagPattern found = pick(patterns, SkinMetricType.TROUBLE, 2);
        assertThat(found.observationCount()).isEqualTo(2);
        assertThat(found.confirmed()).isFalse();
    }

    @DisplayName("방향이 일치해도 변화량이 미미하면 확정하지 않는다")
    @Test
    void doesNotConfirmTinyChanges() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        List.of(0, 6, 12).forEach(day ->
                mockup.use(RETINOL, "레티놀", day).bump(SkinMetricType.TROUBLE, day + 2, 1));

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(20));

        LagPattern found = pick(patterns, SkinMetricType.TROUBLE, 2);
        assertThat(found.agreementCount()).isEqualTo(3);
        assertThat(found.confirmed()).isFalse();
    }

    @DisplayName("기록이 3일 미만이면 데이터 부족으로 아무 패턴도 내지 않는다")
    @Test
    void returnsNothingBelowMinimumRecordDays() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        mockup.use(RETINOL, "레티놀", 0);

        assertThat(analyzer.analyze(mockup.exposures(), mockup.observations(2))).isEmpty();
    }

    @DisplayName("제품 기록이 없으면 빈 목록을 낸다 — 억지로 패턴을 만들지 않는다")
    @Test
    void returnsNothingWithoutExposures() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);

        assertThat(analyzer.analyze(List.of(), mockup.observations(20))).isEmpty();
    }

    @DisplayName("시차는 1~7일만 본다 — 8일 뒤 변화는 패턴 후보에 없다")
    @Test
    void tracksOnlyOneToSevenDayLag() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        List.of(0, 10, 20).forEach(day ->
                mockup.use(RETINOL, "레티놀", day).bump(SkinMetricType.TROUBLE, day + 8, 20));

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(40));

        assertThat(patterns).allMatch(pattern -> pattern.lagDays() >= 1 && pattern.lagDays() <= 7);
        assertThat(patterns).noneMatch(LagPattern::confirmed);
    }

    @DisplayName("같은 날 모닝·나이트에 모두 쓴 성분은 각 슬롯의 관측과 따로 비교한다")
    @Test
    void keepsSameDayBothSlotsSeparate() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        List.of(0, 6, 12).forEach(day -> {
            mockup.use(RETINOL, "레티놀", day, TimeSlot.MORNING);
            mockup.use(RETINOL, "레티놀", day, TimeSlot.NIGHT);
            mockup.bump(SkinMetricType.TROUBLE, day + 2, 15);
        });

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(20));

        assertThat(pick(patterns, SkinMetricType.TROUBLE, 2).observationCount()).isEqualTo(6);
    }

    @DisplayName("나이트 제품은 모닝 피부 점수가 아니라 나이트 피부 점수와 비교한다")
    @Test
    void matchesExposureWithSameTimeSlotObservation() {
        List<IngredientExposure> exposures = List.of(
                new IngredientExposure(RETINOL, "레티놀", DAY_ONE, TimeSlot.NIGHT),
                new IngredientExposure(RETINOL, "레티놀", DAY_ONE.plusDays(6), TimeSlot.NIGHT),
                new IngredientExposure(RETINOL, "레티놀", DAY_ONE.plusDays(12), TimeSlot.NIGHT));
        List<SkinObservation> observations = new ArrayList<>();
        for (int day = 0; day < 20; day++) {
            int morningScore = day == 2 || day == 8 || day == 14 ? 90 : 10;
            observations.add(observation(DAY_ONE.plusDays(day), TimeSlot.MORNING, morningScore));
            observations.add(observation(DAY_ONE.plusDays(day), TimeSlot.NIGHT, 50));
        }

        List<LagPattern> patterns = analyzer.analyze(exposures, observations);

        LagPattern nightPattern = pick(patterns, SkinMetricType.TROUBLE, 2);
        assertThat(nightPattern.averageDelta()).isZero();
        assertThat(nightPattern.confirmed()).isFalse();
    }

    @DisplayName("관측 쌍의 절반 이상이 생리 기간에 걸치면 방향이 일치해도 확정하지 않는다")
    @Test
    void doesNotConfirmWhenMostlyMenstrualAffected() {
        // 67%(기본 임계값)는 넘지만 80%(생리 보정 임계값)는 못 넘는 4쌍 중 3쌍 일치.
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        List.of(0, 6, 12, 18).forEach(day ->
                mockup.use(RETINOL, "레티놀", day).bump(SkinMetricType.TROUBLE, day + 2, 15));
        mockup.bump(SkinMetricType.TROUBLE, 20, -15); // 18일차 사용의 D+2(=20일차)만 반대 방향

        java.util.Set<LocalDate> menstrualDates = java.util.Set.of(
                DAY_ONE, DAY_ONE.plusDays(6), DAY_ONE.plusDays(12));

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(25), menstrualDates);

        LagPattern found = pick(patterns, SkinMetricType.TROUBLE, 2);
        assertThat(found.observationCount()).isEqualTo(4);
        assertThat(found.agreementRate()).isEqualTo(0.75);
        assertThat(found.menstrualAffectedCount()).isEqualTo(3);
        assertThat(found.confirmed()).isFalse();
    }

    @DisplayName("생리 기간 정보를 넘기지 않으면 기존 임계값만 적용된다")
    @Test
    void appliesBaseThresholdWhenNoMenstrualDatesGiven() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        List.of(0, 6, 12).forEach(day ->
                mockup.use(RETINOL, "레티놀", day).bump(SkinMetricType.TROUBLE, day + 2, 15));

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(20));

        assertThat(pick(patterns, SkinMetricType.TROUBLE, 2).confirmed()).isTrue();
    }

    @DisplayName("확정된 패턴이 확인 중인 패턴보다 앞에 온다")
    @Test
    void sortsConfirmedFirst() {
        MockupBuilder mockup = new MockupBuilder().baseline(SkinMetricType.TROUBLE, 50);
        List.of(0, 6, 12).forEach(day ->
                mockup.use(RETINOL, "레티놀", day).bump(SkinMetricType.TROUBLE, day + 2, 15));

        List<LagPattern> patterns = analyzer.analyze(mockup.exposures(), mockup.observations(20));

        assertThat(patterns.get(0).confirmed()).isTrue();
        int lastConfirmed = 0;
        for (int i = 0; i < patterns.size(); i++) {
            if (patterns.get(i).confirmed()) {
                lastConfirmed = i;
            }
        }
        assertThat(patterns.subList(0, lastConfirmed + 1)).allMatch(LagPattern::confirmed);
    }

    private LagPattern pick(List<LagPattern> patterns, SkinMetricType metric, int lagDays) {
        return patterns.stream()
                .filter(pattern -> pattern.metricType() == metric && pattern.lagDays() == lagDays)
                .findFirst()
                .orElseThrow(() -> new AssertionError("패턴 후보가 없습니다: %s lag=%d".formatted(metric, lagDays)));
    }

    /**
     * 의도한 패턴을 심은 목업 데이터를 만든다. 기준선을 깔고 특정 날짜에만 변화를 주는 방식이라
     * "이 날 이만큼 움직였다"가 테스트 코드에 그대로 드러난다.
     */
    private static final class MockupBuilder {

        private final List<IngredientExposure> exposures = new ArrayList<>();
        private final Map<SkinMetricType, Integer> baselines = new EnumMap<>(SkinMetricType.class);
        private final Map<Integer, Map<SkinMetricType, Integer>> bumps = new HashMap<>();

        MockupBuilder baseline(SkinMetricType metric, int value) {
            baselines.put(metric, value);
            return this;
        }

        MockupBuilder use(Long ingredientId, String name, int dayOffset) {
            return use(ingredientId, name, dayOffset, TimeSlot.NIGHT);
        }

        MockupBuilder use(Long ingredientId, String name, int dayOffset, TimeSlot slot) {
            exposures.add(new IngredientExposure(ingredientId, name, DAY_ONE.plusDays(dayOffset), slot));
            return this;
        }

        MockupBuilder bump(SkinMetricType metric, int dayOffset, int delta) {
            bumps.computeIfAbsent(dayOffset, key -> new EnumMap<>(SkinMetricType.class)).put(metric, delta);
            return this;
        }

        List<IngredientExposure> exposures() {
            return exposures;
        }

        /** 0일차부터 {@code days}일간 매일 관측이 있는 목업. */
        List<SkinObservation> observations(int days) {
            List<SkinObservation> observations = new ArrayList<>();
            for (int day = 0; day < days; day++) {
                Map<SkinMetricType, Double> values = new EnumMap<>(SkinMetricType.class);
                Map<SkinMetricType, Integer> dayBumps = bumps.getOrDefault(day, Map.of());
                baselines.forEach((metric, base) ->
                        values.put(metric, (double) (base + dayBumps.getOrDefault(metric, 0))));
                observations.add(new SkinObservation(DAY_ONE.plusDays(day), TimeSlot.MORNING, values));
                observations.add(new SkinObservation(DAY_ONE.plusDays(day), TimeSlot.NIGHT, values));
            }
            return observations;
        }
    }

    private SkinObservation observation(LocalDate date, TimeSlot timeSlot, int troubleScore) {
        return new SkinObservation(date, timeSlot, Map.of(SkinMetricType.TROUBLE, (double) troubleScore));
    }
}

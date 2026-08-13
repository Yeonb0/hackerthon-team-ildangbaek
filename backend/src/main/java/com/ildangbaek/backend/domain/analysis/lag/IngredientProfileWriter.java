package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.repository.IngredientRepository;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserSkinType;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * F-ANALYSIS-04 · 개인 성분 프로파일 생성 및 갱신.
 *
 * <p>F-ANALYSIS-01이 낸 패턴 후보를 성분 단위로 접어 {@link IngredientProfile} 행으로 남긴다.
 * 인사이트({@link LagInsightWriter})가 "이번 회차에 보여줄 문구"라면, 이쪽은 "이 사용자에게 이 성분이
 * 어떤가"라는 누적 상태다. 구매 전 확인(F-CHECK)과 마이페이지(USER-02)가 이 표를 읽는다. (BR 4)
 *
 * <h2>분류 (BR 1)</h2>
 * <ul>
 *   <li>확정된 악화 패턴이 있으면 {@link ReactionType#CAUTION}</li>
 *   <li>확정된 개선 패턴만 있으면 {@link ReactionType#SUITABLE}</li>
 *   <li>확정된 패턴이 없으면 {@link ReactionType#INSUFFICIENT}</li>
 * </ul>
 * 악화가 개선을 이긴다. 같은 성분이 한 지표는 좋게, 다른 지표는 나쁘게 만들 때 "맞음"이라고 부르면
 * 사용자가 그 성분이 든 제품을 더 사게 된다. 판단이 틀렸을 때의 비용이 한쪽으로 기울어 있다.
 *
 * <h2>피부 타입 (BR 3)</h2>
 * 민감성 사용자에게만 악화 방향 확정 기준을 완화한다. 자세한 근거는 ADR 0010에 있다.
 * <strong>관측이 없는 성분은 피부 타입과 무관하게 INSUFFICIENT다.</strong> 피부 타입만으로 성분을
 * 맞음/주의로 부르는 것은 BR 1이 금지한 "임의 분류"다.
 *
 * <p>노출은 있으나 확정 패턴이 없는 성분도 INSUFFICIENT 행으로 남긴다. USER-02가 "왜 아직 데이터가
 * 부족한지"를 {@code recordCount}로 설명해야 하는데, 그 횟수를 아는 곳이 이 표뿐이다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IngredientProfileWriter {

    /**
     * 민감성 피부에서 악화 방향 확정에 요구하는 평균 변화량. 기본값
     * {@link LagCorrelationAnalyzer#MIN_MEANINGFUL_DELTA}(3점)보다 낮다. (ADR 0010)
     */
    static final double SENSITIVE_WORSENED_DELTA = 2.0;

    private final IngredientProfileRepository ingredientProfileRepository;
    private final IngredientRepository ingredientRepository;
    private final UserSkinTypeRepository userSkinTypeRepository;

    /**
     * 사용자 한 명의 성분 프로파일을 이번 분석 결과로 갱신한다.
     *
     * @param exposures 이번 분석 기간의 성분 노출. 패턴이 안 나온 성분도 여기 있으면 행을 남긴다.
     * @param patterns  {@link LagCorrelationAnalyzer}가 낸 패턴 후보 전체
     * @return 생성·갱신된 프로파일 행
     */
    @Transactional
    public List<IngredientProfile> write(User user, List<IngredientExposure> exposures,
                                         List<LagPattern> patterns) {
        boolean sensitive = hasSensitiveSkin(user.getId());

        Map<Long, List<LagPattern>> patternsByIngredient = new LinkedHashMap<>();
        for (LagPattern pattern : patterns) {
            patternsByIngredient.computeIfAbsent(pattern.ingredientId(), id -> new ArrayList<>()).add(pattern);
        }

        // 노출된 성분 전부가 대상이다. 패턴이 없는 성분은 INSUFFICIENT 행이 된다.
        Set<Long> ingredientIds = new LinkedHashSet<>();
        exposures.forEach(exposure -> ingredientIds.add(exposure.ingredientId()));
        ingredientIds.addAll(patternsByIngredient.keySet());
        if (ingredientIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Integer> exposureCounts = countExposureDays(exposures);
        Map<Long, IngredientProfile> existing = new HashMap<>();
        ingredientProfileRepository.findAllByUserId(user.getId())
                .forEach(profile -> existing.put(profile.getIngredient().getId(), profile));
        Map<Long, Ingredient> ingredients = new HashMap<>();
        ingredientRepository.findAllById(ingredientIds)
                .forEach(ingredient -> ingredients.put(ingredient.getId(), ingredient));

        List<IngredientProfile> updated = new ArrayList<>();
        for (Long ingredientId : ingredientIds) {
            Ingredient ingredient = ingredients.get(ingredientId);
            if (ingredient == null) {
                // 노출에 있던 성분이 마스터에 없다. FK가 있으니 정상적으로는 일어나지 않지만,
                // 조용히 건너뛰면 프로파일에서 성분 하나가 이유 없이 사라진다.
                log.warn("성분 마스터에 없어 프로파일을 건너뜁니다. userId={} ingredientId={}",
                        user.getId(), ingredientId);
                continue;
            }
            IngredientProfile profile = existing.get(ingredientId);
            if (profile == null) {
                profile = IngredientProfile.builder().user(user).ingredient(ingredient).build();
            }
            apply(profile, patternsByIngredient.getOrDefault(ingredientId, List.of()),
                    exposureCounts.getOrDefault(ingredientId, 0), sensitive);
            updated.add(profile);
        }
        return ingredientProfileRepository.saveAll(updated);
    }

    /**
     * 매 회차 전체를 다시 계산해 상태를 덮어쓴다. (BR 2)
     *
     * <p>인사이트와 달리 행을 지웠다 다시 만들지 않는다. {@code UNIQUE(user_id, ingredient_id)}가 있어
     * 갱신이 자연스럽고, 삭제 후 재삽입하면 F-CHECK가 참조하는 행의 id가 매번 바뀐다.
     */
    private void apply(IngredientProfile profile, List<LagPattern> patterns, int exposureDays,
                       boolean sensitive) {
        LagPattern representative = null;
        int positive = 0;
        int negative = 0;
        for (LagPattern pattern : strongestPerMetric(patterns, sensitive)) {
            if (pattern.direction() == PatternDirection.WORSENED) {
                negative++;
            } else {
                positive++;
            }
            representative = stronger(representative, pattern);
        }

        if (representative == null) {
            // 관측은 셌지만 판단은 하지 않는다. 근거 문구도 남기지 않는다 — USER-02 BR 1이
            // INSUFFICIENT의 reason을 null로 요구한다. 지어낸 근거가 판단처럼 읽히면 안 된다.
            profile.updateAnalysis(ReactionType.INSUFFICIENT, null, null,
                    exposureDays, 0, 0, null, null);
            return;
        }

        ReactionType reactionType = negative > 0 ? ReactionType.CAUTION : ReactionType.SUITABLE;
        profile.updateAnalysis(
                reactionType,
                BigDecimal.valueOf(representative.averageDelta()).setScale(4, RoundingMode.HALF_UP),
                BigDecimal.valueOf(representative.agreementRate() * 100).setScale(2, RoundingMode.HALF_UP),
                exposureDays,
                positive,
                negative,
                representative.lagDays(),
                summarize(representative, sensitive));
    }

    /**
     * 확정된 패턴을 지표당 하나로 접는다.
     *
     * <p>분석기는 (성분, 지표, 시차) 조합마다 후보를 내므로 한 지표에서 시차만 다른 패턴이 최대 7개까지
     * 확정될 수 있다. 그대로 세면 같은 현상 하나가 {@code negative_count}를 7로 부풀린다.
     * {@link LagInsightWriter}가 인사이트를 지표당 하나로 줄이는 것과 같은 이유다.
     */
    private List<LagPattern> strongestPerMetric(List<LagPattern> patterns, boolean sensitive) {
        Map<SkinMetricType, LagPattern> strongest = new LinkedHashMap<>();
        for (LagPattern pattern : patterns) {
            if (!isConfirmed(pattern, sensitive)) {
                continue;
            }
            strongest.merge(pattern.metricType(), pattern,
                    (current, candidate) ->
                            Math.abs(candidate.averageDelta()) > Math.abs(current.averageDelta())
                                    ? candidate : current);
        }
        return List.copyOf(strongest.values());
    }

    /**
     * 확정 판정. 분석기가 이미 계산해 둔 {@link LagPattern#confirmed()}를 그대로 쓰되, 민감성 사용자의
     * 악화 방향만 변화량 기준을 낮춰 다시 본다. (BR 3)
     *
     * <p>관측 쌍 수와 일치 비율은 완화하지 않는다. 그 둘은 "반복되는가"를 재는 값이라 피부 타입과 무관하다.
     * 완화 대상은 변화량뿐이다 — 민감성 피부에서는 같은 자극이 더 작은 폭으로도 유의하다는 것이 근거다.
     */
    private boolean isConfirmed(LagPattern pattern, boolean sensitive) {
        if (pattern.confirmed()) {
            return true;
        }
        return sensitive
                && pattern.direction() == PatternDirection.WORSENED
                && pattern.observationCount() >= LagCorrelationAnalyzer.MIN_OBSERVATIONS
                && pattern.agreementRate() >= LagCorrelationAnalyzer.MIN_AGREEMENT_RATE
                && Math.abs(pattern.averageDelta()) >= SENSITIVE_WORSENED_DELTA;
    }

    /** 대표 패턴은 악화 우선, 그다음 변화량이 큰 것. 분류 기준(악화 우선)과 근거 문구를 일치시킨다. */
    private LagPattern stronger(LagPattern current, LagPattern candidate) {
        if (current == null) {
            return candidate;
        }
        boolean currentWorsened = current.direction() == PatternDirection.WORSENED;
        boolean candidateWorsened = candidate.direction() == PatternDirection.WORSENED;
        if (currentWorsened != candidateWorsened) {
            return candidateWorsened ? candidate : current;
        }
        return Math.abs(candidate.averageDelta()) > Math.abs(current.averageDelta()) ? candidate : current;
    }

    /**
     * 노출 일수. 같은 날 모닝·나이트에 모두 썼으면 1일로 센다 — 분석기가 노출을 세는 방식과 맞춘다.
     * 여기서 슬롯을 따로 세면 {@code observation_count}가 분석에 실제로 쓰인 횟수보다 부풀려진다.
     */
    private Map<Long, Integer> countExposureDays(List<IngredientExposure> exposures) {
        Map<Long, Set<LocalDate>> daysByIngredient = new HashMap<>();
        for (IngredientExposure exposure : exposures) {
            daysByIngredient.computeIfAbsent(exposure.ingredientId(), id -> new LinkedHashSet<>())
                    .add(exposure.date());
        }
        Map<Long, Integer> counts = new HashMap<>();
        daysByIngredient.forEach((ingredientId, days) -> counts.put(ingredientId, days.size()));
        return counts;
    }

    /**
     * 온보딩에서 민감성을 선택했는지. (BR 3)
     *
     * <p><strong>온보딩 API(F-ONBOARD-02, A 담당)가 아직 없어 {@code user_skin_types}가 비어 있다.</strong>
     * 그래서 실사용 경로에서는 항상 false이고 완화가 적용되지 않는다 — 기본 기준으로만 판정된다는 뜻이라
     * 안전한 쪽으로 degrade하지만, 조용히 그렇게 되면 "완화가 동작하는데 결과가 안 나오는" 것과
     * 구분되지 않는다. 그래서 선택 이력 자체가 없을 때 로그를 남긴다.
     * 로컬 확인은 {@code seed/f-analysis-04-sensitive.sql} 참고.
     */
    private boolean hasSensitiveSkin(Long userId) {
        List<UserSkinType> selected = userSkinTypeRepository.findAllByUserId(userId);
        if (selected.isEmpty()) {
            log.debug("피부 타입 선택 이력이 없어 민감성 완화를 적용하지 않습니다. userId={}", userId);
            return false;
        }
        return selected.stream()
                .map(UserSkinType::getSkinType)
                .anyMatch(skinType -> skinType != null && skinType.getCode() == SkinTypeCode.SENSITIVE);
    }

    /**
     * 사용자에게 보여줄 근거. 인과가 아니라 관측을 서술한다(F-ANALYSIS-01 주석 — 연관 패턴으로만 취급).
     */
    private String summarize(LagPattern pattern, boolean sensitive) {
        String base = "%s 사용 후 %d일 뒤 %s %s가 %d회 중 %d회 관찰됐어요".formatted(
                pattern.ingredientName(),
                pattern.lagDays(),
                metricName(pattern.metricType()),
                pattern.direction() == PatternDirection.WORSENED ? "증가" : "감소",
                pattern.observationCount(),
                pattern.agreementCount());
        // 완화 기준으로 확정된 경우에만 그 사실을 밝힌다. 같은 관측이 다른 사용자에게는 확정되지
        // 않을 수 있다는 것을 근거 문구가 드러내야 한다.
        if (sensitive && !pattern.confirmed()) {
            return "민감성 피부 기준 · " + base;
        }
        return base;
    }

    private String metricName(SkinMetricType metricType) {
        return switch (metricType) {
            case TROUBLE -> "트러블";
            case REDNESS -> "홍조";
            case PORES -> "모공";
            case PIGMENTATION -> "색소침착";
        };
    }
}

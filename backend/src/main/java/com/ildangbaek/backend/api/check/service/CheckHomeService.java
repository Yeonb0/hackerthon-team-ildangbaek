package com.ildangbaek.backend.api.check.service;

import com.ildangbaek.backend.api.check.dto.CheckHomeResponse;
import com.ildangbaek.backend.api.check.dto.CheckRecommendationResponse;
import com.ildangbaek.backend.api.check.dto.RecommendationCategory;
import com.ildangbaek.backend.api.check.dto.TodayContextResponse;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import com.ildangbaek.backend.domain.environment.entity.HumidityGrade;
import com.ildangbaek.backend.domain.environment.repository.DailyEnvironmentRepository;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CHECK-01 · 쇼핑 홈 조회. (docs/api_명세서.md 10장, F-CHECK-01)
 *
 * <p>추천은 개인 프로파일의 {@code GOOD} 성분을 핵심 성분으로 가진 제품이다(BR 2 "근거 없는 추천은
 * 노출하지 않는다"). 한 제품이 여러 GOOD 성분과 매칭돼도 추천 목록엔 제품당 1건만 나온다.
 *
 * <p>{@code completionRate}는 {@link ProfileCompletionCalculator}가 단독으로 계산한다(ADR 0011 BR 4).
 *
 * <p>{@code category}·{@code todayContext}는 ADR 0018에서 추가됐다 — {@code category}는 제품
 * {@code ProductCategory} 기준 추정 매칭이다(재검토 대상).
 */
@Service
@RequiredArgsConstructor
public class CheckHomeService {

    /** 세안·토너·세럼류는 트러블/홍조 진정 목적으로 우선 쓰인다고 추정한다(ADR 0018). */
    private static final Set<ProductCategory> TODAY_NEEDED_CATEGORIES =
            Set.of(ProductCategory.CLEANSING, ProductCategory.TONER, ProductCategory.SERUM);

    /** 크림류는 보습 목적으로 우선 쓰인다고 추정한다(ADR 0018). */
    private static final Set<ProductCategory> HUMIDITY_CARE_CATEGORIES = Set.of(ProductCategory.CREAM);

    /** 트러블·홍조 점수가 이 값 이상이면 "오늘 필요해요"로 분류한다(ADR 0018, 추정 임계값). */
    private static final int TODAY_NEEDED_SCORE_THRESHOLD = 50;

    private final IngredientProfileRepository ingredientProfileRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final ProfileCompletionCalculator profileCompletionCalculator;
    private final SkinRecordRepository skinRecordRepository;
    private final SkinMetricRepository skinMetricRepository;
    private final DailyEnvironmentRepository dailyEnvironmentRepository;

    @Transactional(readOnly = true)
    public CheckHomeResponse getHome(Long userId) {
        List<Long> goodIngredientIds = ingredientProfileRepository.findAllByUserIdWithIngredient(userId).stream()
                .filter(profile -> profile.getReactionType() == ReactionType.SUITABLE)
                .map(profile -> profile.getIngredient().getId())
                .toList();

        TodayContextResponse todayContext = buildTodayContext(userId);

        List<CheckRecommendationResponse> recommendations = goodIngredientIds.isEmpty()
                ? List.of()
                : buildRecommendations(goodIngredientIds, todayContext);

        int profileCompletion = profileCompletionCalculator.calculate(userId);

        return new CheckHomeResponse(profileCompletion, recommendations, todayContext, List.of());
    }

    /**
     * 오늘(가장 최근) 피부 기록의 트러블·홍조 점수와 오늘 환경 데이터의 습도를 모은다. 둘 다
     * 기록이 없을 수 있어 각 필드는 개별적으로 {@code null}일 수 있다.
     */
    private TodayContextResponse buildTodayContext(Long userId) {
        Integer troubleScore = null;
        Integer rednessScore = null;

        SkinRecord latestRecord =
                skinRecordRepository.findFirstByUserIdOrderByRecordDateDescCapturedAtDesc(userId).orElse(null);
        if (latestRecord != null) {
            Map<SkinMetricType, Integer> scores = skinMetricRepository.findAllBySkinRecordId(latestRecord.getId())
                    .stream()
                    .collect(Collectors.toMap(SkinMetric::getMetricType, m -> m.getMetricValue().intValue()));
            troubleScore = scores.get(SkinMetricType.TROUBLE);
            rednessScore = scores.get(SkinMetricType.REDNESS);
        }

        Integer humidity = null;
        HumidityGrade humidityGrade = null;
        DailyEnvironment environment =
                dailyEnvironmentRepository.findByUserIdAndRecordDate(userId, LocalDate.now()).orElse(null);
        if (environment != null && environment.getHumidity() != null) {
            humidity = environment.getHumidity().intValue();
            humidityGrade = HumidityGrade.from(environment.getHumidity());
        }

        return new TodayContextResponse(troubleScore, rednessScore, humidity, humidityGrade);
    }

    /**
     * 제품 ID로 묶어 중복을 없애고, 묶인 그룹의 성분명을 모아 {@code reason}을 조립한다.
     * {@code Product}는 {@code equals}/{@code hashCode}를 재정의하지 않으므로 ID로 그룹핑한다.
     * 순서 보존을 위해 {@link LinkedHashMap}을 쓴다 — 쿼리 반환 순서가 그대로 추천 순서가 된다.
     */
    private List<CheckRecommendationResponse> buildRecommendations(
            List<Long> goodIngredientIds, TodayContextResponse todayContext) {
        List<ProductIngredient> matches =
                productIngredientRepository.findAllWithProductByIngredientIdInAndKeyIngredientTrue(goodIngredientIds);

        Map<Long, List<ProductIngredient>> matchesByProductId = matches.stream()
                .collect(Collectors.groupingBy(
                        pi -> pi.getProduct().getId(), LinkedHashMap::new, Collectors.toList()));

        return matchesByProductId.values().stream()
                .map(productMatches -> toRecommendation(productMatches, todayContext))
                .toList();
    }

    private CheckRecommendationResponse toRecommendation(
            List<ProductIngredient> productMatches, TodayContextResponse todayContext) {
        Product product = productMatches.get(0).getProduct();
        String ingredientNames = productMatches.stream()
                .map(pi -> pi.getIngredient().getKoreanName())
                .collect(Collectors.joining("·"));
        String reason = ingredientNames + "이 잘 맞는 성분이에요";
        RecommendationCategory category = classify(product.getCategory(), todayContext);
        return new CheckRecommendationResponse(
                product.getId(), product.getProductName(), product.getBrandName(), reason, category);
    }

    /**
     * 제품 카테고리 기준 추정 매칭(ADR 0018). 트러블/홍조가 임계값 이상이면 진정 계열 카테고리를
     * {@code TODAY_NEEDED}로, 건조하면 보습 계열 카테고리를 {@code HUMIDITY_CARE}로 우선 분류하고
     * 나머지는 {@code MATCHED_INGREDIENT}로 둔다.
     */
    private RecommendationCategory classify(ProductCategory category, TodayContextResponse todayContext) {
        boolean todayNeeded = (isHighScore(todayContext.troubleScore()) || isHighScore(todayContext.rednessScore()))
                && TODAY_NEEDED_CATEGORIES.contains(category);
        if (todayNeeded) {
            return RecommendationCategory.TODAY_NEEDED;
        }

        boolean humidityCare = todayContext.humidityGrade() == HumidityGrade.DRY
                && HUMIDITY_CARE_CATEGORIES.contains(category);
        if (humidityCare) {
            return RecommendationCategory.HUMIDITY_CARE;
        }

        return RecommendationCategory.MATCHED_INGREDIENT;
    }

    private boolean isHighScore(Integer score) {
        return score != null && score >= TODAY_NEEDED_SCORE_THRESHOLD;
    }
}

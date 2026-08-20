package com.ildangbaek.backend.api.check.service;

import com.ildangbaek.backend.api.check.dto.CheckHomeResponse;
import com.ildangbaek.backend.api.check.dto.CheckRecommendationResponse;
import com.ildangbaek.backend.api.check.dto.RecommendationCategory;
import com.ildangbaek.backend.api.check.dto.TodayContextResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import com.ildangbaek.backend.domain.environment.entity.HumidityGrade;
import com.ildangbaek.backend.domain.environment.repository.DailyEnvironmentRepository;
import com.ildangbaek.backend.domain.product.client.ProductCommentClient;
import com.ildangbaek.backend.domain.product.client.ProductCommentClient.ProductCommentRequest;
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
import java.time.ZoneId;
import java.util.ArrayList;
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

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

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
    private final ProductCommentClient productCommentClient;

    @Transactional(readOnly = true)
    public CheckHomeResponse getHome(Long userId) {
        List<IngredientProfile> profiles = ingredientProfileRepository.findAllByUserIdWithIngredient(userId);
        List<Long> goodIngredientIds = ingredientIdsOf(profiles, ReactionType.SUITABLE);
        Set<Long> cautionIngredientIds = Set.copyOf(ingredientIdsOf(profiles, ReactionType.CAUTION));

        TodayContextResponse todayContext = buildTodayContext(userId);

        List<CheckRecommendationResponse> recommendations = goodIngredientIds.isEmpty()
                ? List.of()
                : buildRecommendations(goodIngredientIds, cautionIngredientIds, todayContext);

        int profileCompletion = profileCompletionCalculator.calculate(userId);

        return new CheckHomeResponse(profileCompletion, recommendations, todayContext, List.of());
    }

    private List<Long> ingredientIdsOf(List<IngredientProfile> profiles, ReactionType reactionType) {
        return profiles.stream()
                .filter(profile -> profile.getReactionType() == reactionType)
                .map(profile -> profile.getIngredient().getId())
                .toList();
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
                dailyEnvironmentRepository.findByUserIdAndRecordDate(userId, LocalDate.now(KST)).orElse(null);
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
     *
     * <p>{@code reason}까지 조립한 뒤 ai-server에 배치로 {@code aiComment}를 요청한다(ADR 0025).
     * 제품 수만큼 개별 호출하면 지연·비용이 배로 늘어나 한 번의 호출로 묶는다.
     *
     * <p>{@code tags}는 규칙으로 도출한다(ADR 0027). 주의 성분 판정에 추천 제품 전체의 성분이
     * 필요해 쿼리 1번을 더 쓰지만, 제품별로 나눠 읽지 않아 제품 수와 무관하게 1회로 고정된다.
     */
    private List<CheckRecommendationResponse> buildRecommendations(
            List<Long> goodIngredientIds, Set<Long> cautionIngredientIds, TodayContextResponse todayContext) {
        List<ProductIngredient> matches =
                productIngredientRepository.findAllWithProductByIngredientIdInAndKeyIngredientTrue(goodIngredientIds);

        Map<Long, List<ProductIngredient>> matchesByProductId = matches.stream()
                .collect(Collectors.groupingBy(
                        pi -> pi.getProduct().getId(), LinkedHashMap::new, Collectors.toList()));

        Set<Long> productIdsWithCaution =
                findProductIdsWithCaution(List.copyOf(matchesByProductId.keySet()), cautionIngredientIds);

        List<CheckRecommendationResponse> recommendations = new ArrayList<>();
        List<ProductCommentRequest> commentRequests = new ArrayList<>();
        for (Map.Entry<Long, List<ProductIngredient>> entry : matchesByProductId.entrySet()) {
            List<ProductIngredient> productMatches = entry.getValue();
            List<String> ingredientNames = productMatches.stream()
                    .map(pi -> pi.getIngredient().getKoreanName())
                    .toList();
            CheckRecommendationResponse recommendation = toRecommendation(
                    productMatches.get(0).getProduct(),
                    ingredientNames,
                    todayContext,
                    !productIdsWithCaution.contains(entry.getKey()));
            recommendations.add(recommendation);
            commentRequests.add(new ProductCommentRequest(
                    recommendation.productId(),
                    recommendation.name(),
                    recommendation.brand(),
                    ingredientNames,
                    recommendation.category().name()));
        }

        Map<Long, String> aiComments = productCommentClient.generateComments(commentRequests);

        return recommendations.stream()
                .map(r -> withAiComment(r, aiComments.get(r.productId())))
                .toList();
    }

    /**
     * 사용자 프로파일에서 CAUTION인 성분을 하나라도 가진 제품의 ID. 주의 성분 프로파일이 없으면
     * 대조할 것이 없어 조회하지 않는다 — 이때는 모든 제품이 "주의 성분 없음"이다.
     */
    private Set<Long> findProductIdsWithCaution(List<Long> productIds, Set<Long> cautionIngredientIds) {
        if (cautionIngredientIds.isEmpty() || productIds.isEmpty()) {
            return Set.of();
        }
        return productIngredientRepository.findAllWithIngredientByProductIdIn(productIds).stream()
                .filter(pi -> cautionIngredientIds.contains(pi.getIngredient().getId()))
                .map(pi -> pi.getProduct().getId())
                .collect(Collectors.toSet());
    }

    private CheckRecommendationResponse toRecommendation(
            Product product, List<String> ingredientNames, TodayContextResponse todayContext, boolean cautionFree) {
        String reason = String.join("·", ingredientNames) + "이 잘 맞는 성분이에요";
        RecommendationCategory category = classify(product.getCategory(), todayContext);
        return new CheckRecommendationResponse(
                product.getId(), product.getProductName(), product.getBrandName(), reason,
                product.getImageUrl(), category, null,
                buildTags(category, cautionFree));
    }

    /**
     * 추천 카드의 근거 칩(ADR 0027). 첫 칩은 {@code category} 판정 근거를 요약하고, 둘째 칩은
     * 사용자 프로파일 기준 주의 성분이 없을 때만 붙인다 — 있는 경우 "포함" 문구를 넣지 않는 이유는
     * 추천 카드가 그 제품을 권하는 자리이지 경고하는 자리가 아니기 때문이다. CHECK-02(제품 상세)가
     * 주의 성분을 다룬다.
     */
    private List<String> buildTags(RecommendationCategory category, boolean cautionFree) {
        List<String> tags = new ArrayList<>();
        tags.add(switch (category) {
            case TODAY_NEEDED -> "트러블 진정 성분";
            case HUMIDITY_CARE -> "보습 강화 성분";
            case MATCHED_INGREDIENT -> "잘 맞는 성분";
        });
        if (cautionFree) {
            tags.add("주의 성분 미포함");
        }
        return List.copyOf(tags);
    }

    private CheckRecommendationResponse withAiComment(CheckRecommendationResponse r, String aiComment) {
        return new CheckRecommendationResponse(
                r.productId(), r.name(), r.brand(), r.reason(), r.imageUrl(), r.category(), aiComment, r.tags());
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

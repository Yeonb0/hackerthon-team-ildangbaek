package com.ildangbaek.backend.api.check.service;

import com.ildangbaek.backend.api.check.dto.CheckHomeResponse;
import com.ildangbaek.backend.api.check.dto.CheckRecommendationResponse;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
 */
@Service
@RequiredArgsConstructor
public class CheckHomeService {

    private final IngredientProfileRepository ingredientProfileRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final ProfileCompletionCalculator profileCompletionCalculator;

    @Transactional(readOnly = true)
    public CheckHomeResponse getHome(Long userId) {
        List<Long> goodIngredientIds = ingredientProfileRepository.findAllByUserIdWithIngredient(userId).stream()
                .filter(profile -> profile.getReactionType() == ReactionType.SUITABLE)
                .map(profile -> profile.getIngredient().getId())
                .toList();

        List<CheckRecommendationResponse> recommendations = goodIngredientIds.isEmpty()
                ? List.of()
                : buildRecommendations(goodIngredientIds);

        int profileCompletion = profileCompletionCalculator.calculate(userId);

        return new CheckHomeResponse(profileCompletion, recommendations, List.of());
    }

    /**
     * 제품 ID로 묶어 중복을 없애고, 묶인 그룹의 성분명을 모아 {@code reason}을 조립한다.
     * {@code Product}는 {@code equals}/{@code hashCode}를 재정의하지 않으므로 ID로 그룹핑한다.
     * 순서 보존을 위해 {@link LinkedHashMap}을 쓴다 — 쿼리 반환 순서가 그대로 추천 순서가 된다.
     */
    private List<CheckRecommendationResponse> buildRecommendations(List<Long> goodIngredientIds) {
        List<ProductIngredient> matches =
                productIngredientRepository.findAllWithProductByIngredientIdInAndKeyIngredientTrue(goodIngredientIds);

        Map<Long, List<ProductIngredient>> matchesByProductId = matches.stream()
                .collect(Collectors.groupingBy(
                        pi -> pi.getProduct().getId(), LinkedHashMap::new, Collectors.toList()));

        return matchesByProductId.values().stream()
                .map(this::toRecommendation)
                .toList();
    }

    private CheckRecommendationResponse toRecommendation(List<ProductIngredient> productMatches) {
        Product product = productMatches.get(0).getProduct();
        String ingredientNames = productMatches.stream()
                .map(pi -> pi.getIngredient().getKoreanName())
                .collect(Collectors.joining("·"));
        String reason = ingredientNames + "이 잘 맞는 성분이에요";
        return new CheckRecommendationResponse(product.getId(), product.getProductName(), product.getBrandName(), reason);
    }
}

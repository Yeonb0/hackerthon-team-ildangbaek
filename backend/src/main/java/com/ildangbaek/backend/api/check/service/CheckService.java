package com.ildangbaek.backend.api.check.service;

import com.ildangbaek.backend.api.check.dto.CheckIngredientResponse;
import com.ildangbaek.backend.api.check.dto.CheckResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.check.ClassifiedIngredient;
import com.ildangbaek.backend.domain.check.RiskLevelCalculator;
import com.ildangbaek.backend.domain.check.RiskLevelCalculator.RiskOutcome;
import com.ildangbaek.backend.domain.check.entity.ProductRiskAssessment;
import com.ildangbaek.backend.domain.check.entity.ProductRiskIngredient;
import com.ildangbaek.backend.domain.check.repository.ProductRiskAssessmentRepository;
import com.ildangbaek.backend.domain.check.repository.ProductRiskIngredientRepository;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * F-CHECK-03 · 개인화 위험도 산출 (CHECK-02 생성 · CHECK-03 조회). (docs/api_명세서.md)
 *
 * <p>지금까지의 분석 파이프라인(F-ANALYSIS-01 시차 분석 → 04 성분 프로파일)이 실제 구매 판단에
 * 쓰이는 첫 소비처다. 등급 산출 기준은 ADR 0015.
 */
@Service
@RequiredArgsConstructor
public class CheckService {

    private final ProductRepository productRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final IngredientProfileRepository ingredientProfileRepository;
    private final UserRepository userRepository;
    private final ProductRiskAssessmentRepository productRiskAssessmentRepository;
    private final ProductRiskIngredientRepository productRiskIngredientRepository;
    private final RiskLevelCalculator riskLevelCalculator;
    private final CheckWriter checkWriter;

    public CheckResponse create(Long userId, Long productId) {
        Product product = productRepository.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECK_PRODUCT_NOT_FOUND));

        List<ProductIngredient> productIngredients =
                productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(productId);
        if (productIngredients.isEmpty()) {
            throw new BusinessException(ErrorCode.CHECK_INGREDIENT_DATA_INSUFFICIENT);
        }

        List<Long> ingredientIds = productIngredients.stream().map(pi -> pi.getIngredient().getId()).toList();
        Map<Long, IngredientProfile> profilesByIngredientId = new HashMap<>();
        for (IngredientProfile profile : ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(userId, ingredientIds)) {
            profilesByIngredientId.put(profile.getIngredient().getId(), profile);
        }

        List<ClassifiedIngredient> classified = productIngredients.stream()
                .map(pi -> classify(pi, profilesByIngredientId.get(pi.getIngredient().getId())))
                .toList();

        int suitableCount = countBy(classified, ReactionType.SUITABLE);
        int cautionCount = countBy(classified, ReactionType.CAUTION);
        int insufficientCount = countBy(classified, ReactionType.INSUFFICIENT);

        if (suitableCount + cautionCount == 0) {
            throw new BusinessException(ErrorCode.CHECK_PROFILE_NOT_READY);
        }

        RiskOutcome outcome = riskLevelCalculator.calculate(suitableCount, cautionCount);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        ProductRiskAssessment assessment = checkWriter.save(
                user, product, outcome, suitableCount, cautionCount, insufficientCount, classified);

        List<CheckIngredientResponse> ingredients = classified.stream().map(this::toResponse).toList();
        return CheckResponse.of(assessment, ingredients);
    }

    @Transactional(readOnly = true)
    public CheckResponse get(Long userId, Long checkId) {
        ProductRiskAssessment assessment = productRiskAssessmentRepository
                .findByIdAndUserIdWithProduct(checkId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECK_NOT_FOUND));

        List<CheckIngredientResponse> ingredients =
                productRiskIngredientRepository.findAllByAssessmentIdWithIngredient(checkId).stream()
                        .map(this::toResponse)
                        .toList();

        return CheckResponse.of(assessment, ingredients);
    }

    /**
     * 프로파일이 없는 성분은 {@code INSUFFICIENT}다. 근거는 표현 계층에서 다시 한번 비운다 —
     * {@code INSUFFICIENT}면 항상 {@code null}, 확정 상태여도 근거 문구가 없으면 지어내지 않고
     * {@code null}이다 (ADR 0015 결정 5).
     */
    private ClassifiedIngredient classify(ProductIngredient productIngredient, IngredientProfile profile) {
        if (profile == null) {
            return new ClassifiedIngredient(productIngredient.getIngredient(), ReactionType.INSUFFICIENT, null);
        }
        ReactionType reactionType = profile.getReactionType();
        String reason = reactionType == ReactionType.INSUFFICIENT ? null : profile.getReasonSummary();
        return new ClassifiedIngredient(productIngredient.getIngredient(), reactionType, reason);
    }

    private int countBy(List<ClassifiedIngredient> classified, ReactionType reactionType) {
        return (int) classified.stream().filter(item -> item.reactionType() == reactionType).count();
    }

    private CheckIngredientResponse toResponse(ClassifiedIngredient item) {
        return new CheckIngredientResponse(
                item.ingredient().getId(),
                item.ingredient().getKoreanName(),
                IngredientStatus.from(item.reactionType()),
                item.reason());
    }

    /**
     * CHECK-03은 저장된 {@link ProductRiskIngredient}에서 다시 읽으므로 위와 다른 변환이 필요하다.
     * 저장 시점에 이미 근거를 비웠지만, 상태가 되돌아가는 경로에 대비해 표현 계층에서 다시 막는다
     * (USER-02와 같은 방어).
     */
    private CheckIngredientResponse toResponse(ProductRiskIngredient riskIngredient) {
        boolean insufficient = riskIngredient.getReactionType() == ReactionType.INSUFFICIENT;
        return new CheckIngredientResponse(
                riskIngredient.getIngredient().getId(),
                riskIngredient.getIngredient().getKoreanName(),
                IngredientStatus.from(riskIngredient.getReactionType()),
                insufficient ? null : riskIngredient.getReason());
    }
}

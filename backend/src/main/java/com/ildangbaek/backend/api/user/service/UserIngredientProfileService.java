package com.ildangbaek.backend.api.user.service;

import com.ildangbaek.backend.api.user.dto.IngredientProfileItemResponse;
import com.ildangbaek.backend.api.user.dto.IngredientProfileResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * USER-02 · 성분 프로파일 전체 조회. (docs/api_명세서.md 5장)
 *
 * <p>F-ANALYSIS-04가 채운 {@code ingredient_profiles}를 읽기만 한다. 분석을 실행하지 않으므로
 * 프로파일이 비어 있으면 빈 배열을 내려준다 — 아직 기록이 없는 상태는 오류가 아니다.
 *
 * <p>{@code completionRate}는 {@link ProfileCompletionCalculator}가 단독으로 계산한다(ADR 0011 BR 4).
 * 이 서비스가 자체 산출하면 USER-01 · CHECK-01과 값이 갈린다.
 */
@Service
@RequiredArgsConstructor
public class UserIngredientProfileService {

    /** BR 3의 그룹 순서. enum 선언 순서(GOOD · CAUTION · INSUFFICIENT)가 그대로 표시 순서다. */
    private static final Comparator<IngredientProfileItemResponse> DISPLAY_ORDER =
            Comparator.comparing(IngredientProfileItemResponse::status)
                    .thenComparing(Comparator.comparingInt(IngredientProfileItemResponse::recordCount).reversed());

    private final IngredientProfileRepository ingredientProfileRepository;
    private final ProfileCompletionCalculator profileCompletionCalculator;

    /**
     * @param status 미지정({@code null})이면 전체를 반환한다.
     */
    @Transactional(readOnly = true)
    public IngredientProfileResponse getIngredientProfile(Long userId, IngredientStatus status) {
        List<IngredientProfileItemResponse> ingredients =
                ingredientProfileRepository.findAllByUserIdWithIngredient(userId).stream()
                        .filter(profile -> status == null || profile.getReactionType() == status.toReactionType())
                        .map(this::toItem)
                        .sorted(DISPLAY_ORDER)
                        .toList();

        return new IngredientProfileResponse(profileCompletionCalculator.calculate(userId), ingredients);
    }

    /**
     * 데이터가 부족한 성분에는 판단 근거를 지어내지 않는다 — {@code reason}을 {@code null}로 비운다(BR 1).
     * F-ANALYSIS-04가 남긴 값이 있더라도 표현 계층에서 다시 막는다.
     */
    private IngredientProfileItemResponse toItem(IngredientProfile profile) {
        boolean insufficient = profile.getReactionType() == ReactionType.INSUFFICIENT;
        return new IngredientProfileItemResponse(
                profile.getIngredient().getId(),
                profile.getIngredient().getKoreanName(),
                IngredientStatus.from(profile.getReactionType()),
                insufficient ? null : profile.getReasonSummary(),
                profile.getObservationCount());
    }
}

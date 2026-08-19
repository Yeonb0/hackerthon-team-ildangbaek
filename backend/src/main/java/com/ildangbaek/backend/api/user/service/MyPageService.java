package com.ildangbaek.backend.api.user.service;

import com.ildangbaek.backend.api.user.dto.MyPageIngredientProfileResponse;
import com.ildangbaek.backend.api.user.dto.MyPageResponse;
import com.ildangbaek.backend.api.user.dto.MyPageTopIngredientResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.NotificationSetting;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.repository.NotificationSettingRepository;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * USER-01 · 마이페이지 조회. (docs/api_명세서.md 5장, F-MY-01·F-MY-02)
 *
 * <p>{@code completionRate}는 {@link ProfileCompletionCalculator}가 단독으로 계산한다(ADR 0011 BR 4).
 * 이 서비스가 자체 산출하면 USER-02 · CHECK-01과 값이 갈린다.
 */
@Service
@RequiredArgsConstructor
public class MyPageService {

    /** F-MY-01 BR 4의 요약 노출 상한. 전체 목록은 USER-02가 담당한다. */
    private static final int TOP_INGREDIENT_LIMIT = 8;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /** USER-02와 동일한 표시 순서(GOOD → CAUTION → INSUFFICIENT, 그룹 내 노출 일수 내림차순). */
    private static final Comparator<IngredientProfile> DISPLAY_ORDER =
            Comparator.comparing((IngredientProfile p) -> IngredientStatus.from(p.getReactionType()))
                    .thenComparing(Comparator.comparingInt(IngredientProfile::getObservationCount).reversed());

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserSkinTypeRepository userSkinTypeRepository;
    private final NotificationSettingRepository notificationSettingRepository;
    private final IngredientProfileRepository ingredientProfileRepository;
    private final SkinRecordRepository skinRecordRepository;
    private final ProductRecordRepository productRecordRepository;
    private final ProfileCompletionCalculator profileCompletionCalculator;

    @Transactional(readOnly = true)
    public MyPageResponse getMyPage(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        UserProfile userProfile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        long joinedDays = ChronoUnit.DAYS.between(user.getCreatedAt().toLocalDate(), LocalDate.now(KST));
        long totalRecordCount =
                skinRecordRepository.countByUserId(userId) + productRecordRepository.countByUserId(userId);
        List<SkinTypeCode> skinTypes = userSkinTypeRepository.findAllByUserId(userId).stream()
                .map(userSkinType -> userSkinType.getSkinType().getCode())
                .toList();

        boolean notificationEnabled = notificationSettingRepository.findByUserId(userId)
                .map(this::isEnabled)
                .orElse(false);

        return new MyPageResponse(
                userProfile.getNickname(),
                joinedDays,
                totalRecordCount,
                skinTypes,
                buildIngredientProfile(userId),
                userProfile.getRegionName(),
                notificationEnabled);
    }

    /** 명세서엔 단일 boolean만 정의돼 있다. 모닝·나이트 중 하나라도 켜져 있으면 활성으로 본다. */
    private boolean isEnabled(NotificationSetting setting) {
        return setting.isMorningEnabled() || setting.isNightEnabled();
    }

    private MyPageIngredientProfileResponse buildIngredientProfile(Long userId) {
        List<IngredientProfile> profiles = ingredientProfileRepository.findAllByUserIdWithIngredient(userId);

        long goodCount = countBy(profiles, ReactionType.SUITABLE);
        long cautionCount = countBy(profiles, ReactionType.CAUTION);
        long insufficientCount = countBy(profiles, ReactionType.INSUFFICIENT);

        List<MyPageTopIngredientResponse> topIngredients = profiles.stream()
                .sorted(DISPLAY_ORDER)
                .limit(TOP_INGREDIENT_LIMIT)
                .map(this::toTopIngredient)
                .toList();

        int completionRate = profileCompletionCalculator.calculate(userId);

        return new MyPageIngredientProfileResponse(
                completionRate, goodCount, cautionCount, insufficientCount, topIngredients);
    }

    private long countBy(List<IngredientProfile> profiles, ReactionType reactionType) {
        return profiles.stream().filter(p -> p.getReactionType() == reactionType).count();
    }

    private MyPageTopIngredientResponse toTopIngredient(IngredientProfile profile) {
        return new MyPageTopIngredientResponse(
                profile.getIngredient().getId(),
                profile.getIngredient().getKoreanName(),
                IngredientStatus.from(profile.getReactionType()));
    }
}

package com.ildangbaek.backend.api.user.service;

import com.ildangbaek.backend.api.user.dto.request.LocationUpdateRequest;
import com.ildangbaek.backend.api.user.dto.request.NotificationSettingRequest;
import com.ildangbaek.backend.api.user.dto.response.MyPageResponse;
import com.ildangbaek.backend.api.user.dto.response.NotificationSettingResponse;
import com.ildangbaek.backend.api.user.dto.response.SavedProductResponse;
import com.ildangbaek.backend.domain.product.entity.UsageStatus;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.user.entity.Gender;
import com.ildangbaek.backend.domain.user.entity.NotificationSetting;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.repository.NotificationSettingRepository;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.Year;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserProfileRepository userProfileRepository;
    private final UserSkinTypeRepository userSkinTypeRepository;
    private final NotificationSettingRepository notificationSettingRepository;
    private final UserProductRepository userProductRepository;

    @Transactional(readOnly = true)
    public MyPageResponse getMe(User user) {
        UserProfile profile = userProfileRepository.findByUserId(user.getId()).orElse(null);
        NotificationSetting notificationSetting = notificationSettingRepository.findByUserId(user.getId()).orElse(null);

        return new MyPageResponse(
                user.getId(),
                user.getEmail(),
                profile == null ? null : profile.getNickname(),
                profile == null ? null : toApiGender(profile.getGender()),
                profile == null ? null : toAge(profile.getBirthYear()),
                profile == null ? null : profile.getRegionName(),
                user.isOnboardingCompleted(),
                skinTypes(user),
                new NotificationSettingResponse(isNotificationEnabled(notificationSetting))
        );
    }

    @Transactional
    public NotificationSettingResponse updateNotification(User user, NotificationSettingRequest request) {
        NotificationSetting notificationSetting = notificationSettingRepository.findByUserId(user.getId())
                .orElseGet(() -> NotificationSetting.builder()
                        .user(user)
                        .morningEnabled(request.enabled())
                        .nightEnabled(request.enabled())
                        .build());
        notificationSetting.updateEnabled(request.enabled());
        notificationSettingRepository.save(notificationSetting);

        return new NotificationSettingResponse(isNotificationEnabled(notificationSetting));
    }

    @Transactional(readOnly = true)
    public List<SavedProductResponse> getSavedProducts(User user) {
        return userProductRepository.findAllByUserIdAndUsageStatusOrderByLastUsedAtDesc(
                        user.getId(),
                        UsageStatus.USING
                )
                .stream()
                .map(this::toSavedProductResponse)
                .toList();
    }

    @Transactional
    public void updateLocation(Long userId, LocationUpdateRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        profile.updateRegion(locationName(request));
    }

    private String locationName(LocationUpdateRequest request) {
        if (request.locationId() == null) {
            return "Current location";
        }
        return switch (request.locationId().intValue()) {
            case 1 -> "Seoul";
            case 2 -> "Gyeonggi";
            case 3 -> "Incheon";
            case 4 -> "Busan";
            case 5 -> "Daegu";
            case 6 -> "Gwangju";
            default -> "Selected location";
        };
    }

    private List<String> skinTypes(User user) {
        return userSkinTypeRepository.findAllByUserId(user.getId()).stream()
                .map(userSkinType -> userSkinType.getSkinType().getCode().name())
                .toList();
    }

    private String toApiGender(Gender gender) {
        if (gender == null) {
            return null;
        }
        if (gender == Gender.NOT_SELECTED) {
            return "UNSPECIFIED";
        }
        return gender.name();
    }

    private Integer toAge(Short birthYear) {
        if (birthYear == null) {
            return null;
        }
        return Year.now().getValue() - birthYear + 1;
    }

    private boolean isNotificationEnabled(NotificationSetting notificationSetting) {
        return notificationSetting != null
                && (notificationSetting.isMorningEnabled() || notificationSetting.isNightEnabled());
    }

    private SavedProductResponse toSavedProductResponse(UserProduct userProduct) {
        return new SavedProductResponse(
                userProduct.getProduct().getId(),
                userProduct.getProduct().getProductName(),
                userProduct.getProduct().getBrandName(),
                userProduct.getProduct().getCategory().name(),
                userProduct.getProduct().getImageUrl(),
                userProduct.getFirstSavedAt(),
                userProduct.getLastUsedAt()
        );
    }
}

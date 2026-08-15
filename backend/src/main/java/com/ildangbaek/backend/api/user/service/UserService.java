package com.ildangbaek.backend.api.user.service;

import com.ildangbaek.backend.api.onboard.dto.request.HormoneStatus;
import com.ildangbaek.backend.api.user.dto.request.LocationUpdateRequest;
import com.ildangbaek.backend.api.user.dto.request.NotificationSettingRequest;
import com.ildangbaek.backend.api.user.dto.request.ProfileUpdateRequest;
import com.ildangbaek.backend.api.user.dto.response.MyPageResponse;
import com.ildangbaek.backend.api.user.dto.response.NotificationSettingResponse;
import com.ildangbaek.backend.api.user.dto.response.ProfileResponse;
import com.ildangbaek.backend.api.user.dto.response.SavedProductResponse;
import com.ildangbaek.backend.domain.product.entity.UsageStatus;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.user.entity.Gender;
import com.ildangbaek.backend.domain.user.entity.MenstrualStatus;
import com.ildangbaek.backend.domain.user.entity.NotificationSetting;
import com.ildangbaek.backend.domain.user.entity.SkinType;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.entity.UserSkinType;
import com.ildangbaek.backend.domain.user.repository.NotificationSettingRepository;
import com.ildangbaek.backend.domain.user.repository.SkinTypeRepository;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import java.time.Year;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final SkinTypeRepository skinTypeRepository;
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
                skinTypes(user.getId()),
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

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        NotificationSetting notificationSetting = notificationSettingRepository.findByUserId(userId).orElse(null);

        return toProfileResponse(profile, notificationSetting);
    }

    @Transactional
    public ProfileResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (request.name() != null || request.gender() != null || request.age() != null) {
            String nickname = request.name() != null ? request.name() : profile.getNickname();
            Gender gender = request.gender() != null ? parseGender(request.gender()) : profile.getGender();
            Short birthYear = request.age() != null
                    ? (short) (Year.now().getValue() - request.age() + 1)
                    : profile.getBirthYear();
            profile.updateBasicInfo(nickname, birthYear, gender);
        }

        if (request.gender() != null && profile.getGender() != Gender.FEMALE) {
            profile.clearHormoneInfo();
        } else if (profile.getGender() == Gender.FEMALE
                && (request.hormoneStatus() != null
                    || request.lastPeriodStartDate() != null
                    || request.averageCycleDays() != null)) {
            updateHormoneFields(profile, request);
        }

        if (request.skinTypes() != null) {
            updateSkinTypes(userId, request.skinTypes());
        }

        NotificationSetting notificationSetting = notificationSettingRepository.findByUserId(userId).orElse(null);
        return toProfileResponse(profile, notificationSetting);
    }

    private void updateHormoneFields(UserProfile profile, ProfileUpdateRequest request) {
        if (request.lastPeriodStartDate() != null && request.lastPeriodStartDate().isAfter(LocalDate.now())) {
            throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED);
        }

        HormoneStatus hormoneStatus = request.hormoneStatus() != null
                ? request.hormoneStatus()
                : toApiHormoneStatus(profile.getMenstrualStatus(), profile.isOralContraceptive(),
                        profile.isProgesteroneInjection());
        HormoneMapping mapping = mapHormoneStatus(hormoneStatus);

        LocalDate lastPeriodStartDate = hormoneStatus == HormoneStatus.MENOPAUSE
                ? null
                : (request.lastPeriodStartDate() != null
                        ? request.lastPeriodStartDate()
                        : profile.getLastMenstrualStartDate());
        Short averageCycleDays = hormoneStatus == HormoneStatus.MENOPAUSE
                ? null
                : (request.averageCycleDays() != null
                        ? request.averageCycleDays().shortValue()
                        : profile.getMenstrualCycleDays());

        profile.updateHormoneInfo(
                mapping.menstrualStatus(),
                lastPeriodStartDate,
                averageCycleDays,
                mapping.oralContraceptive(),
                mapping.progesteroneInjection(),
                profile.isHormoneReplacementTherapy()
        );
    }

    private void updateSkinTypes(Long userId, List<SkinTypeCode> skinTypes) {
        if (skinTypes.isEmpty()) {
            throw new BusinessException(ErrorCode.ONBOARD_SKIN_TYPE_REQUIRED);
        }
        if (skinTypes.contains(SkinTypeCode.UNKNOWN) && skinTypes.size() > 1) {
            throw new BusinessException(ErrorCode.ONBOARD_SKIN_TYPE_CONFLICT);
        }

        User user = userRepository.getReferenceById(userId);

        // deleteAllByUserId는 bulk delete가 아니라 select 후 개별 remove라 삭제가 커밋까지 미뤄진다.
        // 반면 아래 save는 IDENTITY 전략이라 즉시 INSERT를 날린다. flush로 삭제를 먼저 반영하지 않으면
        // 실행 순서가 INSERT → DELETE가 되어, 기존과 겹치는 스킨타입에서 (user_id, skin_type_id)
        // 유니크 제약에 걸린다.
        userSkinTypeRepository.deleteAllByUserId(userId);
        userSkinTypeRepository.flush();

        // 같은 코드를 두 번 받으면 같은 제약에 걸리므로 요청 안의 중복도 걸러낸다.
        for (SkinTypeCode code : List.copyOf(new LinkedHashSet<>(skinTypes))) {
            SkinType skinType = skinTypeRepository.findByCode(code)
                    .orElseGet(() -> skinTypeRepository.save(SkinType.builder()
                            .code(code)
                            .name(code.name())
                            .description(null)
                            .build()));
            userSkinTypeRepository.save(UserSkinType.builder()
                    .user(user)
                    .skinType(skinType)
                    .build());
        }
    }

    private ProfileResponse toProfileResponse(UserProfile profile, NotificationSetting notificationSetting) {
        return new ProfileResponse(
                profile.getNickname(),
                toApiGender(profile.getGender()),
                toAge(profile.getBirthYear()),
                skinTypes(profile.getUser().getId()),
                toApiHormoneStatus(profile.getMenstrualStatus(), profile.isOralContraceptive(),
                        profile.isProgesteroneInjection()),
                profile.getLastMenstrualStartDate(),
                profile.getMenstrualCycleDays() == null ? null : profile.getMenstrualCycleDays().intValue(),
                profile.getRegionName(),
                isNotificationEnabled(notificationSetting)
        );
    }

    private HormoneStatus toApiHormoneStatus(MenstrualStatus status, boolean oralContraceptive,
                                              boolean progesteroneInjection) {
        if (status == null) {
            return null;
        }
        if (status == MenstrualStatus.MENOPAUSE) {
            return HormoneStatus.MENOPAUSE;
        }
        if (oralContraceptive) {
            return HormoneStatus.HORMONE_PILL;
        }
        if (progesteroneInjection) {
            return HormoneStatus.HORMONE_INJECTION;
        }
        return HormoneStatus.MENSTRUATING;
    }

    private HormoneMapping mapHormoneStatus(HormoneStatus hormoneStatus) {
        return switch (hormoneStatus) {
            case MENSTRUATING -> new HormoneMapping(MenstrualStatus.MENSTRUATING, false, false);
            case HORMONE_PILL -> new HormoneMapping(MenstrualStatus.MENSTRUATING, true, false);
            case HORMONE_INJECTION -> new HormoneMapping(MenstrualStatus.MENSTRUATING, false, true);
            case MENOPAUSE -> new HormoneMapping(MenstrualStatus.MENOPAUSE, false, false);
        };
    }

    private Gender parseGender(String gender) {
        if ("UNSPECIFIED".equals(gender)) {
            return Gender.NOT_SELECTED;
        }
        return Gender.valueOf(gender);
    }

    private record HormoneMapping(
            MenstrualStatus menstrualStatus,
            boolean oralContraceptive,
            boolean progesteroneInjection
    ) {
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

    private List<String> skinTypes(Long userId) {
        return userSkinTypeRepository.findAllByUserId(userId).stream()
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

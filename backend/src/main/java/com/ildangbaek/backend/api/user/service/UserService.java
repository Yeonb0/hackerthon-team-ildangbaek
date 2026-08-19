package com.ildangbaek.backend.api.user.service;

import com.ildangbaek.backend.api.onboard.dto.request.HormoneStatus;
import com.ildangbaek.backend.api.user.dto.request.GenderRequest;
import com.ildangbaek.backend.api.user.dto.request.LocationUpdateRequest;
import com.ildangbaek.backend.api.user.dto.request.NotificationSettingRequest;
import com.ildangbaek.backend.api.user.dto.request.ProfileUpdateRequest;
import com.ildangbaek.backend.api.user.dto.response.AccountResponse;
import com.ildangbaek.backend.api.user.dto.response.NotificationSettingResponse;
import com.ildangbaek.backend.api.user.dto.response.ProfileResponse;
import com.ildangbaek.backend.api.user.dto.response.SavedProductResponse;
import com.ildangbaek.backend.domain.location.client.KakaoRegionClient;
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
import com.ildangbaek.backend.global.storage.ImageUrlResolver;
import java.time.LocalDate;
import java.time.Year;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final SkinTypeRepository skinTypeRepository;
    private final UserSkinTypeRepository userSkinTypeRepository;
    private final NotificationSettingRepository notificationSettingRepository;
    private final UserProductRepository userProductRepository;
    private final ImageUrlResolver imageUrlResolver;
    private final KakaoRegionClient kakaoRegionClient;

    @Transactional(readOnly = true)
    public AccountResponse getMe(User user) {
        UserProfile profile = userProfileRepository.findByUserId(user.getId()).orElse(null);
        NotificationSetting notificationSetting = notificationSettingRepository.findByUserId(user.getId()).orElse(null);

        return new AccountResponse(
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
    public void withdraw(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        user.withdraw();
    }

    @Transactional
    public void updateLocation(Long userId, LocationUpdateRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        LocationValue location = locationValue(request);
        profile.updateLocation(location.regionName(), location.latitude(), location.longitude());
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

        // 수정 후 성별. 요청에 없으면 기존 값이 유지된다.
        Gender gender = request.gender() != null ? request.gender().toGender() : profile.getGender();

        if (request.name() != null || request.gender() != null || request.age() != null) {
            String nickname = request.name() != null ? request.name() : profile.getNickname();
            Short birthYear = request.age() != null
                    ? (short) (Year.now().getValue() - request.age() + 1)
                    : profile.getBirthYear();
            profile.updateBasicInfo(nickname, birthYear, gender);
        }

        // 호르몬 정보는 FEMALE에게만 의미가 있다(F-ONBOARD-03). 여성이 아니게 되면 지우고,
        // 여성이면서 호르몬 필드가 하나라도 온 경우에만 갱신한다.
        if (gender != Gender.FEMALE) {
            profile.clearHormoneInfo();
        } else if (hasHormoneField(request)) {
            updateHormoneFields(profile, request);
        }

        if (request.skinTypes() != null) {
            updateSkinTypes(userId, request.skinTypes());
        }

        NotificationSetting notificationSetting = notificationSettingRepository.findByUserId(userId).orElse(null);
        return toProfileResponse(profile, notificationSetting);
    }

    private boolean hasHormoneField(ProfileUpdateRequest request) {
        return request.hormoneStatus() != null
                || request.lastPeriodStartDate() != null
                || request.averageCycleDays() != null;
    }

    private void updateHormoneFields(UserProfile profile, ProfileUpdateRequest request) {
        if (request.lastPeriodStartDate() != null && request.lastPeriodStartDate().isAfter(LocalDate.now(KST))) {
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


    private record HormoneMapping(
            MenstrualStatus menstrualStatus,
            boolean oralContraceptive,
            boolean progesteroneInjection
    ) {
    }

    private LocationValue locationValue(LocationUpdateRequest request) {
        LocationSeed selected = request.locationId() == null ? null : locationByIdOrThrow(request.locationId());
        if (request.latitude() != null && request.longitude() != null) {
            String regionName = selected == null
                    ? kakaoRegionClient.findDistrict(request.latitude(), request.longitude())
                            .orElseGet(() -> nearestLocation(request.latitude(), request.longitude()).name())
                    : selected.name();
            return new LocationValue(regionName, request.latitude(), request.longitude());
        }
        if (selected == null) {
            return new LocationValue("선택 지역", null, null);
        }
        return new LocationValue(selected.name(), selected.latitude(), selected.longitude());
    }

    private LocationSeed locationByIdOrThrow(Long locationId) {
        return LOCATIONS.stream()
                .filter(location -> location.id() == locationId)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_LOCATION_NOT_FOUND));
    }

    private LocationSeed nearestLocation(double latitude, double longitude) {
        return LOCATIONS.stream()
                .min((left, right) -> Double.compare(
                        distanceSquared(latitude, longitude, left),
                        distanceSquared(latitude, longitude, right)))
                .orElse(LOCATIONS.get(0));
    }

    private double distanceSquared(double latitude, double longitude, LocationSeed location) {
        double latitudeDelta = latitude - location.latitude();
        double longitudeDelta = longitude - location.longitude();
        return latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta;
    }

    private List<String> skinTypes(Long userId) {
        return userSkinTypeRepository.findAllByUserId(userId).stream()
                .map(userSkinType -> userSkinType.getSkinType().getCode().name())
                .toList();
    }

    /** 응답 필드가 String이라 이름만 꺼낸다. 저장 표기 ↔ API 표기 대응은 GenderRequest 한 곳에 둔다. */
    private String toApiGender(Gender gender) {
        GenderRequest apiGender = GenderRequest.from(gender);
        return apiGender == null ? null : apiGender.name();
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
                imageUrlResolver.resolve(userProduct.getProduct().getImageUrl()),
                userProduct.getFirstSavedAt(),
                userProduct.getLastUsedAt()
        );
    }

    private record LocationValue(String regionName, Double latitude, Double longitude) {
    }

    private record LocationSeed(long id, String name, double latitude, double longitude) {
    }

    private static final List<LocationSeed> LOCATIONS = List.of(
            new LocationSeed(1, "서울", 37.5665, 126.9780),
            new LocationSeed(2, "경기", 37.4138, 127.5183),
            new LocationSeed(3, "인천", 37.4563, 126.7052),
            new LocationSeed(4, "부산", 35.1796, 129.0756),
            new LocationSeed(5, "대구", 35.8714, 128.6014),
            new LocationSeed(6, "광주", 35.1595, 126.8526)
    );
}

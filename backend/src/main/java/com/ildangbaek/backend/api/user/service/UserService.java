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
            new LocationSeed(1, "서울 강남구", 37.5172, 127.0473),
            new LocationSeed(2, "서울 마포구", 37.5663, 126.9019),
            new LocationSeed(3, "서울 종로구", 37.5735, 126.9788),
            new LocationSeed(4, "서울 송파구", 37.5145, 127.1059),
            new LocationSeed(5, "서울 서대문구", 37.5791, 126.9368),
            new LocationSeed(6, "인천 연수구", 37.4106, 126.6784),
            new LocationSeed(7, "인천 남동구", 37.4467, 126.7314),
            new LocationSeed(8, "경기 성남시 분당구", 37.3826, 127.1188),
            new LocationSeed(9, "경기 수원시 영통구", 37.2589, 127.0567),
            new LocationSeed(10, "경기 고양시 일산동구", 37.6584, 126.7717),
            new LocationSeed(11, "부산 해운대구", 35.1631, 129.1635),
            new LocationSeed(12, "부산 수영구", 35.1455, 129.1132),
            new LocationSeed(13, "대구 수성구", 35.8583, 128.6311),
            new LocationSeed(14, "광주 서구", 35.1519, 126.8896),
            new LocationSeed(15, "대전 유성구", 36.3623, 127.3562),
            new LocationSeed(16, "울산 남구", 35.5439, 129.3300),
            new LocationSeed(17, "세종특별자치시", 36.4801, 127.2891),
            new LocationSeed(18, "강원 춘천시", 37.8813, 127.7300),
            new LocationSeed(19, "강원 강릉시", 37.7519, 128.8761),
            new LocationSeed(20, "충북 청주시 흥덕구", 36.6280, 127.4470),
            new LocationSeed(21, "충남 천안시 서북구", 36.8151, 127.1139),
            new LocationSeed(22, "전북 전주시 완산구", 35.8134, 127.1380),
            new LocationSeed(23, "전남 여수시", 34.7604, 127.6622),
            new LocationSeed(24, "경북 포항시 남구", 36.0011, 129.3435),
            new LocationSeed(25, "경남 창원시 성산구", 35.2280, 128.6811),
            new LocationSeed(26, "제주 제주시", 33.4996, 126.5312),
            new LocationSeed(27, "제주 서귀포시", 33.2541, 126.5601)
    );
}

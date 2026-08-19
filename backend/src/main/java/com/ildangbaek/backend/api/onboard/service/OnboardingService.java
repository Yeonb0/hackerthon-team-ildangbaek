package com.ildangbaek.backend.api.onboard.service;

import com.ildangbaek.backend.api.onboard.dto.request.BasicInfoRequest;
import com.ildangbaek.backend.api.onboard.dto.request.HormoneRequest;
import com.ildangbaek.backend.api.onboard.dto.request.HormoneStatus;
import com.ildangbaek.backend.api.onboard.dto.request.SkinTypesRequest;
import com.ildangbaek.backend.api.onboard.dto.response.HormoneResponse;
import com.ildangbaek.backend.api.onboard.dto.response.OnboardingCompleteResponse;
import com.ildangbaek.backend.api.onboard.dto.response.OnboardingStatusResponse;
import com.ildangbaek.backend.api.onboard.dto.response.OnboardingStatusResponse.StepStatus;
import com.ildangbaek.backend.api.routine.service.DefaultRoutineService;
import com.ildangbaek.backend.domain.user.entity.Gender;
import com.ildangbaek.backend.domain.user.entity.MenstrualStatus;
import com.ildangbaek.backend.domain.user.entity.SkinType;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.entity.UserSkinType;
import com.ildangbaek.backend.domain.user.repository.SkinTypeRepository;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final SkinTypeRepository skinTypeRepository;
    private final UserSkinTypeRepository userSkinTypeRepository;
    private final DefaultRoutineService defaultRoutineService;

    @Transactional(readOnly = true)
    public OnboardingStatusResponse getStatus(User user) {
        return buildStatus(user);
    }

    @Transactional
    public OnboardingStatusResponse saveBasicInfo(User user, BasicInfoRequest request) {
        Gender gender = request.gender().toGender();
        Short birthYear = (short) (Year.now().getValue() - request.age() + 1);

        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> UserProfile.builder()
                        .user(user)
                        .nickname(request.name())
                        .birthYear(birthYear)
                        .gender(gender)
                        .build());
        profile.updateBasicInfo(request.name(), birthYear, gender);
        userProfileRepository.save(profile);

        return buildStatus(user);
    }

    @Transactional
    public OnboardingStatusResponse saveSkinTypes(User user, SkinTypesRequest request) {
        validateSkinTypes(request.skinTypes());

        // 삭제는 커밋까지 미뤄지지만 아래 save는 IDENTITY라 즉시 INSERT된다. flush로 순서를
        // 고정하지 않으면 (user_id, skin_type_id) 유니크 제약에 걸린다. 요청 안의 중복도 걸러낸다.
        userSkinTypeRepository.deleteAllByUserId(user.getId());
        userSkinTypeRepository.flush();

        for (SkinTypeCode code : List.copyOf(new LinkedHashSet<>(request.skinTypes()))) {
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

        return buildStatus(user);
    }

    @Transactional
    public HormoneResponse saveHormone(User user, HormoneRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ONBOARD_STEP_NOT_ALLOWED));
        if (profile.getGender() != Gender.FEMALE) {
            throw new BusinessException(ErrorCode.ONBOARD_HORMONE_NOT_APPLICABLE);
        }
        validateHormoneDate(request.lastPeriodStartDate());

        HormoneMapping mapping = mapHormoneStatus(request.hormoneStatus());
        LocalDate startDate = request.hormoneStatus() == HormoneStatus.MENOPAUSE
                ? null
                : request.lastPeriodStartDate();
        Short cycleDays = request.hormoneStatus() == HormoneStatus.MENOPAUSE || request.averageCycleDays() == null
                ? null
                : request.averageCycleDays().shortValue();

        profile.updateHormoneInfo(
                mapping.menstrualStatus(),
                startDate,
                cycleDays,
                mapping.oralContraceptive(),
                mapping.progesteroneInjection(),
                false
        );
        userProfileRepository.save(profile);

        return new HormoneResponse("COMPLETE");
    }

    @Transactional
    public OnboardingCompleteResponse complete(User user) {
        if (user.isOnboardingCompleted()) {
            throw new BusinessException(ErrorCode.ONBOARD_ALREADY_COMPLETED);
        }
        if (!hasBasicInfo(user) || !hasSkinTypes(user)) {
            throw new BusinessException(ErrorCode.ONBOARD_STEP_NOT_ALLOWED);
        }

        user.completeOnboarding();
        userRepository.save(user);
        defaultRoutineService.ensureDefaultRoutines(user);

        return new OnboardingCompleteResponse(true, buildSummary(user));
    }

    private OnboardingStatusResponse buildStatus(User user) {
        boolean basicInfoCompleted = hasBasicInfo(user);
        boolean skinTypeCompleted = hasSkinTypes(user);
        boolean hormoneIncluded = isFemale(user);
        boolean hormoneCompleted = hasHormoneInfo(user);
        String nextStep = nextStep(user, basicInfoCompleted, skinTypeCompleted, hormoneIncluded, hormoneCompleted);

        Map<String, StepStatus> steps = new LinkedHashMap<>();
        steps.put("basicInfo", new StepStatus(basicInfoCompleted, true));
        steps.put("skinType", new StepStatus(skinTypeCompleted, true));
        if (hormoneIncluded) {
            steps.put("hormone", new StepStatus(hormoneCompleted, false));
        }
        int totalStepCount = hormoneIncluded ? 3 : 2;

        return new OnboardingStatusResponse(
                user.isOnboardingCompleted(),
                nextStep,
                currentStepIndex(nextStep, totalStepCount),
                totalStepCount,
                steps
        );
    }

    private String nextStep(User user, boolean basicInfoCompleted, boolean skinTypeCompleted,
                            boolean hormoneIncluded, boolean hormoneCompleted) {
        if (user.isOnboardingCompleted()) {
            return "NONE";
        }
        if (!basicInfoCompleted) {
            return "BASIC_INFO";
        }
        if (!skinTypeCompleted) {
            return "SKIN_TYPE";
        }
        if (hormoneIncluded && !hormoneCompleted) {
            return "HORMONE";
        }
        return "COMPLETE";
    }

    private int currentStepIndex(String nextStep, int totalStepCount) {
        return switch (nextStep) {
            case "BASIC_INFO" -> 1;
            case "SKIN_TYPE" -> 2;
            case "HORMONE" -> 3;
            case "COMPLETE" -> totalStepCount;
            default -> 0;
        };
    }

    private boolean hasBasicInfo(User user) {
        return userProfileRepository.findByUserId(user.getId()).isPresent();
    }

    private boolean hasSkinTypes(User user) {
        return !userSkinTypeRepository.findAllByUserId(user.getId()).isEmpty();
    }

    private boolean isFemale(User user) {
        return userProfileRepository.findByUserId(user.getId())
                .map(UserProfile::getGender)
                .filter(Gender.FEMALE::equals)
                .isPresent();
    }

    private boolean hasHormoneInfo(User user) {
        return userProfileRepository.findByUserId(user.getId())
                .map(UserProfile::getMenstrualStatus)
                .isPresent();
    }

    private void validateSkinTypes(List<SkinTypeCode> skinTypes) {
        if (skinTypes == null || skinTypes.isEmpty()) {
            throw new BusinessException(ErrorCode.ONBOARD_SKIN_TYPE_REQUIRED);
        }
        if (skinTypes.contains(SkinTypeCode.UNKNOWN) && skinTypes.size() > 1) {
            throw new BusinessException(ErrorCode.ONBOARD_SKIN_TYPE_CONFLICT);
        }
    }

    private void validateHormoneDate(LocalDate lastPeriodStartDate) {
        if (lastPeriodStartDate != null && lastPeriodStartDate.isAfter(LocalDate.now())) {
            throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED);
        }
    }

    private HormoneMapping mapHormoneStatus(HormoneStatus hormoneStatus) {
        return switch (hormoneStatus) {
            case MENSTRUATING -> new HormoneMapping(MenstrualStatus.MENSTRUATING, false, false);
            case HORMONE_PILL -> new HormoneMapping(MenstrualStatus.MENSTRUATING, true, false);
            case HORMONE_INJECTION -> new HormoneMapping(MenstrualStatus.MENSTRUATING, false, true);
            case MENOPAUSE -> new HormoneMapping(MenstrualStatus.MENOPAUSE, false, false);
        };
    }

    private List<OnboardingCompleteResponse.SummaryItem> buildSummary(User user) {
        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_INVALID_PROFILE));

        List<OnboardingCompleteResponse.SummaryItem> summary = new ArrayList<>();
        summary.add(new OnboardingCompleteResponse.SummaryItem("이름", profile.getNickname()));
        summary.add(new OnboardingCompleteResponse.SummaryItem(
                "성별 · 나이",
                genderLabel(profile.getGender()) + " · " + age(profile.getBirthYear()) + "세"
        ));
        summary.add(new OnboardingCompleteResponse.SummaryItem("피부 타입", skinTypeSummary(user)));
        return summary;
    }

    private String genderLabel(Gender gender) {
        if (gender == Gender.FEMALE) {
            return "여성";
        }
        if (gender == Gender.MALE) {
            return "남성";
        }
        return "선택 안 함";
    }

    private int age(Short birthYear) {
        return Year.now().getValue() - birthYear + 1;
    }

    private String skinTypeSummary(User user) {
        return userSkinTypeRepository.findAllByUserId(user.getId()).stream()
                .map(userSkinType -> skinTypeLabel(userSkinType.getSkinType().getCode()))
                .reduce((left, right) -> left + " · " + right)
                .orElse("미입력");
    }

    private String skinTypeLabel(SkinTypeCode code) {
        return switch (code) {
            case OILY -> "지성";
            case DRY -> "건성";
            case SENSITIVE -> "민감성";
            case UNKNOWN -> "모르겠음";
        };
    }

    private record HormoneMapping(
            MenstrualStatus menstrualStatus,
            boolean oralContraceptive,
            boolean progesteroneInjection
    ) {
    }
}

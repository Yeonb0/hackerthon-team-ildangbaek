package com.ildangbaek.backend.domain.analysis.hormone;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.domain.user.entity.Gender;
import com.ildangbaek.backend.domain.user.entity.MenstrualStatus;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * F-ANALYSIS-03의 업무 규칙을 고정한다 — 주기 구간 계산 · 호르몬약/폐경 오버라이드 · 정보 없을 때 생략.
 */
class MenstrualCycleCalculatorTest {

    private static final LocalDate CYCLE_START = LocalDate.of(2026, 8, 1);

    private final MenstrualCycleCalculator calculator = new MenstrualCycleCalculator();

    @DisplayName("최근 시작일로부터 5일 이내는 생리 기간이다")
    @Test
    void returnsMenstrualWithinFirstFiveDays() {
        UserProfile profile = profile(MenstrualStatus.MENSTRUATING, CYCLE_START, (short) 28);

        assertThat(calculator.calculate(profile, CYCLE_START)).isEqualTo(MenstrualCyclePhase.MENSTRUAL);
        assertThat(calculator.calculate(profile, CYCLE_START.plusDays(4))).isEqualTo(MenstrualCyclePhase.MENSTRUAL);
        assertThat(calculator.calculate(profile, CYCLE_START.plusDays(5)))
                .isNotEqualTo(MenstrualCyclePhase.MENSTRUAL);
    }

    @DisplayName("28일 주기에서 난포기·배란기·황체기 순서로 구간이 진행된다")
    @Test
    void progressesThroughPhasesAcrossCycle() {
        UserProfile profile = profile(MenstrualStatus.MENSTRUATING, CYCLE_START, (short) 28);

        assertThat(calculator.calculate(profile, CYCLE_START.plusDays(10))).isEqualTo(MenstrualCyclePhase.FOLLICULAR);
        assertThat(calculator.calculate(profile, CYCLE_START.plusDays(13))).isEqualTo(MenstrualCyclePhase.OVULATION);
        assertThat(calculator.calculate(profile, CYCLE_START.plusDays(20))).isEqualTo(MenstrualCyclePhase.LUTEAL);
    }

    @DisplayName("두 번째 주기에 들어가도 경과일을 주기 길이로 나눠 같은 구간을 반복한다")
    @Test
    void wrapsAroundToNextCycle() {
        UserProfile profile = profile(MenstrualStatus.MENSTRUATING, CYCLE_START, (short) 28);

        assertThat(calculator.calculate(profile, CYCLE_START.plusDays(28))).isEqualTo(MenstrualCyclePhase.MENSTRUAL);
    }

    @DisplayName("호르몬약을 복용 중이면 주기 계산 없이 상태값 자체를 쓴다")
    @Test
    void returnsHormoneControlledForOralContraceptive() {
        UserProfile profile = profile(MenstrualStatus.MENSTRUATING, CYCLE_START, (short) 28);
        profile.updateHormoneInfo(MenstrualStatus.MENSTRUATING, CYCLE_START, (short) 28);
        ReflectionTestUtils.setField(profile, "oralContraceptive", true);

        assertThat(calculator.calculate(profile, CYCLE_START)).isEqualTo(MenstrualCyclePhase.HORMONE_CONTROLLED);
    }

    @DisplayName("폐경 상태는 주기 계산을 적용하지 않는다")
    @Test
    void returnsMenopauseForMenopauseStatus() {
        UserProfile profile = profile(MenstrualStatus.MENOPAUSE, null, null);

        assertThat(calculator.calculate(profile, CYCLE_START)).isEqualTo(MenstrualCyclePhase.MENOPAUSE);
    }

    @DisplayName("생리 상태가 없거나 주기 정보가 없으면 보정을 생략한다")
    @Test
    void returnsUnknownWithoutCycleInfo() {
        assertThat(calculator.calculate(null, CYCLE_START)).isEqualTo(MenstrualCyclePhase.UNKNOWN);
        assertThat(calculator.calculate(profile(null, null, null), CYCLE_START))
                .isEqualTo(MenstrualCyclePhase.UNKNOWN);
        assertThat(calculator.calculate(profile(MenstrualStatus.MENSTRUATING, null, null), CYCLE_START))
                .isEqualTo(MenstrualCyclePhase.UNKNOWN);
    }

    private UserProfile profile(MenstrualStatus status, LocalDate lastStart, Short cycleDays) {
        User user = User.builder().build();
        UserProfile profile = UserProfile.builder().user(user).nickname("검증용").gender(Gender.FEMALE).build();
        profile.updateHormoneInfo(status, lastStart, cycleDays);
        return profile;
    }
}

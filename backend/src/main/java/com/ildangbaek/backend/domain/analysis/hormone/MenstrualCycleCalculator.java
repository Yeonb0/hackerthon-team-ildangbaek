package com.ildangbaek.backend.domain.analysis.hormone;

import com.ildangbaek.backend.domain.user.entity.MenstrualStatus;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

/**
 * F-ANALYSIS-03 · 생리 주기·호르몬 정보로 특정 날짜의 {@link MenstrualCyclePhase}를 계산한다.
 *
 * <p>DB를 모른다. {@link UserProfile}과 기준일만 받아 순수 계산만 한다.
 *
 * <h2>계산 방식 (BR 1)</h2>
 * 최근 생리 시작일로부터 경과일을 평균 주기 길이로 나눈 비율로 4구간을 나눈다. 생리 기간은 평균
 * 주기와 무관하게 5일로 고정한다(일반적인 생리 기간). 남은 기간을 난포기·배란기·황체기로 3등분한다.
 * 표준 28일 주기의 통상적 구간 비율(난포기 약 40%, 배란기 약 10%, 황체기 약 50%)을 평균 주기
 * 길이에 맞춰 그대로 늘리거나 줄인다. 근거 없는 초기값이며 실사용 데이터가 쌓이면 재검토 대상이다.
 */
@Component
public class MenstrualCycleCalculator {

    private static final int MENSTRUAL_PHASE_DAYS = 5;
    private static final double FOLLICULAR_RATIO = 0.4;
    private static final double OVULATION_RATIO = 0.1;

    public MenstrualCyclePhase calculate(UserProfile profile, LocalDate referenceDate) {
        if (profile == null || profile.getMenstrualStatus() == null) {
            return MenstrualCyclePhase.UNKNOWN;
        }
        if (profile.isOralContraceptive() || profile.isProgesteroneInjection()
                || profile.isHormoneReplacementTherapy()) {
            return MenstrualCyclePhase.HORMONE_CONTROLLED;
        }
        if (profile.getMenstrualStatus() == MenstrualStatus.MENOPAUSE) {
            return MenstrualCyclePhase.MENOPAUSE;
        }
        if (profile.getMenstrualStatus() != MenstrualStatus.MENSTRUATING) {
            return MenstrualCyclePhase.UNKNOWN;
        }

        LocalDate lastStart = profile.getLastMenstrualStartDate();
        Short cycleDays = profile.getMenstrualCycleDays();
        if (lastStart == null || cycleDays == null || cycleDays <= 0) {
            return MenstrualCyclePhase.UNKNOWN;
        }

        long daysSinceStart = ChronoUnit.DAYS.between(lastStart, referenceDate);
        if (daysSinceStart < 0) {
            return MenstrualCyclePhase.UNKNOWN;
        }
        int dayInCycle = (int) (daysSinceStart % cycleDays);

        if (dayInCycle < MENSTRUAL_PHASE_DAYS) {
            return MenstrualCyclePhase.MENSTRUAL;
        }
        int follicularEnd = (int) Math.round(cycleDays * FOLLICULAR_RATIO);
        int ovulationEnd = follicularEnd + (int) Math.round(cycleDays * OVULATION_RATIO);
        if (dayInCycle < follicularEnd) {
            return MenstrualCyclePhase.FOLLICULAR;
        }
        if (dayInCycle < ovulationEnd) {
            return MenstrualCyclePhase.OVULATION;
        }
        return MenstrualCyclePhase.LUTEAL;
    }
}

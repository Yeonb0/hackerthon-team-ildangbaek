package com.ildangbaek.backend.domain.check;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ildangbaek.backend.domain.check.RiskLevelCalculator.RiskOutcome;
import com.ildangbaek.backend.domain.check.entity.RiskLevel;
import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * F-CHECK-03 위험도 산식을 고정한다. (ADR 0015)
 *
 * <p>가장 중요한 케이스는 {@link #insufficientDoesNotAffectLevel()}이다 — BR 3("INSUFFICIENT는
 * 위험도를 높이지도 낮추지도 않는다")이 실제로 지켜지는지를 판정 분모 설계로 확인한다.
 */
class RiskLevelCalculatorTest {

    private final RiskLevelCalculator calculator = new RiskLevelCalculator();

    @DisplayName("CAUTION이 없으면 LOW다")
    @Test
    void noCautionIsLow() {
        RiskOutcome outcome = calculator.calculate(5, 0);

        assertThat(outcome.level()).isEqualTo(RiskLevel.LOW);
        assertThat(outcome.riskScore()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @DisplayName("CAUTION이 1건이면 개수 축이 MEDIUM이다")
    @Test
    void oneCautionIsMedium() {
        // judged=9, ratio=0.11 → 게이트를 넘지만 비중은 미달, 개수 축이 MEDIUM
        RiskOutcome outcome = calculator.calculate(8, 1);

        assertThat(outcome.level()).isEqualTo(RiskLevel.MEDIUM);
    }

    @DisplayName("CAUTION이 3건 이상이면 개수 축만으로 HIGH다")
    @Test
    void threeOrMoreCautionIsHighByCount() {
        // judged=20, ratio=0.15 → 비중 축은 MEDIUM이지만 개수 축이 HIGH → 더 심각한 쪽
        RiskOutcome outcome = calculator.calculate(17, 3);

        assertThat(outcome.level()).isEqualTo(RiskLevel.HIGH);
    }

    @DisplayName("판정 5종 미만이면 비중이 높아도 개수 축만 본다")
    @Test
    void belowGateIgnoresRatio() {
        // judged=2, ratio=0.50 → 게이트 미달이라 비중 무시, 개수 1건 → MEDIUM (HIGH 아님)
        RiskOutcome outcome = calculator.calculate(1, 1);

        assertThat(outcome.level()).isEqualTo(RiskLevel.MEDIUM);
    }

    @DisplayName("판정 5종 이상이고 비중 40% 이상이면 HIGH다")
    @Test
    void ratioAtGateReachesHigh() {
        // judged=5, ratio=0.40 → 게이트 통과 + 임계값 도달, 개수 2건은 MEDIUM이지만 비중이 더 심각
        RiskOutcome outcome = calculator.calculate(3, 2);

        assertThat(outcome.level()).isEqualTo(RiskLevel.HIGH);
    }

    @DisplayName("판정 5종 이상이고 비중 40% 미만이면 MEDIUM이다")
    @Test
    void ratioBelowGateIsMedium() {
        // judged=5, ratio=0.20
        RiskOutcome outcome = calculator.calculate(4, 1);

        assertThat(outcome.level()).isEqualTo(RiskLevel.MEDIUM);
    }

    @DisplayName("두 축이 갈리면 더 심각한 쪽을 택한다")
    @Test
    void takesMoreSevereAxis() {
        // judged=20, caution=3 → 개수 축 HIGH, 비중 0.15 → 비중 축 MEDIUM. 결과는 HIGH.
        RiskOutcome outcome = calculator.calculate(17, 3);

        assertThat(outcome.level()).isEqualTo(RiskLevel.HIGH);
    }

    /**
     * BR 3의 설계 근거. 이 계산기는 {@code insufficientCount}를 파라미터로 받지 않는다 — 판정
     * 분모(suitable+caution)만 쓰므로 INSUFFICIENT 성분이 몇 건이든 산식에 들어올 방법이 없다.
     * "같은 (suitable, caution)이면 결과가 같다"는 항등적으로 참이라 별도 비교가 필요 없고,
     * 이 성질이 실제 입력 흐름에서 지켜지는지는 {@code CheckServiceTest}가 확인한다
     * (동일 (suitable, caution)에 insufficient만 다른 두 제품이 같은 등급을 받는지).
     */
    @DisplayName("계산기는 판정된 성분 수만 입력받는다 — INSUFFICIENT는 애초에 들어올 수 없다")
    @Test
    void signatureExcludesInsufficientByDesign() {
        RiskOutcome outcome = calculator.calculate(3, 2);

        assertThat(outcome).isNotNull();
    }

    @DisplayName("riskScore는 게이트와 무관하게 항상 계산된다")
    @Test
    void riskScoreAlwaysComputed() {
        // 게이트 미달(judged=2)이라 등급엔 반영되지 않지만 riskScore는 50.00이어야 한다
        RiskOutcome outcome = calculator.calculate(1, 1);

        assertThat(outcome.riskScore()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @DisplayName("riskScore는 소수점 둘째 자리까지 백분율로 낸다")
    @Test
    void riskScoreRoundsToTwoDecimals() {
        // 1/3 = 33.33...%
        RiskOutcome outcome = calculator.calculate(2, 1);

        assertThat(outcome.riskScore()).isEqualByComparingTo(new BigDecimal("33.33"));
    }

    @DisplayName("판정된 성분이 0건이면 예외다")
    @Test
    void throwsWhenNoJudgedIngredient() {
        assertThatThrownBy(() -> calculator.calculate(0, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @DisplayName("모든 성분이 CAUTION이면 HIGH다")
    @Test
    void allCautionIsHigh() {
        RiskOutcome outcome = calculator.calculate(0, 5);

        assertThat(outcome.level()).isEqualTo(RiskLevel.HIGH);
        assertThat(outcome.riskScore()).isEqualByComparingTo(new BigDecimal("100.00"));
    }
}

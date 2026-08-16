package com.ildangbaek.backend.domain.check;

import com.ildangbaek.backend.domain.check.entity.RiskLevel;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

/**
 * F-CHECK-03 · 위험도 등급 산출. 산식과 임계값의 근거는 ADR 0015에 있다.
 *
 * <h2>분모는 판정된 성분만이다 (BR 3)</h2>
 * {@code judged = suitableCount + cautionCount}. {@code insufficientCount}는 분모에서 뺀다.
 * 전체 성분 수를 분모로 두면 모르는 성분을 더할수록 비중이 낮아져 "INSUFFICIENT는 위험도를
 * 높이지도 낮추지도 않는다"는 BR 3을 어긴다. 판정 분모에서는 INSUFFICIENT를 아무리 더해도
 * 두 축 모두 불변이다 — BR 3이 근사가 아니라 항등식으로 성립한다.
 *
 * <h2>개수 축과 비중 축 중 더 심각한 쪽을 택한다 (BR 2)</h2>
 * 개수 축만 쓰면 판정 20종 중 CAUTION 12종(0.60)이 HIGH를 못 넘는 구간이 생기고, 비중 축만 쓰면
 * 40종짜리 제품의 CAUTION 12종(0.30)이 MEDIUM에 머문다. 더 심각한 쪽을 택하는 근거는 ADR 0010
 * 근거 3의 비대칭 비용과 같다 — 잘못된 HIGH는 제품 하나를 안 사게 하지만, 잘못된 LOW는 맞지 않는
 * 제품을 사게 만든다.
 *
 * <h2>비중 축에는 최소 판정 수 게이트가 있다</h2>
 * 게이트가 없으면 1건짜리 CAUTION(judged 2 → ratio 0.50)만으로 HIGH가 되어, 프로파일이 희소한
 * 초기에는 대부분의 결과가 HIGH로 붕괴한다. 표본이 작을 때 비율을 신뢰하지 않는다는 판단은
 * ADR 0009가 "관측 3건 미만은 확정하지 않는다"로 이미 채택한 것과 같은 성격이다.
 *
 * <p><strong>임계값 3건 · 0.40 · 5종에 이론적 근거는 없다.</strong> ADR 0009의 3점, 0010의 2점,
 * 0011의 30일/20종과 같은 성격의 초기값이다. 이 클래스는 값이 아니라 형태(두 축 · 판정 분모 ·
 * 심각도 최대 · 표본 게이트)를 고정한다.
 */
@Component
public class RiskLevelCalculator {

    /** 개수 축에서 HIGH가 되는 CAUTION 건수. 근거 없는 초기값 — ADR 0015. */
    static final int MIN_CAUTION_FOR_HIGH = 3;

    /** 비중 축에서 HIGH가 되는 CAUTION 비중. 근거 없는 초기값 — ADR 0015. */
    private static final BigDecimal HIGH_CAUTION_RATIO = new BigDecimal("0.40");

    /** 비중 축을 적용하는 최소 판정 성분 수. 이 미만이면 개수 축만 본다 — ADR 0015. */
    static final int MIN_JUDGED_FOR_RATIO = 5;

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    /**
     * @param suitableCount     판정 SUITABLE 성분 수
     * @param cautionCount      판정 CAUTION 성분 수
     * @return 등급과 riskScore(0~100, CAUTION 비중의 백분율). 게이트와 무관하게 항상 계산된다.
     * @throws IllegalArgumentException 판정된 성분이 0건이면. 호출자가 이 지점에 도달하기 전에
     *                                   {@code CHECK_PROFILE_NOT_READY}를 던졌어야 하는 프로그래밍 오류다.
     */
    public RiskOutcome calculate(int suitableCount, int cautionCount) {
        int judged = suitableCount + cautionCount;
        if (judged == 0) {
            throw new IllegalArgumentException("판정된 성분이 0건인 상태로 위험도를 계산할 수 없습니다.");
        }

        BigDecimal ratio = BigDecimal.valueOf(cautionCount)
                .divide(BigDecimal.valueOf(judged), 4, RoundingMode.HALF_UP);
        BigDecimal riskScore = ratio.multiply(HUNDRED).setScale(2, RoundingMode.HALF_UP);

        RiskLevel countLevel = countLevel(cautionCount);
        RiskLevel ratioLevel = judged >= MIN_JUDGED_FOR_RATIO ? ratioLevel(ratio) : RiskLevel.LOW;
        RiskLevel level = moreSevere(countLevel, ratioLevel);

        return new RiskOutcome(level, riskScore);
    }

    private RiskLevel countLevel(int cautionCount) {
        if (cautionCount >= MIN_CAUTION_FOR_HIGH) {
            return RiskLevel.HIGH;
        }
        if (cautionCount >= 1) {
            return RiskLevel.MEDIUM;
        }
        return RiskLevel.LOW;
    }

    private RiskLevel ratioLevel(BigDecimal ratio) {
        if (ratio.compareTo(HIGH_CAUTION_RATIO) >= 0) {
            return RiskLevel.HIGH;
        }
        if (ratio.compareTo(BigDecimal.ZERO) > 0) {
            return RiskLevel.MEDIUM;
        }
        return RiskLevel.LOW;
    }

    private RiskLevel moreSevere(RiskLevel a, RiskLevel b) {
        return severity(a) >= severity(b) ? a : b;
    }

    private int severity(RiskLevel level) {
        return switch (level) {
            case LOW -> 0;
            case MEDIUM -> 1;
            case HIGH -> 2;
            case INSUFFICIENT -> throw new IllegalArgumentException("INSUFFICIENT는 산식에 들어오지 않습니다.");
        };
    }

    public record RiskOutcome(RiskLevel level, BigDecimal riskScore) {
    }
}

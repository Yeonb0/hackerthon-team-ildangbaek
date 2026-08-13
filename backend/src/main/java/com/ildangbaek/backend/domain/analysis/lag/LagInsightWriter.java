package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import com.ildangbaek.backend.domain.analysis.entity.InsightType;
import com.ildangbaek.backend.domain.analysis.repository.AnalysisInsightRepository;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.user.entity.User;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 패턴 후보를 {@link AnalysisInsight} 행으로 남긴다. REPORT-01의 {@code insights}가 이 행을 읽는다.
 *
 * <p>{@link com.ildangbaek.backend.api.skin.service.SkinRecordWriter}와 같은 이유로 별도 빈이다 —
 * 같은 클래스 안에서 부르면 {@code @Transactional}이 프록시를 거치지 않아 무시된다.
 */
@Component
@RequiredArgsConstructor
public class LagInsightWriter {

    /** 한 번에 남기는 인사이트 수. 리포트 화면이 카드 몇 장만 보여주므로 상위만 남긴다. */
    private static final int MAX_INSIGHTS = 5;

    /** 위 기준을 넘겼을 때 신뢰도 점수를 낮추는 비율. 근거 없는 초기값이며 재검토 대상이다. */
    private static final double MENSTRUAL_CONFIDENCE_PENALTY_RATIO = 0.2;

    private final AnalysisInsightRepository analysisInsightRepository;

    @Transactional
    public List<AnalysisInsight> write(User user, List<LagPattern> patterns, LocalDate startDate,
                                       LocalDate endDate) {
        // 이번 회차가 이전 회차를 대체한다. 지우지 않으면 기록할 때마다 같은 인사이트가 쌓인다.
        // 환경 인사이트(F-ANALYSIS-02)는 다른 기능이 만드므로 성분 것만 지운다.
        analysisInsightRepository.deleteAllByUserIdAndInsightType(user.getId(), InsightType.INGREDIENT);

        List<AnalysisInsight> insights = strongestPerIngredientAndMetric(patterns).stream()
                .limit(MAX_INSIGHTS)
                .map(pattern -> toInsight(user, pattern, startDate, endDate))
                .toList();
        return analysisInsightRepository.saveAll(insights);
    }

    /**
     * 한 성분·지표에 대해 1~7일 시차가 각각 후보를 내므로, 그대로 두면 같은 성분 카드가 최대 7장 나온다.
     * 사용자에게는 가장 강한 시차 하나만 보여준다. 분석기가 이미 확정 우선·변화량 순으로 정렬해 두므로
     * 먼저 나온 것을 고르면 된다.
     */
    private List<LagPattern> strongestPerIngredientAndMetric(List<LagPattern> patterns) {
        Map<String, LagPattern> strongest = new LinkedHashMap<>();
        for (LagPattern pattern : patterns) {
            strongest.putIfAbsent(pattern.ingredientId() + ":" + pattern.metricType(), pattern);
        }
        return List.copyOf(strongest.values());
    }

    private AnalysisInsight toInsight(User user, LagPattern pattern, LocalDate startDate, LocalDate endDate) {
        return AnalysisInsight.builder()
                .user(user)
                .insightType(InsightType.INGREDIENT)
                .metricType(pattern.metricType())
                .title(pattern.ingredientName())
                .description(describe(pattern))
                .recommendation(recommend(pattern))
                .startDate(startDate)
                .endDate(endDate)
                .confidenceScore(confidenceScore(pattern))
                // 문구로 접고 버리면 REPORT-02가 같은 값을 다시 계산해야 한다. 원본을 남긴다.
                .lagDays(pattern.lagDays())
                .averageDelta(BigDecimal.valueOf(pattern.averageDelta()).setScale(2, RoundingMode.HALF_UP))
                .build();
    }

    /**
     * 확정 여부에 따라 문구의 어조를 바꾼다. 확인 중인 패턴에 단정적 문구를 쓰지 않는다는
     * REPORT-01 BR 5를 문구 생성 단계에서 지킨다.
     */
    private String describe(LagPattern pattern) {
        String metricName = metricName(pattern.metricType());
        String changeWord = pattern.direction() == PatternDirection.WORSENED ? "증가" : "감소";
        if (pattern.confirmed()) {
            return "%s 사용 후 %d일 뒤 %s이(가) 반복적으로 %s해요".formatted(
                    pattern.ingredientName(), pattern.lagDays(), metricName, changeWord);
        }
        return "%s 사용 후 %s 변화를 확인 중이에요".formatted(pattern.ingredientName(), metricName);
    }

    private String recommend(LagPattern pattern) {
        if (!pattern.confirmed()) {
            // 확인 중인 단계에서 사용 중단을 권하지 않는다. 반복성이 없는 관측으로 행동을 바꾸게 하면
            // 그다음 관측 기회까지 사라진다.
            return "조금 더 기록하면 패턴을 확인할 수 있어요";
        }
        return pattern.direction() == PatternDirection.WORSENED
                ? "이 성분이 들어간 제품의 사용 빈도를 줄여보세요"
                : "이 성분이 잘 맞는 편이에요";
    }

    /**
     * 방향 일치 비율을 그대로 0~100 점수로 쓴다. 확정되지 않은 패턴은 리포트에서 "확인 중"으로
     * 표시되어야 하므로 확정 임계선 아래로 눌러 둔다.
     *
     * <p>관측 쌍의 절반 이상이 생리 기간에 걸치면 호르몬 변화와 성분 반응을 구분할 수 없으므로
     * 신뢰도를 {@value #MENSTRUAL_CONFIDENCE_PENALTY_RATIO}만큼 낮춘다. 생리 정보가 없는 사용자는
     * {@code menstrualAffectedCount}가 항상 0이라 이 보정이 적용되지 않는다. (F-ANALYSIS-03 BR 1, 3)
     */
    private BigDecimal confidenceScore(LagPattern pattern) {
        double rate = pattern.confirmed()
                ? pattern.agreementRate()
                : Math.min(pattern.agreementRate(), LagCorrelationAnalyzer.MIN_AGREEMENT_RATE - 0.01);
        if (pattern.menstrualAffectedRate() >= LagCorrelationAnalyzer.MENSTRUAL_AFFECTED_THRESHOLD) {
            rate *= (1 - MENSTRUAL_CONFIDENCE_PENALTY_RATIO);
        }
        return BigDecimal.valueOf(rate * 100).setScale(2, RoundingMode.HALF_UP);
    }

    private String metricName(SkinMetricType metricType) {
        return switch (metricType) {
            case TROUBLE -> "트러블";
            case REDNESS -> "홍조";
            case PORES -> "모공";
            case PIGMENTATION -> "색소침착";
        };
    }
}

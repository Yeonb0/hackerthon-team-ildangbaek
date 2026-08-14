package com.ildangbaek.backend.domain.analysis.lag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import com.ildangbaek.backend.domain.analysis.repository.AnalysisInsightRepository;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * F-ANALYSIS-03의 신뢰도 보정 규칙을 고정한다 — 생리 기간에 걸친 관측이 절반 이상이면 신뢰도를 낮춘다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LagInsightWriterTest {

    private static final LocalDate START = LocalDate.of(2026, 7, 1);
    private static final LocalDate END = LocalDate.of(2026, 7, 30);

    @Mock
    private AnalysisInsightRepository analysisInsightRepository;

    private LagInsightWriter writer;
    private User user;

    @BeforeEach
    void setUp() {
        writer = new LagInsightWriter(analysisInsightRepository);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        when(analysisInsightRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @DisplayName("관측 쌍의 절반 이상이 생리 기간에 걸치면 신뢰도를 낮춘다")
    @Test
    void lowersConfidenceWhenMostlyMenstrualAffected() {
        LagPattern affected = pattern(SkinMetricType.TROUBLE, 3, 3, 15.0, true, 2);
        LagPattern unaffected = pattern(SkinMetricType.REDNESS, 3, 3, 15.0, true, 0);

        List<AnalysisInsight> insights = writer.write(user, List.of(affected, unaffected), START, END);

        AnalysisInsight affectedInsight = insights.stream()
                .filter(insight -> insight.getMetricType() == SkinMetricType.TROUBLE).findFirst().orElseThrow();
        AnalysisInsight unaffectedInsight = insights.stream()
                .filter(insight -> insight.getMetricType() == SkinMetricType.REDNESS).findFirst().orElseThrow();
        assertThat(affectedInsight.getConfidenceScore())
                .isLessThan(unaffectedInsight.getConfidenceScore());
    }

    @DisplayName("생리 정보가 없는 사용자는 보정 없이 방향 일치율 그대로 신뢰도로 쓴다")
    @Test
    void keepsBaseConfidenceWithoutMenstrualData() {
        LagPattern noInfo = pattern(SkinMetricType.TROUBLE, 3, 3, 15.0, true, 0);

        List<AnalysisInsight> insights = writer.write(user, List.of(noInfo), START, END);

        assertThat(insights.get(0).getConfidenceScore().doubleValue()).isEqualTo(100.0);
    }

    private LagPattern pattern(SkinMetricType metricType, int observations, int agreement, double averageDelta,
                               boolean confirmed, int menstrualAffectedCount) {
        return new LagPattern(200L, "레티놀", metricType, 2, PatternDirection.WORSENED,
                observations, agreement, averageDelta, confirmed, menstrualAffectedCount);
    }
}

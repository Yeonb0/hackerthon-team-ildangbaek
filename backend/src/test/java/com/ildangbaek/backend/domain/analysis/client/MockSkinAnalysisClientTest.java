package com.ildangbaek.backend.domain.analysis.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * ADR 0003 「목업 구현 요건」을 고정한다 — 결정성 · 실패 재현 · 점수 범위.
 */
class MockSkinAnalysisClientTest {

    private static final LocalDate DATE = LocalDate.of(2026, 8, 8);

    private MockSkinAnalysisClient client() {
        return new MockSkinAnalysisClient("");
    }

    @DisplayName("같은 입력이면 항상 같은 점수가 나온다")
    @Test
    void isDeterministic() {
        SkinAnalysisResult first = client().analyze("/images/a.jpg", 1L, DATE, TimeSlot.MORNING);
        SkinAnalysisResult second = client().analyze("/images/a.jpg", 1L, DATE, TimeSlot.MORNING);

        assertThat(first.scores()).isEqualTo(second.scores());
    }

    @DisplayName("이미지가 달라도 시드가 같으면 결과가 같다 — 시드는 이미지에서 유도하지 않는다")
    @Test
    void ignoresImage() {
        SkinAnalysisResult a = client().analyze("/images/a.jpg", 1L, DATE, TimeSlot.MORNING);
        SkinAnalysisResult b = client().analyze("/images/b.jpg", 1L, DATE, TimeSlot.MORNING);

        assertThat(a.scores()).isEqualTo(b.scores());
    }

    @DisplayName("사용자 · 날짜 · 슬롯이 다르면 결과가 갈린다")
    @Test
    void variesBySeed() {
        SkinAnalysisResult base = client().analyze("/i.jpg", 1L, DATE, TimeSlot.MORNING);

        assertThat(client().analyze("/i.jpg", 2L, DATE, TimeSlot.MORNING).scores())
                .isNotEqualTo(base.scores());
        assertThat(client().analyze("/i.jpg", 1L, DATE.plusDays(1), TimeSlot.MORNING).scores())
                .isNotEqualTo(base.scores());
        assertThat(client().analyze("/i.jpg", 1L, DATE, TimeSlot.NIGHT).scores())
                .isNotEqualTo(base.scores());
    }

    @DisplayName("지표 4종을 모두 0~100 정수로 산출한다")
    @Test
    void producesAllMetricsInRange() {
        SkinAnalysisResult result = client().analyze("/i.jpg", 1L, DATE, TimeSlot.MORNING);

        assertThat(result.scores()).containsOnlyKeys(SkinMetricType.values());
        assertThat(result.scores().values()).allSatisfy(score ->
                assertThat(score).isBetween(0, 100));
    }

    @DisplayName("실패 모드를 켜면 해당 예외를 던진다")
    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "face-not-detected, SKIN_FACE_NOT_DETECTED",
            "timeout,           SKIN_ANALYSIS_TIMEOUT",
            "failed,            SKIN_ANALYSIS_FAILED",
    })
    void reproducesFailures(String mode, ErrorCode expected) {
        assertThatThrownBy(() ->
                new MockSkinAnalysisClient(mode).analyze("/i.jpg", 1L, DATE, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(expected);
    }

    @DisplayName("알 수 없는 실패 모드는 무시하고 정상 분석한다")
    @Test
    void ignoresUnknownFailureMode() {
        assertThat(new MockSkinAnalysisClient("nonsense")
                .analyze("/i.jpg", 1L, DATE, TimeSlot.MORNING).scores())
                .hasSize(SkinMetricType.values().length);
    }

    @DisplayName("분석 수단은 MOCK으로 기록된다")
    @Test
    void reportsMockMethod() {
        assertThat(client().method()).isEqualTo(AnalysisMethod.MOCK);
    }
}

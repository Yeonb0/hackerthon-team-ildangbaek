package com.ildangbaek.backend.global.util;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * ADR 0005 「검증 기준」의 경계값을 고정한다.
 * 자정 전후에서만 재현되는 오류라 테스트로 묶어두지 않으면 발견이 늦다.
 */
class RecordDateResolverTest {

    @DisplayName("NIGHT 슬롯은 00:00~05:59에 기록해도 전날로 귀속한다")
    @ParameterizedTest(name = "{0} {1} → {2}")
    @CsvSource({
            // ADR 0005 검증 기준표
            "2026-08-08T08:00:00, MORNING, 2026-08-08",
            "2026-08-08T20:00:00, NIGHT,   2026-08-08",
            "2026-08-08T23:59:00, NIGHT,   2026-08-08",
            "2026-08-08T00:00:00, NIGHT,   2026-08-07",
            "2026-08-08T05:59:00, NIGHT,   2026-08-07",
    })
    void resolve(LocalDateTime recordedAt, TimeSlot timeSlot, LocalDate expected) {
        assertThat(RecordDateResolver.resolve(recordedAt, timeSlot)).isEqualTo(expected);
    }

    @DisplayName("06:00은 전날로 넘기지 않는다 — NIGHT 이월 구간의 경계")
    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "2026-08-08T05:59:59, 2026-08-07",
            "2026-08-08T06:00:00, 2026-08-08",
    })
    void nightCarryoverBoundary(LocalDateTime recordedAt, LocalDate expected) {
        assertThat(RecordDateResolver.resolve(recordedAt, TimeSlot.NIGHT)).isEqualTo(expected);
    }

    @DisplayName("MORNING은 시각과 무관하게 달력 날짜를 그대로 쓴다")
    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "2026-08-08T00:00:00, 2026-08-08",
            "2026-08-08T05:59:00, 2026-08-08",
            "2026-08-08T23:59:00, 2026-08-08",
    })
    void morningNeverCarriesOver(LocalDateTime recordedAt, LocalDate expected) {
        assertThat(RecordDateResolver.resolve(recordedAt, TimeSlot.MORNING)).isEqualTo(expected);
    }

    @DisplayName("월·연 경계에서도 전날 계산이 어긋나지 않는다")
    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "2026-08-01T01:00:00, 2026-07-31",
            "2026-01-01T01:00:00, 2025-12-31",
            "2028-03-01T01:00:00, 2028-02-29",
    })
    void nightCarryoverAcrossMonthBoundary(LocalDateTime recordedAt, LocalDate expected) {
        assertThat(RecordDateResolver.resolve(recordedAt, TimeSlot.NIGHT)).isEqualTo(expected);
    }
}

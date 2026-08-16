package com.ildangbaek.backend.api.skin.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SkinRecordCreateRequestTest {

    @DisplayName("대소문자·공백과 무관하게 슬롯으로 변환한다")
    @ParameterizedTest(name = "\"{0}\"")
    @ValueSource(strings = {"MORNING", "morning", " Morning "})
    void convertsToTimeSlot(String raw) {
        assertThat(new SkinRecordCreateRequest(raw).toTimeSlot()).isEqualTo(TimeSlot.MORNING);
    }

    @DisplayName("정의되지 않은 슬롯은 400 RECORD_INVALID_TIME_SLOT")
    @Test
    void rejectsUnknownSlot() {
        assertThatThrownBy(() -> new SkinRecordCreateRequest("EVENING").toTimeSlot())
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.RECORD_INVALID_TIME_SLOT);
    }
}

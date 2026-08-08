package com.ildangbaek.backend.api.skin.dto;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import jakarta.validation.constraints.NotBlank;
import java.util.Locale;

/**
 * SKIN-01 요청. 이미지는 {@code @RequestPart}로 따로 받는다.
 *
 * <p>슬롯은 클라이언트가 정해서 보낸다. 시각과 어긋나는 조합(예: 심야의 MORNING)도 현재는 수용한다.
 * 거절 여부는 제품 기록과 함께 정해야 할 공통 문제다. (ADR 0005 미해결 항목)
 *
 * <p>{@code TimeSlot}으로 바로 받지 않고 문자열로 받는 이유는 오류 응답 때문이다. 타입 변환에
 * 맡기면 명세가 정한 {@code RECORD_INVALID_TIME_SLOT}(400) 대신 검증 실패(422)가 나가고,
 * 메시지에 자바 타입명이 그대로 노출된다.
 */
public record SkinRecordCreateRequest(
        @NotBlank(message = "시간대는 필수입니다.") String timeSlot
) {

    public TimeSlot toTimeSlot() {
        try {
            return TimeSlot.valueOf(timeSlot.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.RECORD_INVALID_TIME_SLOT);
        }
    }
}

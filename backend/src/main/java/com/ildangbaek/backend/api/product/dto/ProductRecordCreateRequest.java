package com.ildangbaek.backend.api.product.dto;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Locale;

/**
 * PRODUCT-05 요청. (docs/api_명세서.md)
 *
 * <p>{@code timeSlot}을 문자열로 받는 이유는 SKIN-01과 동일하다 — 타입 변환에 맡기면
 * {@code RECORD_INVALID_TIME_SLOT}(400) 대신 검증 실패(422)가 나간다.
 *
 * <p>{@code productIds}의 개수 검증은 {@code @Size} 대신 서비스에서 한다. {@code @Valid} 실패는
 * {@code COMMON_VALIDATION_FAILED}로 뭉뚱그려지는데, 명세는 빈 목록과 30개 초과를 각각
 * {@code PRODUCT_RECORD_EMPTY} · {@code PRODUCT_RECORD_LIMIT_EXCEEDED}로 구분해 요구한다.
 *
 * <p>{@code force}는 {@code boolean}이 아니라 {@code Boolean}이다. 명세가 선택 필드(기본 false)로
 * 규정하는데, 원시 타입이면 필드를 생략한 JSON에서 Jackson이 레코드 생성자를 호출하지 못해
 * {@code HttpMessageNotReadableException} → {@code COMMON_BAD_REQUEST}(400)가 나갔다.
 * 생략을 기본값으로 받으려면 null을 담을 수 있어야 한다.
 */
public record ProductRecordCreateRequest(
        @NotBlank(message = "시간대는 필수입니다.") String timeSlot,
        List<Long> productIds,
        Boolean force
) {

    /** 생략된 {@code force}는 명세대로 false로 본다. */
    @Override
    public Boolean force() {
        return force != null && force;
    }

    public TimeSlot toTimeSlot() {
        try {
            return TimeSlot.valueOf(timeSlot.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.RECORD_INVALID_TIME_SLOT);
        }
    }
}

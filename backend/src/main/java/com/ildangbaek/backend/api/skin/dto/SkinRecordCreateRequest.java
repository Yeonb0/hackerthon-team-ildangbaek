package com.ildangbaek.backend.api.skin.dto;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import jakarta.validation.constraints.NotNull;

/**
 * SKIN-01 요청. 이미지는 {@code @RequestPart}로 따로 받는다.
 *
 * <p>슬롯은 클라이언트가 정해서 보낸다. 시각과 어긋나는 조합(예: 심야의 MORNING)도 현재는 수용한다.
 * 거절 여부는 제품 기록과 함께 정해야 할 공통 문제다. (ADR 0005 미해결 항목)
 */
public record SkinRecordCreateRequest(
        @NotNull(message = "시간대는 필수입니다.") TimeSlot timeSlot
) {
}

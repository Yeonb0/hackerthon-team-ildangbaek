package com.ildangbaek.backend.api.skin.dto;

import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * SKIN-01 응답. SKIN-02 · SKIN-03도 같은 구조를 쓴다.
 *
 * @param comparison 비교 대상이 없으면 {@code null}. 오류가 아니다. (F-SKIN-05)
 */
public record SkinRecordResponse(
        Long skinRecordId,
        TimeSlot timeSlot,
        OffsetDateTime capturedAt,
        int totalScore,
        SkinScoresResponse scores,
        SkinComparisonResponse comparison
) {

    /** 날짜/시간은 KST 오프셋을 명시해 내려보낸다 (공통 응답 포맷 8.1). */
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    public static SkinRecordResponse of(SkinRecord record, SkinScoresResponse scores,
                                        SkinComparisonResponse comparison) {
        return new SkinRecordResponse(
                record.getId(),
                record.getTimeSlot(),
                record.getCapturedAt().atZone(KST).toOffsetDateTime(),
                record.getOverallScore().intValue(),
                scores,
                comparison);
    }
}

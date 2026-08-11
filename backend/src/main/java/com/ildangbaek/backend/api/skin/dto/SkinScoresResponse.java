package com.ildangbaek.backend.api.skin.dto;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.util.Map;

/**
 * 지표 4종 점수. (ADR 0002)
 */
public record SkinScoresResponse(
        int trouble,
        int redness,
        int pores,
        int pigmentation
) {

    public static SkinScoresResponse from(Map<SkinMetricType, Integer> scores) {
        return new SkinScoresResponse(
                scores.get(SkinMetricType.TROUBLE),
                scores.get(SkinMetricType.REDNESS),
                scores.get(SkinMetricType.PORES),
                scores.get(SkinMetricType.PIGMENTATION));
    }
}

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

    /**
     * 지표가 빠진 기록(분석 부분 실패, 지표 추가 이전 기록)은 해당 값을 0으로 채운다.
     * 필드가 primitive라 {@code null}을 그대로 넣으면 언박싱 NPE로 조회 자체가 500이 된다.
     */
    public static SkinScoresResponse from(Map<SkinMetricType, Integer> scores) {
        return new SkinScoresResponse(
                scoreOf(scores, SkinMetricType.TROUBLE),
                scoreOf(scores, SkinMetricType.REDNESS),
                scoreOf(scores, SkinMetricType.PORES),
                scoreOf(scores, SkinMetricType.PIGMENTATION));
    }

    private static int scoreOf(Map<SkinMetricType, Integer> scores, SkinMetricType type) {
        Integer score = scores.get(type);
        return score == null ? 0 : score;
    }
}

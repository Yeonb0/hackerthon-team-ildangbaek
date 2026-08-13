package com.ildangbaek.backend.domain.analysis.client;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.util.Map;

/**
 * 피부 분석 결과. 지표 4종(ADR 0002)의 0~100 점수를 담는다.
 *
 * <p>종합 점수는 담지 않는다. 산출식이 외부 AI 응답에 종속되지 않도록 서비스 계층에서 계산한다.
 * (ADR 0008)
 *
 * @param scores 지표별 점수. {@link SkinMetricType} 4종을 모두 포함한다.
 */
public record SkinAnalysisResult(Map<SkinMetricType, Integer> scores) {

    public SkinAnalysisResult {
        scores = Map.copyOf(scores);
    }

    public int score(SkinMetricType type) {
        Integer value = scores.get(type);
        if (value == null) {
            throw new IllegalStateException("분석 결과에 지표가 없습니다: " + type);
        }
        return value;
    }
}

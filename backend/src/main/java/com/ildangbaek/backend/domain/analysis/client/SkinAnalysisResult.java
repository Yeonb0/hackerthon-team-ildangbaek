package com.ildangbaek.backend.domain.analysis.client;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import java.util.Map;

/**
 * 피부 분석 결과. 지표 4종(ADR 0002)의 0~100 점수와, 그 점수의 근거가 되는 원시 측정값을 담는다.
 *
 * <p>종합 점수는 담지 않는다. 산출식이 외부 AI 응답에 종속되지 않도록 서비스 계층에서 계산한다.
 * (ADR 0008)
 *
 * <p>{@code rawValues}·{@code confidence}·{@code algorithmVersion}·{@code normalizationVersion}은
 * 분석 서버가 실제로 값을 제공할 때만 채워진다 — 목업이거나 구버전 분석 서버 응답이면 해당
 * 항목이 비어 있을 수 있다. 이 값들을 임의로 지어내지 않는다.
 *
 * @param scores               지표별 0~100 점수. {@link SkinMetricType} 4종을 모두 포함한다.
 * @param rawValues            지표별 1차(규칙 기반) 원시 측정값. 없으면 해당 지표가 맵에서 빠진다.
 * @param confidence           지표별 신뢰도. 실제 근거가 있는 지표만 채운다(현재는 PORES만).
 * @param algorithmVersion     rawValues를 산출한 분석 알고리즘 버전. 근거 없으면 {@code null}.
 * @param normalizationVersion rawValues를 score로 바꾸는 데 쓰인 정규화 기준 버전. 근거 없으면 {@code null}.
 */
public record SkinAnalysisResult(
        Map<SkinMetricType, Integer> scores,
        Map<SkinMetricType, Double> rawValues,
        Map<SkinMetricType, String> confidence,
        String algorithmVersion,
        String normalizationVersion) {

    public SkinAnalysisResult {
        scores = Map.copyOf(scores);
        rawValues = Map.copyOf(rawValues);
        confidence = Map.copyOf(confidence);
    }

    /**
     * 원시 측정값·신뢰도·버전 정보 없이 점수만 있는 결과를 만든다. 목업 분석처럼 근거 없는
     * 값을 지어낼 수 없는 구현체용이다.
     */
    public static SkinAnalysisResult ofScoresOnly(Map<SkinMetricType, Integer> scores) {
        return new SkinAnalysisResult(scores, Map.of(), Map.of(), null, null);
    }

    public int score(SkinMetricType type) {
        Integer value = scores.get(type);
        if (value == null) {
            throw new IllegalStateException("분석 결과에 지표가 없습니다: " + type);
        }
        return value;
    }
}

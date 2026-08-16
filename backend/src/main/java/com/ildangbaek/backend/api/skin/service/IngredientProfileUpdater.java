package com.ildangbaek.backend.api.skin.service;

import com.ildangbaek.backend.domain.record.entity.SkinRecord;

/**
 * 피부 기록이 저장된 뒤 성분 관련 후속 분석을 돌린다.
 *
 * <p>명세가 정한 F-ANALYSIS-01의 트리거가 "신규 피부 분석 결과 저장"이라 이 지점에서 부른다.
 * 현재 구현체({@link LagAnalysisProfileUpdater})는 F-ANALYSIS-01(성분-피부 시차 분석)을 돌린 뒤
 * 그 결과를 {@code AnalysisInsight}와 {@code IngredientProfile}(F-ANALYSIS-04)로 남긴다.
 */
public interface IngredientProfileUpdater {

    void update(SkinRecord skinRecord);
}

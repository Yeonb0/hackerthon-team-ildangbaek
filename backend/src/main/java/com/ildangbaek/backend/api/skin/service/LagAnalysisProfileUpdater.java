package com.ildangbaek.backend.api.skin.service;

import com.ildangbaek.backend.domain.analysis.lag.IngredientLagAnalysisService;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 피부 기록 저장 직후 F-ANALYSIS-01 시차 분석을 돌린다.
 *
 * <p>분석 실패가 피부 기록 저장을 되돌리면 안 된다. 사용자는 이미 사진을 찍고 분석을 기다린 뒤이고,
 * 인사이트는 없어도 기록 자체는 남아야 한다(ADR 0001과 같은 이유). 그래서 예외를 삼키고 로그만 남긴다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LagAnalysisProfileUpdater implements IngredientProfileUpdater {

    private final IngredientLagAnalysisService lagAnalysisService;

    @Override
    public void update(SkinRecord skinRecord) {
        try {
            int stored = lagAnalysisService.analyzeAndStore(skinRecord.getUser(), skinRecord.getRecordDate());
            log.debug("시차 분석 완료. skinRecordId={} insights={}", skinRecord.getId(), stored);
        } catch (RuntimeException e) {
            log.warn("시차 분석에 실패했지만 피부 기록은 유지합니다. skinRecordId={}", skinRecord.getId(), e);
        }
    }
}

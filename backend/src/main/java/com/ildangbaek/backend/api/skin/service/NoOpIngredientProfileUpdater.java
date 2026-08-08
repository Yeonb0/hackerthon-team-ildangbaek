package com.ildangbaek.backend.api.skin.service;

import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 아무것도 하지 않는 기본 구현.
 *
 * <p>제품 기록(A 담당)이 없어 성분-피부 시차 분석의 입력 자체가 없다. 데이터가 부족할 때
 * 임의로 판단하지 않는다는 원칙(F-ANALYSIS-04)에 따라, 억지로 프로파일을 만들지 않고 비워 둔다.
 */
@Slf4j
@Component
public class NoOpIngredientProfileUpdater implements IngredientProfileUpdater {

    @Override
    public void update(SkinRecord skinRecord) {
        log.debug("성분 프로파일 갱신은 아직 구현되지 않았습니다. skinRecordId={}", skinRecord.getId());
    }
}

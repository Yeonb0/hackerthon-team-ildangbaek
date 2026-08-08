package com.ildangbaek.backend.api.skin.service;

import com.ildangbaek.backend.domain.record.entity.SkinRecord;

/**
 * 피부 기록이 저장된 뒤 개인 성분 프로파일을 갱신한다. (F-ANALYSIS-04)
 *
 * <p>호출 지점만 확보해 둔 자리다. 실제 계산은 "성분 사용 → 시간차 → 피부 변화"를 따지는
 * F-ANALYSIS-01이 필요하고, 그 입력인 제품 기록(PRODUCT-05, A 담당)이 아직 없다.
 * 제품 기록이 들어오면 {@link NoOpIngredientProfileUpdater}를 실제 구현으로 교체한다.
 */
public interface IngredientProfileUpdater {

    void update(SkinRecord skinRecord);
}

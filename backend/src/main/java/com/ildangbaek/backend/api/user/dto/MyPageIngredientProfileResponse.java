package com.ildangbaek.backend.api.user.dto;

import java.util.List;

/**
 * USER-01의 프로파일 요약 영역.
 *
 * @param completionRate F-ANALYSIS-05 값(ADR 0011). USER-02·CHECK-01과 동일해야 한다(BR 4).
 * @param topIngredients 요약 노출용 최대 8건. 전체 목록은 USER-02를 쓴다.
 */
public record MyPageIngredientProfileResponse(
        int completionRate,
        long goodCount,
        long cautionCount,
        long insufficientCount,
        List<MyPageTopIngredientResponse> topIngredients
) {
}

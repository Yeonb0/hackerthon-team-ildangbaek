package com.ildangbaek.backend.domain.analysis.lag;

import com.ildangbaek.backend.domain.record.entity.SkinMetricType;

/**
 * F-ANALYSIS-01의 출력 — <strong>성분별 패턴 후보</strong>.
 *
 * <p>이름 그대로 후보다. 인과관계가 아니라 기록 기반 연관 패턴으로만 취급한다(명세 주석).
 * 따라서 문구를 만들 때도 "~때문에"가 아니라 "~한 뒤 ~가 반복 관찰됨"으로 쓴다.
 *
 * @param lagDays          사용 후 며칠 뒤의 변화인지 (1~7)
 * @param observationCount 이 성분·지표·시차 조합에서 관측된 사용-변화 쌍의 수
 * @param agreementCount   그중 {@code direction}과 같은 방향으로 움직인 횟수
 * @param averageDelta     관측된 지표 변화량의 평균. 부호는 지표값 기준이라 양수면 증상 악화다.
 * @param confirmed        반복성을 확보해 패턴으로 확정된 경우 true. false면 "확인 중"이다. (BR 3, 4)
 * @param menstrualAffectedCount 관측 쌍 중 기준선·이후 관측일 중 하나라도 생리 기간에 걸친 건수.
 *                         호르몬 변화가 성분 반응과 섞였을 수 있다는 근거다. (F-ANALYSIS-03 BR 1)
 */
public record LagPattern(
        Long ingredientId,
        String ingredientName,
        SkinMetricType metricType,
        int lagDays,
        PatternDirection direction,
        int observationCount,
        int agreementCount,
        double averageDelta,
        boolean confirmed,
        int menstrualAffectedCount
) {

    /** 같은 방향으로 움직인 비율. 반복성 판정과 신뢰도 산출의 근거값이다. */
    public double agreementRate() {
        return observationCount == 0 ? 0.0 : (double) agreementCount / observationCount;
    }

    /** 생리 기간에 걸친 관측 쌍의 비율. 절반 이상이면 확정 판정이 더 엄격해진다. */
    public double menstrualAffectedRate() {
        return observationCount == 0 ? 0.0 : (double) menstrualAffectedCount / observationCount;
    }
}

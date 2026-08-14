package com.ildangbaek.backend.domain.analysis.hormone;

/**
 * F-ANALYSIS-03 · 특정 날짜의 호르몬 상태 구간.
 *
 * <p>{@link #MENSTRUAL}만 시차 분석의 신뢰도 보정에 쓰인다(BR 1) — 호르몬 변화가 가장 큰 구간이라
 * 그 시기에 걸친 관측은 성분 반응과 구분하기 어렵다. 나머지 구간은 정보를 남기되 보정에는 관여하지 않는다.
 *
 * <p>{@link #HORMONE_CONTROLLED} · {@link #MENOPAUSE}는 주기 계산을 적용하지 않고 상태값 자체를
 * 쓰는 경우다(BR 2). {@link #UNKNOWN}은 정보가 없어 보정을 생략한 경우다(BR 3).
 */
public enum MenstrualCyclePhase {
    MENSTRUAL,
    FOLLICULAR,
    OVULATION,
    LUTEAL,
    HORMONE_CONTROLLED,
    MENOPAUSE,
    UNKNOWN
}

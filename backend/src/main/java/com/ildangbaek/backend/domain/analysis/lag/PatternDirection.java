package com.ildangbaek.backend.domain.analysis.lag;

/**
 * 성분 사용 이후 관측된 피부 변화의 방향.
 *
 * <p>지표값은 "증상의 세기"다(ADR 0002). 트러블 수치가 올라가면 나빠진 것이므로
 * 값 증가 = {@link #WORSENED}다.
 */
public enum PatternDirection {
    IMPROVED,
    WORSENED
}

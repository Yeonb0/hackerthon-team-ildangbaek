package com.ildangbaek.backend.domain.check.entity;

/**
 * CHECK-02·03의 위험도 등급. 등급 산출 기준은 ADR 0015.
 *
 * <p><strong>{@code INSUFFICIENT}는 저장되지 않는다.</strong> 판정된 성분이 0건이면 등급을 매기지
 * 않고 {@code CHECK_PROFILE_NOT_READY}(409)를 던지며, 이 경우 평가 자체를 저장하지 않는다 — 값과
 * 오류가 동시에 답일 수 없어 오류를 택했다. 이 상수는 ERD가 값으로 열거하고 있어 지우지 않되,
 * 실제로 쓰이는 경로는 없다.
 */
public enum RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    INSUFFICIENT;

    /**
     * S-22에서 등급 대신 노출되는 큰 제목. (F-CHECK-04 BR 1)
     *
     * @throws IllegalStateException {@code INSUFFICIENT}는 저장되지 않으므로 도달하면 안 된다.
     */
    public String title() {
        return switch (this) {
            case LOW -> "잘 맞아요";
            case MEDIUM -> "보통이에요";
            case HIGH -> "주의가 필요해요";
            case INSUFFICIENT -> throw new IllegalStateException("INSUFFICIENT는 저장되지 않는 상태입니다.");
        };
    }

    /** 등급 설명 한 줄. (F-CHECK-04 BR 2) */
    public String description() {
        return switch (this) {
            case LOW -> "내 피부 기준으로 주의할 성분이 없어요";
            case MEDIUM -> "내 피부 기준으로 주의할 성분이 일부 있어요";
            case HIGH -> "내 피부 기준으로 맞지 않는 성분이 포함되어 있어요";
            case INSUFFICIENT -> throw new IllegalStateException("INSUFFICIENT는 저장되지 않는 상태입니다.");
        };
    }
}

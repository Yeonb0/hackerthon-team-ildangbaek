package com.ildangbaek.backend.domain.record.entity;

/**
 * 피부 지표 4종 — 트러블 · 홍조 · 모공 · 색소잡티. docs/decisions/0002-피부-지표-체계.md에서 확정.
 */
public enum SkinMetricType {
    TROUBLE,
    REDNESS,
    PORES,
    PIGMENTATION
}

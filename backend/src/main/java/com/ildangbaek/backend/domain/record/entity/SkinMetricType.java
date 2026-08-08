package com.ildangbaek.backend.domain.record.entity;

/**
 * docs/ERD.md 7장 SkinMetric.metric_type 기준(TROUBLE/REDNESS/MOISTURE_OIL).
 * docs/api_명세서.md·기능명세서 F-SKIN-04는 TROUBLE/REDNESS/PORES/PIGMENTATION 4종을 언급해
 * PRD 14장 TBD-11(피부 지표 확정)이 해결되면 값 구성을 다시 맞춰야 한다.
 */
public enum SkinMetricType {
    TROUBLE,
    REDNESS,
    MOISTURE_OIL
}

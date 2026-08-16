package com.ildangbaek.backend.domain.user.entity;

/**
 * docs/ERD.md UserProfile.menstrual_status 기준(월경 중 / 폐경 / 해당 없음).
 * api_명세서.md의 HormoneStatus(MENSTRUATING/HORMONE_PILL/HORMONE_INJECTION/MENOPAUSE)와
 * 값 구성이 달라 PRD 14장 "호르몬 정보 활용" 확정 시 재정렬이 필요하다.
 */
public enum MenstrualStatus {
    MENSTRUATING,
    MENOPAUSE,
    NONE
}

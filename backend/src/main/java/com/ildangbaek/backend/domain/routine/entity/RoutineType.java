package com.ildangbaek.backend.domain.routine.entity;

/**
 * docs/api_명세서.md 6.3 RoutineType. 값 문자열은 record 도메인 TimeSlot과 같지만
 * 서로 다른 Enum이므로(HomeType.NIGHT vs TimeSlot.NIGHT 주의사항과 동일 원칙) 공유하지 않는다.
 */
public enum RoutineType {
    MORNING,
    NIGHT
}

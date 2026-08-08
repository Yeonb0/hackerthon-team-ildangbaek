package com.ildangbaek.backend.domain.analysis.entity;

/**
 * docs/ERD.md 9장 IngredientProfile.reaction_type 및 11장 ProductRiskIngredient.reaction_type이
 * 공유하는 성분 반응 상태(PRD 8.5 "분석 결과 재사용" 참고). check 도메인에서도 이 타입을 그대로 사용한다.
 * docs/공통응답포맷_예외처리코드.md 6.4 IngredientStatus는 GOOD 표기를 쓰므로 확정 시 라벨을 맞춘다.
 */
public enum ReactionType {
    SUITABLE,
    CAUTION,
    INSUFFICIENT
}

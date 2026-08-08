package com.ildangbaek.backend.domain.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 3장 SkinType. 피부 타입 공통 마스터 데이터(OILY/DRY/SENSITIVE/UNKNOWN).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "skin_types")
public class SkinType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 30)
    private SkinTypeCode code;

    @Column(nullable = false, length = 30)
    private String name;

    @Column(length = 300)
    private String description;

    @Builder
    private SkinType(SkinTypeCode code, String name, String description) {
        this.code = code;
        this.name = name;
        this.description = description;
    }
}

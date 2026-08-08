package com.ildangbaek.backend.domain.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 4장 Ingredient. 화장품 성분 정보.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "ingredients")
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "korean_name", nullable = false, length = 150)
    private String koreanName;

    @Column(name = "english_name", length = 150)
    private String englishName;

    @Column(name = "inci_name", length = 200)
    private String inciName;

    @Column(name = "function_category", length = 100)
    private String functionCategory;

    @Lob
    private String description;

    @Builder
    private Ingredient(String koreanName, String englishName, String inciName,
                        String functionCategory, String description) {
        this.koreanName = koreanName;
        this.englishName = englishName;
        this.inciName = inciName;
        this.functionCategory = functionCategory;
        this.description = description;
    }
}

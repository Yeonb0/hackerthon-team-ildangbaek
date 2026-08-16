package com.ildangbaek.backend.domain.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 4장 ProductIngredient. 제품과 성분의 N:M 연결.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "product_ingredients",
        uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "ingredient_id"})
)
public class ProductIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "concentration_text", length = 50)
    private String concentrationText;

    @Column(name = "key_ingredient", nullable = false)
    private boolean keyIngredient;

    @Builder
    private ProductIngredient(Product product, Ingredient ingredient, Integer displayOrder,
                               String concentrationText, boolean keyIngredient) {
        this.product = product;
        this.ingredient = ingredient;
        this.displayOrder = displayOrder;
        this.concentrationText = concentrationText;
        this.keyIngredient = keyIngredient;
    }
}

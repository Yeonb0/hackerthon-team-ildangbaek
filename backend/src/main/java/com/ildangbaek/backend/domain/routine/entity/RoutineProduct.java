package com.ildangbaek.backend.domain.routine.entity;

import com.ildangbaek.backend.domain.product.entity.UserProduct;
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
 * docs/ERD.md 5장 RoutineProduct. 루틴에 포함된 제품과 사용 순서.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "routine_products",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"routine_id", "user_product_id"}),
                @UniqueConstraint(columnNames = {"routine_id", "sequence_order"})
        }
)
public class RoutineProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "routine_id", nullable = false)
    private Routine routine;

    @ManyToOne
    @JoinColumn(name = "user_product_id", nullable = false)
    private UserProduct userProduct;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Builder
    private RoutineProduct(Routine routine, UserProduct userProduct, Integer sequenceOrder) {
        this.routine = routine;
        this.userProduct = userProduct;
        this.sequenceOrder = sequenceOrder;
    }
}

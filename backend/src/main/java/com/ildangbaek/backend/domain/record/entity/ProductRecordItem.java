package com.ildangbaek.backend.domain.record.entity;

import com.ildangbaek.backend.domain.product.entity.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 6장 ProductRecordItem. 하나의 제품 기록에 포함된 개별 제품.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "product_record_items",
        uniqueConstraints = @UniqueConstraint(columnNames = {"product_record_id", "product_id"})
)
public class ProductRecordItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_record_id", nullable = false)
    private ProductRecord productRecord;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "usage_order")
    private Integer usageOrder;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Builder
    private ProductRecordItem(ProductRecord productRecord, Product product, Integer usageOrder,
                               LocalDateTime usedAt) {
        this.productRecord = productRecord;
        this.product = product;
        this.usageOrder = usageOrder;
        this.usedAt = usedAt;
    }
}

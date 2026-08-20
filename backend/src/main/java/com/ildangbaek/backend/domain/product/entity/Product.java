package com.ildangbaek.backend.domain.product.entity;

import com.ildangbaek.backend.global.entity.BaseTimeEntity;
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
 * docs/ERD.md 4장 Product. 화장품 기본 정보(F-PRODUCT-02, 03, 04).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "products")
public class Product extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_name", length = 100)
    private String brandName;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ProductCategory category;

    @Column(unique = true, length = 100)
    private String barcode;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_source", nullable = false, length = 30)
    private ProductDataSource dataSource;

    @Column(nullable = false)
    private boolean active;

    @Builder
    private Product(String brandName, String productName, ProductCategory category, String barcode,
                     String imageUrl, ProductDataSource dataSource) {
        this.brandName = brandName;
        this.productName = productName;
        this.category = category;
        this.barcode = barcode;
        this.imageUrl = imageUrl;
        this.dataSource = dataSource;
        this.active = true;
    }

    public void updateSampleInfo(String brandName, String productName, ProductCategory category, String imageUrl) {
        this.brandName = brandName;
        this.productName = productName;
        this.category = category;
        this.imageUrl = imageUrl;
        this.dataSource = ProductDataSource.SAMPLE;
        this.active = true;
    }
}

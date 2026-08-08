package com.ildangbaek.backend.domain.product.entity;

import com.ildangbaek.backend.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * docs/ERD.md 4장 UserProduct. 사용자가 저장한 제품(F-PRODUCT-05).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "user_products",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "product_id"})
)
public class UserProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_status", nullable = false, length = 20)
    private UsageStatus usageStatus;

    @Column(name = "first_saved_at", nullable = false)
    private LocalDateTime firstSavedAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Builder
    private UserProduct(User user, Product product) {
        this.user = user;
        this.product = product;
        this.usageStatus = UsageStatus.USING;
        this.firstSavedAt = LocalDateTime.now();
    }

    public void markUsedNow() {
        this.lastUsedAt = LocalDateTime.now();
    }

    public void stopUsing() {
        this.usageStatus = UsageStatus.STOPPED;
    }
}

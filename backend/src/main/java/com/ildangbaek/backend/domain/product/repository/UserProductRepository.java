package com.ildangbaek.backend.domain.product.repository;

import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.entity.UsageStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProductRepository extends JpaRepository<UserProduct, Long> {

    List<UserProduct> findAllByUserIdOrderByLastUsedAtDesc(Long userId);

    List<UserProduct> findAllByUserIdAndUsageStatusOrderByLastUsedAtDesc(
            Long userId,
            UsageStatus usageStatus
    );

    Optional<UserProduct> findByUserIdAndProductId(Long userId, Long productId);

    boolean existsByUserIdAndProductIdAndUsageStatus(Long userId, Long productId, UsageStatus usageStatus);
}

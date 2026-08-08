package com.ildangbaek.backend.domain.product.repository;

import com.ildangbaek.backend.domain.product.entity.UserProduct;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProductRepository extends JpaRepository<UserProduct, Long> {

    List<UserProduct> findAllByUserIdOrderByLastUsedAtDesc(Long userId);

    Optional<UserProduct> findByUserIdAndProductId(Long userId, Long productId);
}

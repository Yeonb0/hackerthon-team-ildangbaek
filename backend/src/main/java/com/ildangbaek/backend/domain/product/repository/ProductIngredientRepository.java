package com.ildangbaek.backend.domain.product.repository;

import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductIngredientRepository extends JpaRepository<ProductIngredient, Long> {

    List<ProductIngredient> findAllByProductIdOrderByDisplayOrderAsc(Long productId);
}

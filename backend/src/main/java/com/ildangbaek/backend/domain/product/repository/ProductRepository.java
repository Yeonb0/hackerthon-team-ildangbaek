package com.ildangbaek.backend.domain.product.repository;

import com.ildangbaek.backend.domain.product.entity.Product;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByBarcode(String barcode);

    Optional<Product> findFirstByActiveTrueOrderByIdAsc();

    List<Product> findTop20ByProductNameContainingIgnoreCaseAndActiveTrue(String keyword);

    boolean existsByBarcode(String barcode);
}

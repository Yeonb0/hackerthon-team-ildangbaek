package com.ildangbaek.backend.domain.check.repository;

import com.ildangbaek.backend.domain.check.entity.ProductRiskIngredient;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRiskIngredientRepository extends JpaRepository<ProductRiskIngredient, Long> {

    List<ProductRiskIngredient> findAllByAssessmentId(Long assessmentId);
}

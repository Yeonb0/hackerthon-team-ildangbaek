package com.ildangbaek.backend.domain.product.repository;

import com.ildangbaek.backend.domain.product.entity.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
}

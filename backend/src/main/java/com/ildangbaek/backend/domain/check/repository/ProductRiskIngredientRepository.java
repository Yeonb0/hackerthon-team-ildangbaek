package com.ildangbaek.backend.domain.check.repository;

import com.ildangbaek.backend.domain.check.entity.ProductRiskIngredient;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRiskIngredientRepository extends JpaRepository<ProductRiskIngredient, Long> {

    List<ProductRiskIngredient> findAllByAssessmentId(Long assessmentId);

    /**
     * CHECK-03이 CHECK-02와 같은 배열을 재현하려면 저장 순서(= 제품 표시 순서, id 오름차순)를
     * 그대로 읽어야 한다. {@code ingredient}를 fetch join해 성분명 접근에 N+1이 붙지 않게 한다.
     */
    @Query("select ri from ProductRiskIngredient ri join fetch ri.ingredient "
            + "where ri.assessment.id = :assessmentId order by ri.id asc")
    List<ProductRiskIngredient> findAllByAssessmentIdWithIngredient(@Param("assessmentId") Long assessmentId);
}

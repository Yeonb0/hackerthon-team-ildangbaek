package com.ildangbaek.backend.domain.check.repository;

import com.ildangbaek.backend.domain.check.entity.ProductRiskAssessment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRiskAssessmentRepository extends JpaRepository<ProductRiskAssessment, Long> {

    List<ProductRiskAssessment> findAllByUserIdOrderByAssessedAtDesc(Long userId);
}

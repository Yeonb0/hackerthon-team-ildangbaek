package com.ildangbaek.backend.domain.check.repository;

import com.ildangbaek.backend.domain.check.entity.ProductRiskAssessment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRiskAssessmentRepository extends JpaRepository<ProductRiskAssessment, Long> {

    List<ProductRiskAssessment> findAllByUserIdOrderByAssessedAtDesc(Long userId);

    /**
     * CHECK-03의 소유자 검증. 조건을 쿼리에 넣어 다른 사용자의 평가는 애초에 조회되지 않게 한다 —
     * 존재 여부를 알리지 않고 404로 응답한다(REPORT-02와 같은 규칙). {@code product}를 fetch join해
     * {@code productName} 접근에 추가 쿼리가 붙지 않게 한다.
     */
    @Query("select a from ProductRiskAssessment a join fetch a.product "
            + "where a.id = :id and a.user.id = :userId")
    Optional<ProductRiskAssessment> findByIdAndUserIdWithProduct(@Param("id") Long id, @Param("userId") Long userId);
}

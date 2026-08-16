package com.ildangbaek.backend.domain.routine.repository;

import com.ildangbaek.backend.domain.routine.entity.RoutineProduct;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoutineProductRepository extends JpaRepository<RoutineProduct, Long> {

    List<RoutineProduct> findAllByRoutineIdOrderBySequenceOrderAsc(Long routineId);

    /**
     * 루틴 목록 화면(RoutineService.getRoutines)에서 루틴마다 따로 조회하면 N+1이 나서,
     * routineId 목록을 한 번에 받아 관련 UserProduct·Product까지 fetch join으로 묶어 온다.
     */
    @Query("""
            SELECT rp FROM RoutineProduct rp
            JOIN FETCH rp.userProduct up
            JOIN FETCH up.product
            WHERE rp.routine.id IN :routineIds
            ORDER BY rp.routine.id ASC, rp.sequenceOrder ASC
            """)
    List<RoutineProduct> findAllByRoutineIdInOrderBySequenceOrderAsc(@Param("routineIds") List<Long> routineIds);
}

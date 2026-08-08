package com.ildangbaek.backend.domain.routine.repository;

import com.ildangbaek.backend.domain.routine.entity.RoutineProduct;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutineProductRepository extends JpaRepository<RoutineProduct, Long> {

    List<RoutineProduct> findAllByRoutineIdOrderBySequenceOrderAsc(Long routineId);
}

package com.ildangbaek.backend.domain.routine.repository;

import com.ildangbaek.backend.domain.routine.entity.Routine;
import com.ildangbaek.backend.domain.routine.entity.RoutineType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutineRepository extends JpaRepository<Routine, Long> {

    List<Routine> findAllByUserIdAndActiveTrue(Long userId);

    Optional<Routine> findByUserIdAndTimePeriod(Long userId, RoutineType timePeriod);
}

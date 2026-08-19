package com.ildangbaek.backend.api.routine.service;

import com.ildangbaek.backend.domain.routine.entity.Routine;
import com.ildangbaek.backend.domain.routine.entity.RoutineType;
import com.ildangbaek.backend.domain.routine.repository.RoutineRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DefaultRoutineService {

    private static final String MORNING_ROUTINE_NAME = "모닝 루틴";
    private static final String NIGHT_ROUTINE_NAME = "나이트 루틴";

    private final RoutineRepository routineRepository;

    @Transactional
    public void ensureDefaultRoutines(User user) {
        ensureDefaultRoutine(user, RoutineType.MORNING, MORNING_ROUTINE_NAME);
        ensureDefaultRoutine(user, RoutineType.NIGHT, NIGHT_ROUTINE_NAME);
    }

    private void ensureDefaultRoutine(User user, RoutineType timePeriod, String routineName) {
        routineRepository.findByUserIdAndTimePeriod(user.getId(), timePeriod)
                .ifPresentOrElse(Routine::activate, () -> routineRepository.save(Routine.builder()
                        .user(user)
                        .routineName(routineName)
                        .timePeriod(timePeriod)
                        .build()));
    }
}

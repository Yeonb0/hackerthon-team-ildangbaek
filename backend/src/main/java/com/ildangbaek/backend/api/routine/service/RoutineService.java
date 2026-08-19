package com.ildangbaek.backend.api.routine.service;

import com.ildangbaek.backend.api.productrecord.dto.response.SaveProductRecordResponse;
import com.ildangbaek.backend.api.productrecord.service.ProductRecordService;
import com.ildangbaek.backend.api.routine.dto.request.RoutineQuickRecordRequest;
import com.ildangbaek.backend.api.routine.dto.response.RoutineProductResponse;
import com.ildangbaek.backend.api.routine.dto.response.RoutineQuickRecordResponse;
import com.ildangbaek.backend.api.routine.dto.response.RoutineResponse;
import com.ildangbaek.backend.domain.record.entity.SourceType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.routine.entity.Routine;
import com.ildangbaek.backend.domain.routine.entity.RoutineProduct;
import com.ildangbaek.backend.domain.routine.repository.RoutineProductRepository;
import com.ildangbaek.backend.domain.routine.repository.RoutineRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RoutineService {

    private final RoutineRepository routineRepository;
    private final RoutineProductRepository routineProductRepository;
    private final ProductRecordService productRecordService;
    private final DefaultRoutineService defaultRoutineService;

    @Transactional
    public List<RoutineResponse> getRoutines(User user, TimeSlot timeSlot) {
        defaultRoutineService.ensureDefaultRoutines(user);
        List<Routine> routines = routineRepository.findAllByUserIdAndActiveTrue(user.getId()).stream()
                .filter(routine -> timeSlot == null || routine.getTimePeriod().name().equals(timeSlot.name()))
                .toList();
        if (routines.isEmpty()) {
            return List.of();
        }

        List<Long> routineIds = routines.stream().map(Routine::getId).toList();
        Map<Long, List<RoutineProduct>> productsByRoutineId = routineProductRepository
                .findAllByRoutineIdInOrderBySequenceOrderAsc(routineIds).stream()
                .collect(Collectors.groupingBy(routineProduct -> routineProduct.getRoutine().getId()));

        return routines.stream()
                .map(routine -> toResponse(routine, productsByRoutineId.getOrDefault(routine.getId(), List.of())))
                .toList();
    }

    @Transactional
    public RoutineQuickRecordResponse quickRecord(User user, Long routineId, RoutineQuickRecordRequest request) {
        Routine routine = routineRepository.findById(routineId)
                .filter(found -> found.getUser().getId().equals(user.getId()))
                .filter(Routine::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROUTINE_NOT_FOUND));
        if (!routine.getTimePeriod().name().equals(request.timeSlot().name())) {
            throw new BusinessException(ErrorCode.ROUTINE_TIME_SLOT_MISMATCH);
        }

        List<Long> productIds = routineProductRepository.findAllByRoutineIdOrderBySequenceOrderAsc(routineId).stream()
                .map(routineProduct -> routineProduct.getUserProduct().getProduct().getId())
                .toList();
        if (productIds.isEmpty()) {
            throw new BusinessException(ErrorCode.ROUTINE_EMPTY);
        }

        SaveProductRecordResponse saved = productRecordService.saveProducts(
                user,
                request.timeSlot(),
                productIds,
                request.forceEnabled(),
                SourceType.ROUTINE
        );
        return new RoutineQuickRecordResponse(
                saved.recordId(),
                saved.timeSlot(),
                saved.productCount(),
                List.of(),
                saved.skinRecordSuggested()
        );
    }

    private RoutineResponse toResponse(Routine routine, List<RoutineProduct> routineProducts) {
        List<RoutineProductResponse> products = routineProducts.stream()
                .map(this::toProductResponse)
                .toList();
        return new RoutineResponse(
                routine.getId(),
                routine.getRoutineName(),
                TimeSlot.valueOf(routine.getTimePeriod().name()),
                products.size(),
                products
        );
    }

    private RoutineProductResponse toProductResponse(RoutineProduct routineProduct) {
        return new RoutineProductResponse(
                routineProduct.getUserProduct().getProduct().getId(),
                routineProduct.getUserProduct().getProduct().getProductName()
        );
    }
}

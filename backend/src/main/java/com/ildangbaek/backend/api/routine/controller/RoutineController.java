package com.ildangbaek.backend.api.routine.controller;

import com.ildangbaek.backend.api.auth.service.CurrentUserResolver;
import com.ildangbaek.backend.api.routine.dto.request.RoutineQuickRecordRequest;
import com.ildangbaek.backend.api.routine.dto.response.RoutineQuickRecordResponse;
import com.ildangbaek.backend.api.routine.dto.response.RoutineResponse;
import com.ildangbaek.backend.api.routine.service.RoutineService;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/routines")
public class RoutineController {

    private final CurrentUserResolver currentUserResolver;
    private final RoutineService routineService;

    @GetMapping
    public ApiResponse<List<RoutineResponse>> getRoutines(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) TimeSlot timeSlot
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(routineService.getRoutines(user, timeSlot));
    }

    @PostMapping("/{routineId}/records")
    public ApiResponse<RoutineQuickRecordResponse> quickRecord(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long routineId,
            @Valid @RequestBody RoutineQuickRecordRequest request
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(routineService.quickRecord(user, routineId, request));
    }
}

package com.ildangbaek.backend.api.common.controller;

import com.ildangbaek.backend.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 서버 기동과 공통 응답 envelope 배선을 확인하기 위한 헬스체크.
 * 이후 도메인 컨트롤러는 이 패키지와 나란히 com.ildangbaek.backend.api.{domain}.controller에 추가한다.
 */
@RestController
public class HealthController {

    @GetMapping("/api/v1/health")
    public ApiResponse<String> health() {
        return ApiResponse.success("ok");
    }
}

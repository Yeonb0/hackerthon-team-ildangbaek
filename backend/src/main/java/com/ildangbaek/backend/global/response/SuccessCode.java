package com.ildangbaek.backend.global.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum SuccessCode implements ResultCode {

    OK(HttpStatus.OK, "COMMON_SUCCESS", "요청에 성공했습니다."),
    CREATED(HttpStatus.CREATED, "COMMON_CREATED", "생성에 성공했습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}

package com.ildangbaek.backend.global.response;

import org.springframework.http.HttpStatus;

public interface ResultCode {

    HttpStatus getHttpStatus();

    String getCode();

    String getMessage();
}

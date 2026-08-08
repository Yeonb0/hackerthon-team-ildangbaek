package com.ildangbaek.backend.global.exception;

import com.ildangbaek.backend.global.response.ResultCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * docs/공통응답포맷_예외처리코드.md 5장(Exception Code) 전체를 그대로 옮긴 에러 코드 목록.
 * 새 도메인 예외가 필요하면 문서를 먼저 갱신한 뒤 이곳에 상수를 추가한다.
 */
@Getter
@AllArgsConstructor
public enum ErrorCode implements ResultCode {

    // COMMON
    COMMON_BAD_REQUEST(HttpStatus.BAD_REQUEST, "COMMON_BAD_REQUEST", "잘못된 요청입니다."),
    COMMON_UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "COMMON_UNAUTHORIZED", "인증이 필요합니다."),
    COMMON_FORBIDDEN(HttpStatus.FORBIDDEN, "COMMON_FORBIDDEN", "접근 권한이 없습니다."),
    COMMON_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON_NOT_FOUND", "요청한 정보를 찾을 수 없습니다."),
    COMMON_CONFLICT(HttpStatus.CONFLICT, "COMMON_CONFLICT", "요청을 처리할 수 없습니다."),
    COMMON_VALIDATION_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "COMMON_VALIDATION_FAILED", "입력값이 올바르지 않습니다."),
    COMMON_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_SERVER_ERROR", "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."),
    COMMON_EXTERNAL_API_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "COMMON_EXTERNAL_API_ERROR", "외부 서비스 오류입니다."),
    COMMON_EXTERNAL_API_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "COMMON_EXTERNAL_API_TIMEOUT", "응답이 지연되고 있어요. 잠시 후 다시 시도해주세요."),
    COMMON_DUPLICATE_REQUEST(HttpStatus.CONFLICT, "COMMON_DUPLICATE_REQUEST", "이미 처리 중인 요청이에요."),

    // AUTH
    AUTH_LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "AUTH_LOGIN_FAILED", "로그인에 실패했습니다."),
    AUTH_INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_INVALID_TOKEN", "유효하지 않은 토큰입니다."),
    AUTH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "AUTH_TOKEN_EXPIRED", "Access Token이 만료되었습니다."),
    AUTH_REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "AUTH_REFRESH_TOKEN_EXPIRED", "다시 로그인해주세요."),
    AUTH_UNSUPPORTED_PROVIDER(HttpStatus.BAD_REQUEST, "AUTH_UNSUPPORTED_PROVIDER", "지원하지 않는 로그인 방식입니다."),
    AUTH_USER_NOT_FOUND(HttpStatus.NOT_FOUND, "AUTH_USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),

    // USER
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자 정보를 찾을 수 없습니다."),
    USER_ALREADY_EXISTS(HttpStatus.CONFLICT, "USER_ALREADY_EXISTS", "이미 가입된 사용자입니다."),
    USER_INVALID_PROFILE(HttpStatus.UNPROCESSABLE_ENTITY, "USER_INVALID_PROFILE", "사용자 정보가 올바르지 않습니다."),
    USER_LOCATION_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_LOCATION_NOT_FOUND", "선택한 지역을 찾을 수 없습니다."),

    // ONBOARD
    ONBOARD_NOT_COMPLETED(HttpStatus.FORBIDDEN, "ONBOARD_NOT_COMPLETED", "온보딩을 먼저 완료해주세요."),
    ONBOARD_ALREADY_COMPLETED(HttpStatus.CONFLICT, "ONBOARD_ALREADY_COMPLETED", "이미 온보딩을 완료했습니다."),
    ONBOARD_STEP_NOT_ALLOWED(HttpStatus.FORBIDDEN, "ONBOARD_STEP_NOT_ALLOWED", "현재 진행할 수 없는 단계입니다."),
    ONBOARD_SKIN_TYPE_REQUIRED(HttpStatus.UNPROCESSABLE_ENTITY, "ONBOARD_SKIN_TYPE_REQUIRED", "피부 타입을 1개 이상 선택해주세요."),
    ONBOARD_SKIN_TYPE_CONFLICT(HttpStatus.UNPROCESSABLE_ENTITY, "ONBOARD_SKIN_TYPE_CONFLICT", "'모르겠음'은 다른 피부 타입과 함께 선택할 수 없어요."),
    ONBOARD_HORMONE_NOT_APPLICABLE(HttpStatus.FORBIDDEN, "ONBOARD_HORMONE_NOT_APPLICABLE", "해당 정보를 입력할 수 없는 사용자입니다."),

    // WEATHER
    WEATHER_LOCATION_REQUIRED(HttpStatus.BAD_REQUEST, "WEATHER_LOCATION_REQUIRED", "위치 정보가 필요합니다."),
    WEATHER_LOCATION_NOT_FOUND(HttpStatus.NOT_FOUND, "WEATHER_LOCATION_NOT_FOUND", "위치 정보를 찾을 수 없습니다."),
    WEATHER_API_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "WEATHER_API_FAILED", "날씨 정보를 불러오지 못했어요."),
    WEATHER_UV_API_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "WEATHER_UV_API_FAILED", "자외선 정보를 불러오지 못했어요."),

    // RECORD
    RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "RECORD_NOT_FOUND", "기록을 찾을 수 없습니다."),
    RECORD_INVALID_TIME_SLOT(HttpStatus.BAD_REQUEST, "RECORD_INVALID_TIME_SLOT", "올바르지 않은 시간대입니다."),
    RECORD_INVALID_MONTH(HttpStatus.UNPROCESSABLE_ENTITY, "RECORD_INVALID_MONTH", "조회할 수 없는 기간입니다."),
    RECORD_FUTURE_DATE_NOT_ALLOWED(HttpStatus.UNPROCESSABLE_ENTITY, "RECORD_FUTURE_DATE_NOT_ALLOWED", "미래 날짜는 기록할 수 없어요."),

    // PRODUCT
    PRODUCT_NOT_FOUND(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "제품 정보를 찾을 수 없습니다."),
    PRODUCT_INGREDIENT_NOT_FOUND(HttpStatus.NOT_FOUND, "PRODUCT_INGREDIENT_NOT_FOUND", "성분 정보를 찾을 수 없습니다."),
    PRODUCT_ALREADY_SAVED(HttpStatus.CONFLICT, "PRODUCT_ALREADY_SAVED", "이미 저장된 제품입니다."),
    PRODUCT_INVALID_KEYWORD(HttpStatus.UNPROCESSABLE_ENTITY, "PRODUCT_INVALID_KEYWORD", "검색어를 1자 이상 50자 이하로 입력해주세요."),

    // PRODUCT_RECORD
    PRODUCT_RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "PRODUCT_RECORD_NOT_FOUND", "제품 기록을 찾을 수 없습니다."),
    PRODUCT_ALREADY_RECORDED_IN_SLOT(HttpStatus.CONFLICT, "PRODUCT_ALREADY_RECORDED_IN_SLOT", "이미 이 시간대에 기록한 제품이에요."),
    PRODUCT_RECORD_EMPTY(HttpStatus.UNPROCESSABLE_ENTITY, "PRODUCT_RECORD_EMPTY", "기록할 제품을 1개 이상 선택해주세요."),
    PRODUCT_RECORD_LIMIT_EXCEEDED(HttpStatus.UNPROCESSABLE_ENTITY, "PRODUCT_RECORD_LIMIT_EXCEEDED", "한 번에 최대 30개까지 기록할 수 있어요."),
    PRODUCT_RECORD_NOT_EDITABLE(HttpStatus.FORBIDDEN, "PRODUCT_RECORD_NOT_EDITABLE", "오늘 기록만 수정할 수 있어요."),
    PRODUCT_RECORD_SAVE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "PRODUCT_RECORD_SAVE_FAILED", "제품 기록 저장에 실패했습니다."),

    // ROUTINE
    ROUTINE_NOT_FOUND(HttpStatus.NOT_FOUND, "ROUTINE_NOT_FOUND", "루틴을 찾을 수 없습니다."),
    ROUTINE_EMPTY(HttpStatus.CONFLICT, "ROUTINE_EMPTY", "루틴에 등록된 제품이 없어요."),
    ROUTINE_TIME_SLOT_MISMATCH(HttpStatus.CONFLICT, "ROUTINE_TIME_SLOT_MISMATCH", "이 루틴은 다른 시간대의 루틴이에요."),
    ROUTINE_PRODUCT_PARTIALLY_MISSING(HttpStatus.CONFLICT, "ROUTINE_PRODUCT_PARTIALLY_MISSING", "루틴에 포함된 일부 제품을 찾을 수 없어요."),

    // SCAN
    SCAN_PRODUCT_NOT_DETECTED(HttpStatus.NOT_FOUND, "SCAN_PRODUCT_NOT_DETECTED", "제품을 인식하지 못했어요."),
    SCAN_LOW_IMAGE_QUALITY(HttpStatus.UNPROCESSABLE_ENTITY, "SCAN_LOW_IMAGE_QUALITY", "다시 촬영해주세요."),
    SCAN_UNSUPPORTED_MODE(HttpStatus.BAD_REQUEST, "SCAN_UNSUPPORTED_MODE", "지원하지 않는 스캔 방식입니다."),
    SCAN_SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "SCAN_SERVICE_UNAVAILABLE", "스캔 서비스를 사용할 수 없어요."),

    // SKIN
    SKIN_RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "SKIN_RECORD_NOT_FOUND", "피부 기록을 찾을 수 없습니다."),
    SKIN_ALREADY_RECORDED_IN_SLOT(HttpStatus.CONFLICT, "SKIN_ALREADY_RECORDED_IN_SLOT", "이미 이 시간대에 피부를 기록했어요."),
    SKIN_FACE_NOT_DETECTED(HttpStatus.UNPROCESSABLE_ENTITY, "SKIN_FACE_NOT_DETECTED", "얼굴을 인식하지 못했어요."),
    SKIN_IMAGE_INVALID_FORMAT(HttpStatus.UNPROCESSABLE_ENTITY, "SKIN_IMAGE_INVALID_FORMAT", "jpg, jpeg, png 형식만 업로드할 수 있어요."),
    SKIN_IMAGE_TOO_LARGE(HttpStatus.UNPROCESSABLE_ENTITY, "SKIN_IMAGE_TOO_LARGE", "이미지 크기는 10MB 이하여야 해요."),
    SKIN_IMAGE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "SKIN_IMAGE_UPLOAD_FAILED", "이미지 업로드에 실패했습니다."),
    SKIN_ANALYSIS_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "SKIN_ANALYSIS_FAILED", "피부 분석에 실패했습니다."),
    SKIN_ANALYSIS_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "SKIN_ANALYSIS_TIMEOUT", "분석이 지연되고 있어요. 잠시 후 다시 시도해주세요."),

    // ANALYSIS
    ANALYSIS_DATA_INSUFFICIENT(HttpStatus.CONFLICT, "ANALYSIS_DATA_INSUFFICIENT", "분석할 데이터가 아직 부족해요."),
    ANALYSIS_PROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "ANALYSIS_PROFILE_NOT_FOUND", "프로파일을 찾을 수 없습니다."),
    ANALYSIS_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "ANALYSIS_GENERATION_FAILED", "분석 생성에 실패했습니다."),

    // CHECK
    CHECK_NOT_FOUND(HttpStatus.NOT_FOUND, "CHECK_NOT_FOUND", "확인 결과를 찾을 수 없습니다."),
    CHECK_PRODUCT_NOT_FOUND(HttpStatus.NOT_FOUND, "CHECK_PRODUCT_NOT_FOUND", "제품 정보를 찾을 수 없습니다."),
    CHECK_PROFILE_NOT_READY(HttpStatus.CONFLICT, "CHECK_PROFILE_NOT_READY", "아직 판단할 데이터가 부족해요."),
    CHECK_INGREDIENT_DATA_INSUFFICIENT(HttpStatus.CONFLICT, "CHECK_INGREDIENT_DATA_INSUFFICIENT", "확인할 수 없는 성분이 포함되어 있어요."),
    CHECK_CALCULATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "CHECK_CALCULATION_FAILED", "위험도 계산에 실패했습니다."),

    // REPORT
    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "REPORT_NOT_FOUND", "리포트를 찾을 수 없습니다."),
    REPORT_INVALID_PERIOD(HttpStatus.UNPROCESSABLE_ENTITY, "REPORT_INVALID_PERIOD", "조회 기간은 7일 또는 30일만 선택할 수 있어요."),
    REPORT_DATA_INSUFFICIENT(HttpStatus.CONFLICT, "REPORT_DATA_INSUFFICIENT", "리포트를 만들 데이터가 부족해요."),
    REPORT_INSIGHT_NOT_FOUND(HttpStatus.NOT_FOUND, "REPORT_INSIGHT_NOT_FOUND", "요인 정보를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}

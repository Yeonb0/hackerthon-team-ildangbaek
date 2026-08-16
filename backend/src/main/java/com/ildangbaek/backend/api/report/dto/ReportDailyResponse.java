package com.ildangbaek.backend.api.report.dto;

import com.ildangbaek.backend.api.skin.dto.SkinRecordResponse;
import java.time.LocalDate;
import java.util.List;

/**
 * REPORT-03 · 일자별 리포트 조회 응답.
 *
 * <p>{@code records}는 SKIN-01/02/03과 같은 {@link SkinRecordResponse} 구조다. 하루 2건(모닝·나이트)을
 * 대표값으로 접지 않고 각각 원소로 싣는다 — REPORT-01의 그래프와 같은 원칙이다 (ADR 0012).
 *
 * <p>기록이 없으면 빈 배열이다. 오류가 아니다 — 캘린더에서 임의 날짜를 여는 화면이라
 * "그날은 기록이 없다"가 정상 상태다.
 *
 * @param date    조회한 날짜. 요청한 값을 그대로 돌려준다.
 * @param records 모닝 → 나이트 순. {@code timeSlot}을 지정하면 해당 슬롯만 담긴다.
 */
public record ReportDailyResponse(
        LocalDate date,
        List<SkinRecordResponse> records
) {
}

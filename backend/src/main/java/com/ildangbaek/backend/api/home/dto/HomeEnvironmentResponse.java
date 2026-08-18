package com.ildangbaek.backend.api.home.dto;

import com.ildangbaek.backend.domain.environment.entity.HumidityGrade;
import com.ildangbaek.backend.domain.environment.entity.WeatherCondition;

public record HomeEnvironmentResponse(
        String location,
        WeatherCondition weather,
        int temperature,
        int uvIndex,
        UvGrade uvGrade,
        int humidity,
        HumidityGrade humidityGrade
) {
}

package com.ildangbaek.backend.domain.environment.service;

import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class KmaAreaNoResolver {

    private static final Map<String, String> AREA_NO_BY_REGION = Map.ofEntries(
            Map.entry("서울", "1100000000"),
            Map.entry("부산", "2600000000"),
            Map.entry("대구", "2700000000"),
            Map.entry("인천", "2800000000"),
            Map.entry("광주", "2900000000"),
            Map.entry("대전", "3000000000"),
            Map.entry("울산", "3100000000"),
            Map.entry("세종", "3600000000"),
            Map.entry("경기", "4100000000"),
            Map.entry("강원", "5100000000"),
            Map.entry("충북", "4300000000"),
            Map.entry("충남", "4400000000"),
            Map.entry("전북", "5200000000"),
            Map.entry("전남", "4600000000"),
            Map.entry("경북", "4700000000"),
            Map.entry("경남", "4800000000"),
            Map.entry("제주", "5000000000")
    );

    public String resolve(String regionName) {
        if (regionName == null || regionName.isBlank()) {
            return null;
        }
        String firstDepth = regionName.trim().split("\\s+")[0];
        return AREA_NO_BY_REGION.get(firstDepth);
    }
}

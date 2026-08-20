package com.ildangbaek.backend.api.home.service;

import com.ildangbaek.backend.api.home.dto.FailedSectionResponse;
import com.ildangbaek.backend.api.home.dto.HomeEnvironmentResponse;
import com.ildangbaek.backend.api.home.dto.HomeResponse;
import com.ildangbaek.backend.api.home.dto.HomeType;
import com.ildangbaek.backend.api.home.dto.RoutineRecommendationItemResponse;
import com.ildangbaek.backend.api.home.dto.RoutineRecommendationResponse;
import com.ildangbaek.backend.api.home.dto.TodayRecordResponse;
import com.ildangbaek.backend.api.home.dto.TodayRecordSlotResponse;
import com.ildangbaek.backend.api.home.dto.TodayReportResponse;
import com.ildangbaek.backend.api.home.dto.UvGrade;
import com.ildangbaek.backend.api.home.dto.WeeklyCalendarDayResponse;
import com.ildangbaek.backend.api.record.dto.RecordCalendarResponse;
import com.ildangbaek.backend.api.record.dto.RecordTodayResponse;
import com.ildangbaek.backend.api.record.dto.TimeSlotRecordStateResponse;
import com.ildangbaek.backend.api.record.service.RecordHubService;
import com.ildangbaek.backend.domain.environment.client.KmaWeatherClient;
import com.ildangbaek.backend.domain.environment.client.KmaWeatherClient.WeatherSnapshot;
import com.ildangbaek.backend.domain.environment.client.KmaUvIndexClient;
import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import com.ildangbaek.backend.domain.environment.entity.EnvironmentDataSource;
import com.ildangbaek.backend.domain.environment.entity.HumidityGrade;
import com.ildangbaek.backend.domain.environment.entity.WeatherCondition;
import com.ildangbaek.backend.domain.environment.repository.DailyEnvironmentRepository;
import com.ildangbaek.backend.domain.environment.service.KmaAreaNoResolver;
import com.ildangbaek.backend.domain.product.entity.UsageStatus;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HomeService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final UserProfileRepository userProfileRepository;
    private final UserProductRepository userProductRepository;
    private final SkinRecordRepository skinRecordRepository;
    private final RecordHubService recordHubService;
    private final DailyEnvironmentRepository dailyEnvironmentRepository;
    private final UserRepository userRepository;
    private final KmaWeatherClient kmaWeatherClient;
    private final KmaUvIndexClient kmaUvIndexClient;
    private final KmaAreaNoResolver kmaAreaNoResolver;

    @Transactional
    public HomeResponse getHome(Long userId, HomeType requestedHomeType, DayOfWeek weekStart) {
        HomeType homeType = requestedHomeType == null ? defaultHomeType() : requestedHomeType;
        TimeSlot homeTimeSlot = homeType == HomeType.DAY ? TimeSlot.MORNING : TimeSlot.NIGHT;
        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
        RecordTodayResponse today = recordHubService.getToday(userId);

        return new HomeResponse(
                homeType,
                greeting(profile, homeType),
                homeType == HomeType.NIGHT ? "지금 기록하면 내일 분석이 더 정확해져요." : null,
                homeType == HomeType.DAY ? environment(userId, profile) : null,
                routineRecommendation(userId, homeTimeSlot),
                todayRecord(today),
                homeType == HomeType.NIGHT ? weeklyCalendar(userId, weekStart) : null,
                todayReport(userId, homeTimeSlot),
                List.of());
    }

    private HomeType defaultHomeType() {
        int hour = LocalTime.now(KST).getHour();
        return hour >= 6 && hour < 18 ? HomeType.DAY : HomeType.NIGHT;
    }

    private String greeting(UserProfile profile, HomeType homeType) {
        String name = profile == null || profile.getNickname() == null ? "사용자" : profile.getNickname();
        return homeType == HomeType.DAY ? "좋은 아침이에요, " + name + "님." : "좋은 저녁이에요, " + name + "님.";
    }

    private HomeEnvironmentResponse environment(Long userId, UserProfile profile) {
        DailyEnvironment environment = refreshEnvironment(userId, profile);
        String location = environment == null ? location(profile) : environment.getRegionName();
        WeatherCondition weather = environment == null || environment.getWeatherCondition() == null
                ? WeatherCondition.SUNNY
                : environment.getWeatherCondition();
        BigDecimal temperature = environment == null ? BigDecimal.valueOf(24) : environment.getTemperature();
        BigDecimal uvIndex = environment == null || environment.getUvIndexCurrent() == null
                ? BigDecimal.valueOf(5)
                : environment.getUvIndexCurrent();
        BigDecimal humidity = environment == null ? BigDecimal.valueOf(55) : environment.getHumidity();
        return new HomeEnvironmentResponse(
                location,
                weather,
                intValueOrDefault(temperature, 24),
                intValueOrDefault(uvIndex, 5),
                uvGrade(uvIndex),
                intValueOrDefault(humidity, 55),
                HumidityGrade.from(humidity == null ? BigDecimal.valueOf(55) : humidity));
    }

    private DailyEnvironment refreshEnvironment(Long userId, UserProfile profile) {
        LocalDate today = LocalDate.now();
        String location = location(profile);
        if (profile == null || profile.getLatitude() == null || profile.getLongitude() == null) {
            return dailyEnvironmentRepository.findByUserIdAndRecordDate(userId, today).orElse(null);
        }

        WeatherSnapshot snapshot = kmaWeatherClient
                .getCurrent(profile.getLatitude(), profile.getLongitude(), LocalDateTime.now())
                .orElse(null);
        if (snapshot == null) {
            return dailyEnvironmentRepository.findByUserIdAndRecordDate(userId, today).orElse(null);
        }

        BigDecimal fallbackUvIndex = dailyEnvironmentRepository.findByUserIdAndRecordDate(userId, today)
                .map(DailyEnvironment::getUvIndexCurrent)
                .orElse(BigDecimal.valueOf(5));
        BigDecimal uvIndex = kmaUvIndexClient.getCurrent(kmaAreaNoResolver.resolve(location), LocalDateTime.now())
                .orElse(fallbackUvIndex == null ? BigDecimal.valueOf(5) : fallbackUvIndex);

        DailyEnvironment environment = dailyEnvironmentRepository.findByUserIdAndRecordDate(userId, today)
                .orElseGet(() -> dailyEnvironmentRepository.save(DailyEnvironment.builder()
                        .user(userRepository.getReferenceById(userId))
                        .recordDate(today)
                        .regionName(location)
                        .weatherCondition(snapshot.weatherCondition())
                        .temperature(snapshot.temperature())
                        .humidity(snapshot.humidity())
                        .uvIndexCurrent(uvIndex)
                        .uvIndexMax(uvIndex)
                        .dataSource(EnvironmentDataSource.API)
                        .build()));
        environment.updateSnapshot(
                location,
                snapshot.weatherCondition(),
                snapshot.temperature(),
                snapshot.humidity(),
                uvIndex,
                uvIndex,
                EnvironmentDataSource.API);
        return environment;
    }

    private String location(UserProfile profile) {
        return profile == null ? null : profile.getRegionName();
    }

    private int intValueOrDefault(BigDecimal value, int defaultValue) {
        return value == null ? defaultValue : value.intValue();
    }

    private UvGrade uvGrade(BigDecimal uvIndex) {
        int value = intValueOrDefault(uvIndex, 5);
        if (value <= 2) {
            return UvGrade.LOW;
        }
        if (value <= 5) {
            return UvGrade.MODERATE;
        }
        if (value <= 7) {
            return UvGrade.HIGH;
        }
        if (value <= 10) {
            return UvGrade.VERY_HIGH;
        }
        return UvGrade.EXTREME;
    }

    private RoutineRecommendationResponse routineRecommendation(Long userId, TimeSlot timeSlot) {
        AtomicInteger rank = new AtomicInteger(1);
        List<RoutineRecommendationItemResponse> items = userProductRepository
                .findAllByUserIdAndUsageStatusOrderByLastUsedAtDesc(userId, UsageStatus.USING)
                .stream()
                .filter(userProduct -> userProduct.getProduct() != null)
                .limit(3)
                .map(userProduct -> toRecommendationItem(rank.getAndIncrement(), userProduct))
                .toList();
        return new RoutineRecommendationResponse(timeSlot, items);
    }

    private RoutineRecommendationItemResponse toRecommendationItem(int rank, UserProduct userProduct) {
        return new RoutineRecommendationItemResponse(
                rank,
                userProduct.getProduct().getId(),
                userProduct.getProduct().getProductName(),
                "최근에 사용한 제품이에요");
    }

    private TodayRecordResponse todayRecord(RecordTodayResponse today) {
        return new TodayRecordResponse(
                slot(today.morning()),
                slot(today.night()));
    }

    private TodayRecordSlotResponse slot(TimeSlotRecordStateResponse state) {
        return new TodayRecordSlotResponse(
                state.product().completed(),
                state.skin().completed());
    }

    private List<WeeklyCalendarDayResponse> weeklyCalendar(Long userId, DayOfWeek weekStart) {
        LocalDate today = LocalDate.now(KST);
        LocalDate weekStartDate = today.with(TemporalAdjusters.previousOrSame(weekStart));
        RecordCalendarResponse month = recordHubService.getCalendar(userId, YearMonth.from(today));
        return month.days().stream()
                .filter(day -> !day.date().isBefore(weekStartDate) && !day.date().isAfter(today))
                .map(day -> new WeeklyCalendarDayResponse(day.date(), day.morning(), day.night()))
                .toList();
    }

    private TodayReportResponse todayReport(Long userId, TimeSlot preferredTimeSlot) {
        LocalDate today = LocalDate.now(KST);
        return todaySkinRecord(userId, today, preferredTimeSlot)
                .map(skinRecord -> toTodayReport(userId, skinRecord.getRecordDate(), skinRecord.getTimeSlot(), skinRecord))
                .orElse(null);
    }

    private Optional<SkinRecord> todaySkinRecord(Long userId, LocalDate today, TimeSlot preferredTimeSlot) {
        Optional<SkinRecord> preferred = skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(
                userId,
                today,
                preferredTimeSlot
        ).filter(skinRecord -> Objects.nonNull(skinRecord.getOverallScore()));
        if (preferred.isPresent()) {
            return preferred;
        }

        return skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(userId, today).stream()
                .filter(skinRecord -> Objects.nonNull(skinRecord.getOverallScore()))
                .filter(skinRecord -> skinRecord.getTimeSlot() != preferredTimeSlot)
                .reduce((ignored, latest) -> latest);
    }

    private TodayReportResponse toTodayReport(Long userId, LocalDate recordDate, TimeSlot timeSlot,
                                              SkinRecord skinRecord) {
        int totalScore = skinRecord.getOverallScore().intValue();
        Optional<SkinRecord> previous = skinRecordRepository
                .findFirstByUserIdAndTimeSlotAndRecordDateBeforeAndOverallScoreIsNotNullOrderByRecordDateDescCapturedAtDesc(
                        userId,
                        timeSlot,
                        recordDate
                );

        Integer previousScore = previous
                .map(previousRecord -> previousRecord.getOverallScore().intValue())
                .orElse(null);
        Integer change = previousScore == null ? null : totalScore - previousScore;
        String comparedTo = previous
                .map(previousRecord -> "%s %s".formatted(previousRecord.getRecordDate(), previousRecord.getTimeSlot()))
                .orElse(null);

        return new TodayReportResponse(
                skinRecord.getId(),
                totalScore,
                previousScore,
                change,
                comparedTo,
                todayReportSummary(change)
        );
    }

    private String todayReportSummary(Integer change) {
        if (change == null) {
            return "오늘 피부 분석이 완료됐어요.";
        }
        if (change > 0) {
            return "이전 기록보다 좋아졌어요.";
        }
        if (change < 0) {
            return "이전 기록보다 낮아졌어요.";
        }
        return "이전 기록과 비슷해요.";
    }
}

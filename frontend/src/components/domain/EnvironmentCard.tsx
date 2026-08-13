import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { getHumidityGradeLabel, getUvGradeLabel, getWeatherLabel } from '@/lib/weather';
import { color, environmentTint, radius, space, typography } from '@/theme';
import type { HomeEnvironment } from '@/types/home';

type EnvironmentCardProps = {
  environment: HomeEnvironment | null;
  /** failedSections에 'environment'가 포함된 경우 true. "아직 값 없음"과 "조회 실패"를 구분합니다 (F-HOME-03 부분 실패 규칙) */
  hasFailed?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 낮 홈(S-07) 전용 환경 정보 블록.
 *
 * Phase 12 — Figma HOME-01 구조 대조 결과, 카드 경계 없이 그라데이션 배경 위에 텍스트가
 * 바로 떠 있는 구조라 `Card` 래핑을 뺐습니다(관리자님 확인, 2026-08-13). location 텍스트도
 * Figma에서 낮/밤 토글과 같은 줄에 있어서 이 컴포넌트 밖(DayHomeScreen 헤더 행)으로
 * 옮겼습니다 — 여기서는 온도·날씨·UV/습도 배지만 다룹니다.
 *
 * 온도(큰 글씨)와 날씨 설명을 Figma처럼 별도 줄로 분리했습니다. 단, Figma엔 "어제보다 2° 높아요"
 * 같은 전일 대비 문구가 있는데, `HomeEnvironment` 타입에 그 값이 아직 없어서(백엔드 미제공)
 * 지금은 넣지 않았습니다 — 값이 추가되면 `weatherLine`에 이어붙이면 됩니다.
 *
 * 날씨 아이콘은 디자인 에셋이 아직 없어서(체크포인트 A 시점 관리자 결정) 텍스트 라벨만 씁니다.
 * UV·습도는 Checkpoint 9-D에서 텍스트 나열 대신 목업처럼 알약 배지로 바꿨습니다.
 */
export function EnvironmentCard({ environment, hasFailed = false, style }: EnvironmentCardProps) {
  if (hasFailed || !environment) {
    return (
      <View style={[styles.card, style]}>
        <Text style={styles.errorText}>날씨 정보를 불러오지 못했어요.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.temperature}>{environment.temperature}°C</Text>
      <Text style={styles.weather}>{getWeatherLabel(environment.weather)}</Text>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, styles.uvBadge]}>
          <Text style={styles.uvBadgeText}>
            자외선 {environment.uvIndex} · {getUvGradeLabel(environment.uvGrade)}
          </Text>
        </View>
        <View style={[styles.badge, styles.humidityBadge]}>
          <Text style={styles.humidityBadgeText}>
            습도 {environment.humidity}% · {getHumidityGradeLabel(environment.humidityGrade)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
  },
  temperature: {
    fontSize: 40,
    fontWeight: '700',
    color: color.ink900,
  },
  weather: {
    ...typography.body,
    color: color.ink600,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginTop: space[1],
  },
  badge: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
  },
  uvBadge: {
    backgroundColor: environmentTint.uvBg,
  },
  uvBadgeText: {
    ...typography.caption,
    color: environmentTint.uvText,
    fontWeight: '600',
  },
  humidityBadge: {
    backgroundColor: environmentTint.humidityBg,
  },
  humidityBadgeText: {
    ...typography.caption,
    color: environmentTint.humidityText,
    fontWeight: '600',
  },
  errorText: {
    ...typography.body,
    color: color.statusCaution,
  },
});

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
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
 * 낮 홈(S-07) 전용 환경 정보 카드.
 * 날씨 아이콘은 디자인 에셋이 아직 없어서(체크포인트 A 시점 관리자 결정) 텍스트 라벨만 씁니다.
 * 배경 그라데이션/일러스트도 같은 이유로 이번 체크포인트에서는 넣지 않습니다.
 * UV·습도는 Checkpoint 9-D에서 텍스트 나열 대신 목업처럼 알약 배지로 바꿨습니다.
 */
export function EnvironmentCard({ environment, hasFailed = false, style }: EnvironmentCardProps) {
  if (hasFailed || !environment) {
    return (
      <Card style={[styles.card, style]}>
        <Text style={styles.errorText}>날씨 정보를 불러오지 못했어요.</Text>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, style]}>
      <Text style={styles.location}>{environment.location}</Text>
      <Text style={styles.weather}>
        {getWeatherLabel(environment.weather)} · {environment.temperature}°
      </Text>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
  },
  location: {
    ...typography.caption,
    color: color.ink600,
  },
  weather: {
    ...typography.display,
    color: color.ink900,
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

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
import { getHumidityGradeLabel, getUvGradeLabel, getWeatherLabel } from '@/lib/weather';
import { color, space, typography } from '@/theme';
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
      <View style={styles.metricRow}>
        <Text style={styles.metric}>
          자외선 {environment.uvIndex} · {getUvGradeLabel(environment.uvGrade)}
        </Text>
        <Text style={styles.metric}>
          습도 {environment.humidity}% · {getHumidityGradeLabel(environment.humidityGrade)}
        </Text>
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
  metricRow: {
    flexDirection: 'row',
    gap: space[4],
    marginTop: space[1],
  },
  metric: {
    ...typography.caption,
    color: color.ink600,
  },
  errorText: {
    ...typography.body,
    color: color.statusCaution,
  },
});

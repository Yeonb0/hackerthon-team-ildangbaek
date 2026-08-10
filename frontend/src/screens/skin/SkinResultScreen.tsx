// SkinResultScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { MetricScoreList } from '@/components/domain/MetricScoreList';
import { toMetricList } from '@/api/adapters';
import { getSkinRecordToday } from '@/api/skin';
import { ApiError } from '@/api/unwrap';
import { DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { SkinRecordResult } from '@/types/skin';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

/**
 * S-18 분석 결과. GET /skin-records/today를 항상 새로 호출합니다 — S-17에서 방금 분석을
 * 마치고 들어온 경우든, 기록 허브에서 이미 완료된 기록을 다시 보러 들어온 경우든
 * "오늘 이 시간대 기록을 보여준다"는 점에서 동일해서 같은 코드 경로로 처리합니다.
 *
 * 확인 버튼: TBD-10b A안(관리자 확인, 2026-08-09) — 기록은 SKIN-01 POST 시점에 이미
 * 저장이 끝난 상태라, 이 버튼은 추가 저장 없이 화면만 닫습니다. S-17에서 replace로
 * 넘어온 경우든 기록 허브에서 navigate로 들어온 경우든, 바로 이전 화면이 항상
 * 기록 허브(Tabs)라서 goBack 하나로 충분합니다.
 *
 * ⚠️ 기록이 아예 없는 상태로 이 화면에 들어오는 건(SKIN_RECORD_NOT_FOUND) 정상 흐름상
 * 발생하지 않습니다 — 기록 허브가 completed일 때만 이 화면으로 보내기 때문입니다.
 * 혹시 발생해도(방어적 케이스) 아래 loadError 처리로 자연스럽게 재시도 화면이 뜹니다.
 */
export function SkinResultScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'SkinResult'>>();
  const insets = useSafeAreaInsets();

  const [result, setResult] = useState<SkinRecordResult | null>(null);
  const [loadError, setLoadError] = useState<'network' | 'server' | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await getSkinRecordToday(route.params.timeSlot);
      setResult(data);
    } catch (e) {
      setLoadError(e instanceof ApiError ? 'server' : 'network');
    }
  }, [route.params.timeSlot]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = () => {
    navigation.goBack();
  };

  if (loadError) {
    return <ErrorState variant={loadError} onRetry={load} />;
  }

  if (!result) {
    return <LoadingState variant="spinner" />;
  }

  const metrics = toMetricList(result.scores, result.comparison?.changes ?? null);
  const totalDelta = result.comparison
    ? result.totalScore - result.comparison.previousTotalScore
    : null;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[5] }]}>
      <Text style={styles.title}>오늘의 피부 분석</Text>

      <View style={styles.totalScoreBlock}>
        <Text style={styles.totalScoreValue}>{result.totalScore}</Text>
        <Text style={styles.totalScoreUnit}>점</Text>
      </View>

      {totalDelta === null ? (
        <Text style={styles.totalComparison}>첫 기록입니다</Text>
      ) : (
        <Text style={styles.totalComparison}>
          {result.comparison?.comparedTo}보다 {Math.abs(totalDelta)}점{' '}
          {totalDelta > 0 ? '올랐어요' : totalDelta < 0 ? '낮아졌어요' : '똑같아요'}
        </Text>
      )}

      <Card style={styles.metricsCard}>
        <MetricScoreList items={metrics} />
      </Card>

      <Button label="확인" variant="primary" onPress={handleConfirm} style={styles.confirmButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space[5],
    paddingBottom: space[8],
    gap: space[4],
    backgroundColor: color.bg,
    flexGrow: 1,
  },
  title: {
    ...typography.h1,
    color: color.ink900,
    textAlign: 'center',
  },
  totalScoreBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: space[1],
    marginTop: space[3],
  },
  totalScoreValue: {
    ...typography.display,
    fontSize: 56,
    lineHeight: 60,
    color: color.brand700,
  },
  totalScoreUnit: {
    ...typography.h2,
    color: color.ink600,
    marginBottom: space[2],
  },
  totalComparison: {
    ...typography.caption,
    color: color.ink600,
    textAlign: 'center',
  },
  metricsCard: {
    marginTop: space[3],
  },
  confirmButton: {
    marginTop: space[5],
  },
});

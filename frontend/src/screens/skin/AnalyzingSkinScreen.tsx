// AnalyzingSkinScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { ErrorState, type ErrorVariant } from '@/components/state/ErrorState';
import { createSkinRecord } from '@/api/skin';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

// F-SKIN-03 "표시 단계" 4개를 사용자 문구로 옮긴 것입니다.
const STAGES = [
  '사진을 확인하는 중',
  '트러블 · 홍조를 분석하는 중',
  '모공 · 색소잡티를 분석하는 중',
  '전일 기록과 비교하는 중',
];

const STAGE_INTERVAL_MS = 900;
// F-SKIN-03 4단계가 최소한 한 번씩은 다 보이도록 STAGE_INTERVAL_MS × 단계 수보다
// 넉넉하게 잡습니다. 예전엔 1500ms였는데, mock 지연(1.8초)이 끝나자마자 바로
// 넘어가버려서 1단계만 체크되고 끝나는 문제가 있었습니다 — 실제 API가 이보다
// 빨리 응답해도 최소 이 시간만큼은 애니메이션이 다 돌고 나서 넘어갑니다.
const MIN_DISPLAY_MS = STAGE_INTERVAL_MS * STAGES.length + 400;

type Phase = 'analyzing' | 'faceNotDetected' | 'error';

/**
 * S-17 분석 중. 진입 즉시 SKIN-01(POST /skin-records)을 호출합니다.
 *
 * - 분석 완료 → 자동으로 S-18로 이동합니다(BR3, 사용자 조작 불필요). navigate가 아니라
 *   replace를 씁니다 — S-18에서 뒤로가기를 눌렀을 때 이 화면이 다시 뜨는 걸 막기
 *   위해서입니다(S-16→S-17 전환 때와 같은 이유, FaceCaptureScreen.tsx 참고).
 * - 얼굴 미인식(422 SKIN_FACE_NOT_DETECTED) → BR4에 따라 S-16으로 되돌립니다. 다만
 *   완전히 자동으로 튕기면 사용자가 이유를 못 보고 화면이 갑자기 바뀌는 느낌이라,
 *   이유 문구 + "재촬영하기" 버튼을 한 번 보여준 뒤 버튼을 눌러야 넘어가도록 했습니다.
 * - 그 외 에러(분석 실패·업로드 실패·타임아웃) → 이미지를 그대로 유지한 채(폐기 금지)
 *   같은 화면에서 재시도합니다.
 */
export function AnalyzingSkinScreen() {
  const navigation = useNavigation<NavProp>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<DetailStackParamList, 'AnalyzingSkin'>>();
  const { timeSlot, imageUri } = route.params;

  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('analyzing');
  const [errorVariant, setErrorVariant] = useState<ErrorVariant>('server');

  // useRef(Date.now())는 렌더 중 비순수 함수 호출로 잡힙니다(react-hooks/purity).
  // 초기값 자체는 의미가 없습니다 — submit()이 시작하자마자 항상 실제 시각으로
  // 덮어쓰기 때문에, 순수한 정적값(0)으로 시드해도 동작은 동일합니다.
  const startedAtRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const submit = useCallback(async () => {
    setPhase('analyzing');
    setStageIndex(0);
    startedAtRef.current = Date.now();
    try {
      await createSkinRecord({ timeSlot, imageUri });
      if (!isMountedRef.current) return;
      // 기록 허브(useRecordToday/useRecordCalendar)가 이 캐시를 보고 완료 여부를
      // 그리는데, 방금 새로 생긴 기록을 반영하려면 무효화해야 다음에 기록 허브로
      // 돌아갔을 때 미완료로 남아있지 않고 갱신됩니다. mock/실서버 둘 다 필요한
      // 처리입니다.
      queryClient.invalidateQueries({ queryKey: ['recordToday'] });
      queryClient.invalidateQueries({ queryKey: ['recordCalendar'] });
      const elapsed = Date.now() - startedAtRef.current;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(() => {
        if (!isMountedRef.current) return;
        navigation.replace(DetailRoutes.SkinResult, { timeSlot });
      }, wait);
    } catch (e) {
      if (!isMountedRef.current) return;
      if (e instanceof ApiError && e.code === ErrorCode.SKIN_FACE_NOT_DETECTED) {
        setPhase('faceNotDetected');
        return;
      }
      setErrorVariant(e instanceof ApiError ? 'server' : 'network');
      setPhase('error');
    }
  }, [timeSlot, imageUri, navigation, queryClient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 단계 문구 순환 — 실제 진행률을 알 수 없으니(응답이 한 번에 옴) 일정 간격으로
  // 다음 단계로 넘어가는 것처럼 보여주는 연출입니다. 분석 중 상태에서만 돕니다.
  useEffect(() => {
    if (phase !== 'analyzing') return undefined;
    const timer = setInterval(() => {
      setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase]);

  const handleRetakeFromFaceNotDetected = () => {
    navigation.replace(DetailRoutes.FaceCapture, { timeSlot });
  };

  if (phase === 'faceNotDetected') {
    return (
      <View style={styles.centerFill}>
        <Ionicons name="scan-outline" size={s(48)} color={color.ink300} />
        <Text style={styles.messageTitle}>얼굴이 잘 안 보여요</Text>
        <Text style={styles.messageDescription}>
          가이드 안에 얼굴 전체가 들어오게 다시 촬영해 주세요.
        </Text>
        <Button
          label="재촬영하기"
          variant="primary"
          onPress={handleRetakeFromFaceNotDetected}
          style={styles.retryButton}
        />
      </View>
    );
  }

  if (phase === 'error') {
    // 타임아웃/분석 실패/업로드 실패 — 화면 전환 없이 같은 이미지로 재시도합니다.
    return <ErrorState variant={errorVariant} onRetry={submit} style={styles.centerFill} />;
  }

  return (
    <View style={styles.centerFill}>
      <Image source={{ uri: imageUri }} style={styles.thumbnail} />
      <View style={styles.stageList}>
        {STAGES.map((stage, index) => (
          <View key={stage} style={styles.stageRow}>
            <Ionicons
              name={index < stageIndex ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={index <= stageIndex ? color.brand500 : color.ink300}
            />
            <Text style={[styles.stageText, index <= stageIndex && styles.stageTextActive]}>
              {stage}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
    gap: space[3],
    backgroundColor: color.bg,
  },
  thumbnail: {
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    marginBottom: space[5],
  },
  stageList: {
    gap: space[3],
    alignSelf: 'stretch',
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  stageText: {
    fontSize: 14,
    color: color.ink300,
  },
  stageTextActive: {
    color: color.ink900,
    fontWeight: '600',
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.ink900,
    marginTop: space[3],
  },
  messageDescription: {
    fontSize: 13,
    color: color.ink600,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: space[4],
  },
});

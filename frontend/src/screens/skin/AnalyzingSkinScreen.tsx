// AnalyzingSkinScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconBack, IconCheck, IconFaceScan } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { ProgressRing } from '@/components/chart/ProgressRing';
import { ErrorState, type ErrorVariant } from '@/components/state/ErrorState';
import { createSkinRecord } from '@/api/skin';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList, MainTabRoutes } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

/**
 * 분석 단계 문구.
 *
 * ⚠️ Figma(node 59:6486)는 `사진 전처리 / 트러블·홍조 분석 / 유수분 분석 / 피부 결 분석 /
 * 피부 수분 수준` 5단계로 그려져 있지만 **의도적으로 따르지 않습니다**(관리자 결정,
 * 2026-08-17). 뒤 3단계가 전부 수분·피부결 계열인데, 팀이 확정한 AI 지표는
 * 트러블/홍조/색소침착/모공 4종이고 moisture는 pores로 교체된 항목입니다. 같은 Figma
 * 파일의 FirstSkinResult·TodaySkin도 4지표로 그려져 있어 파일 내부에서 서로 어긋납니다 —
 * 확정된 4지표 쪽을 정본으로 둡니다.
 */
const STAGES = ['사진 전처리', '트러블·홍조 분석', '모공·색소잡티 분석', '전일 기록과 비교'];

const STAGE_INTERVAL_MS = 900;
// F-SKIN-03 단계가 최소한 한 번씩은 다 보이도록 STAGE_INTERVAL_MS × 단계 수보다
// 넉넉하게 잡습니다. 예전엔 1500ms였는데, mock 지연(1.8초)이 끝나자마자 바로
// 넘어가버려서 1단계만 체크되고 끝나는 문제가 있었습니다 — 실제 API가 이보다
// 빨리 응답해도 최소 이 시간만큼은 애니메이션이 다 돌고 나서 넘어갑니다.
const MIN_DISPLAY_MS = STAGE_INTERVAL_MS * STAGES.length + 400;

// Figma 얼굴 미인식 안내 3줄 (node 59:7772~59:7788).
const FACE_NOT_FOUND_TIPS = [
  '더 밝은 곳에서 촬영하기',
  '얼굴을 화면 중앙에 맞추기',
  '안경·마스크 제거하기',
];

type Phase = 'analyzing' | 'faceNotDetected' | 'error';

/**
 * S-17 분석 중. 진입 즉시 SKIN-01(POST /skin-records)을 호출합니다.
 *
 * - 분석 완료 → 자동으로 S-18로 이동합니다(BR3, 사용자 조작 불필요). navigate가 아니라
 *   replace를 씁니다 — S-18에서 뒤로가기를 눌렀을 때 이 화면이 다시 뜨는 걸 막기
 *   위해서입니다(S-16→S-17 전환 때와 같은 이유, FaceCaptureScreen.tsx 참고).
 * - 얼굴 미인식(422 SKIN_FACE_NOT_DETECTED) → BR4에 따라 S-16으로 되돌립니다. 다만
 *   완전히 자동으로 튕기면 사용자가 이유를 못 보고 화면이 갑자기 바뀌는 느낌이라,
 *   이유 문구 + "재촬영" 버튼을 한 번 보여준 뒤 버튼을 눌러야 넘어가도록 했습니다.
 * - 그 외 에러(분석 실패·업로드 실패·타임아웃) → 이미지를 그대로 유지한 채(폐기 금지)
 *   같은 화면에서 재시도합니다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-08-17(세션 13) — Figma 컬러 확정본 반영 (node 59:6470 AIAnalyzing /
 * 59:7756 FaceNotFound).
 *   - 촬영 썸네일(원형) → **원형 진행 링 + 퍼센트**로 교체(ProgressRing 신규)
 *   - 제목 "AI 분석 중이에요" + 부제 "피부 상태 프로파일링 중" 추가
 *   - 단계 행이 완료/진행중/대기 3가지 시각 상태로 분화(예전엔 완료/그 외 2가지)
 *   - 얼굴 미인식 상태가 Figma `FaceNotFound` 전용 레이아웃으로 재작성 —
 *     회색 이미지 박스 + 제목 + 안내 3줄 + 재촬영 CTA
 *
 * ⚠️ Figma FaceNotFound 하단의 "라이브러리 사진 보기"는 **넣지 않았습니다**(관리자 결정).
 * expo-image-picker가 설치돼 있지 않고 갤러리 선택 경로가 앱 어디에도 없어서, 지금
 * 넣으면 눌러도 아무 일이 없는 죽은 버튼이 됩니다.
 *
 * ⚠️ 퍼센트는 실제 진행률이 아닙니다. SKIN-01은 응답이 한 번에 오고 중간 진행률을
 * 주지 않아서, 단계 인덱스로부터 환산한 연출값입니다(마지막 단계에서도 100%가 아니라
 * 92%에서 멈춥니다 — 아직 응답 전인데 100%를 띄우면 멈춘 것처럼 보입니다).
 */
export function AnalyzingSkinScreen() {
  const navigation = useNavigation<NavProp>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<DetailStackParamList, 'AnalyzingSkin'>>();
  const insets = useSafeAreaInsets();
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
      // 기록 허브(useRecordToday/useRecordCalendar)뿐 아니라 홈 화면(useHome)도 오늘 완료
      // 여부를 캐시해서 보여줍니다 — 여기서도 무효화해야 밤 홈 "이번 주 기록" 캘린더가
      // 방금 끝낸 피부 기록을 바로 반영합니다(관리자님 실기기 확인, 2026-08-10 — 기록 허브
      // 캘린더는 되는데 밤 홈 캘린더는 안 바뀌던 문제와 같은 원인).
      queryClient.invalidateQueries({ queryKey: ['recordToday'] });
      queryClient.invalidateQueries({ queryKey: ['recordCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
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

  // ── 얼굴 미인식 (Figma FaceNotFound 59:7756) ──
  if (phase === 'faceNotDetected') {
    return (
      <View style={styles.screen}>
        <View style={[styles.notFoundNav, { paddingTop: insets.top + space[3] }]}>
          <Pressable
            onPress={handleRetakeFromFaceNotDetected}
            accessibilityRole="button"
            accessibilityLabel="다시 촬영하기"
            hitSlop={12}
          >
            <IconBack size={18} color={color.textSub} />
          </Pressable>
        </View>

        <View style={styles.notFoundBody}>
          {/* Figma는 촬영본 위에 어두운 원 + 얼굴 스캔 아이콘을 얹은 형태입니다.
              실제 촬영 이미지를 깔면 "얼굴이 안 잡혔다"는 맥락이 더 분명해집니다. */}
          <View style={styles.notFoundImageBox}>
            <View style={styles.notFoundIconCircle}>
              <IconFaceScan size={32} color={color.white} />
            </View>
          </View>

          <Text style={styles.notFoundTitle}>얼굴을 찾지 못했어요</Text>
          <View style={styles.notFoundTipList}>
            {FACE_NOT_FOUND_TIPS.map((tip) => (
              <View key={tip} style={styles.notFoundTipRow}>
                <View style={styles.notFoundTipBullet}>
                  <View style={styles.notFoundTipBulletDot} />
                </View>
                <Text style={styles.notFoundTipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.notFoundFooter, { paddingBottom: insets.bottom + space[6] }]}>
          <Button label="재촬영" variant="primary" onPress={handleRetakeFromFaceNotDetected} />
        </View>
      </View>
    );
  }

  if (phase === 'error') {
    // 타임아웃/분석 실패/업로드 실패 — 화면 전환 없이 같은 이미지로 재시도합니다.
    //
    // 문구를 여기서 주입하는 이유: Figma ErrorServer(59:8140)의 "분석을 완료하지 못했어요"는
    // 분석 화면에서만 맞는 말입니다. ErrorState의 기본 문구는 마이페이지·제품 상세 등
    // 분석과 무관한 화면에서도 쓰이므로 범용 표현으로 두고, 이 화면에서만 덮어씁니다.
    const handleGoHome = () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs', state: { routes: [{ name: MainTabRoutes.Home }] } }],
      });
    };
    return (
      <ErrorState
        variant={errorVariant}
        title="분석을 완료하지 못했어요"
        description={
          errorVariant === 'network'
            ? '와이파이 또는 데이터 연결이 필요해요'
            : '서버에 일시적인 문제가 생겼어요'
        }
        onRetry={submit}
        onGoHome={handleGoHome}
        style={styles.centerFill}
      />
    );
  }

  // ── 분석 중 (Figma AIAnalyzing 59:6470) ──
  // 마지막 단계에서 100%가 아니라 92%에서 멈추게 둡니다 — 아직 서버 응답 전인데
  // 100%를 띄우면 "다 됐는데 안 넘어간다"로 읽힙니다.
  const progress = ((stageIndex + 1) / STAGES.length) * 0.92;

  return (
    <View style={styles.analyzingScreen}>
      <ProgressRing progress={progress} style={styles.ring} />
      <Text style={styles.analyzingTitle}>AI 분석 중이에요</Text>
      <Text style={styles.analyzingSubtitle}>피부 상태 프로파일링 중</Text>

      <View style={styles.stageList}>
        {STAGES.map((stage, index) => {
          const done = index < stageIndex;
          const current = index === stageIndex;
          return (
            <View key={stage} style={styles.stageRow}>
              {done ? (
                <View style={styles.stageMarkDone}>
                  <IconCheck size={11} color={color.white} />
                </View>
              ) : (
                <View style={[styles.stageMark, current && styles.stageMarkCurrent]}>
                  {current ? <View style={styles.stageMarkCurrentDot} /> : null}
                </View>
              )}
              <Text
                style={[
                  styles.stageText,
                  done && styles.stageTextDone,
                  current && styles.stageTextCurrent,
                ]}
              >
                {stage}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // --- 분석 중 ---
  analyzingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[8],
    backgroundColor: color.bg,
  },
  ring: { marginBottom: space[8] },
  analyzingTitle: {
    fontSize: adjustFontSize(22),
    lineHeight: 31,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  analyzingSubtitle: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
    paddingTop: space[1],
    paddingBottom: 40,
  },
  stageList: {
    alignSelf: 'stretch',
    maxWidth: 320,
    gap: space[3],
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  stageMarkDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: color.borderDivider,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageMarkCurrent: { borderColor: color.brand500 },
  stageMarkCurrentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.brand500,
    opacity: 0.54,
  },
  stageText: {
    fontSize: adjustFontSize(14),
    lineHeight: 21,
    ...weightFamily('medium'),
    color: color.textMuted,
  },
  stageTextDone: { color: color.brand500 },
  stageTextCurrent: {
    color: color.textInk,
    ...weightFamily('bold'),
  },

  // --- 얼굴 미인식 (FaceNotFound) ---
  notFoundNav: {
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
  notFoundBody: {
    flex: 1,
    paddingHorizontal: space[5],
    paddingTop: space[4],
  },
  notFoundImageBox: {
    width: '100%',
    height: 208,
    borderRadius: 20,
    backgroundColor: color.surfacePhotoPlaceholderDim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notFoundIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTitle: {
    fontSize: adjustFontSize(22),
    lineHeight: 31,
    ...weightFamily('bold'),
    color: color.textInk,
    paddingTop: space[6],
  },
  notFoundTipList: {
    gap: space[3],
    paddingTop: space[5],
  },
  notFoundTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  notFoundTipBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: color.borderDivider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTipBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.textMuted,
  },
  notFoundTipText: {
    fontSize: adjustFontSize(14),
    lineHeight: 21,
    ...weightFamily('medium'),
    color: color.textInk,
  },
  notFoundFooter: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
});

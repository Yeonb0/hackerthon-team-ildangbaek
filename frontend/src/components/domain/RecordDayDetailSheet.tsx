// src/components/domain/RecordDayDetailSheet.tsx
import React, { useEffect } from 'react';
// src/components/domain/RecordDayDetailSheet.tsx
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconMoon, IconSunny } from '@/components/icons';
import { RecordDot } from '@/components/domain/RecordDot';
import { color, gradient, gradientDirection, radius, space, weightFamily } from '@/theme';
import type { RecordDayDetailResponse } from '@/types/record';
import type { RecordDotStatus } from '@/types/home';

type RecordDayDetailSheetProps = {
  visible: boolean;
  detail: RecordDayDetailResponse | null;
  /**
   * 탭한 날짜('YYYY-MM-DD'). `detail`이 아직 없어도 타이틀을 그려야 해서 따로 받습니다.
   *
   * 2026-08-19(세션 20) — 이 화면이 실 API(`GET /records/daily`)로 넘어오면서 생긴
   * 필요입니다. 목업일 땐 조회가 즉시 끝나 `detail`이 항상 준비된 상태로 들어왔지만,
   * 실서버에선 응답 전까지 null이라 예전 코드(`if (!detail) return null`)로는 **날짜를
   * 눌러도 아무 일도 안 일어나는 것처럼** 보입니다.
   */
  date: string | null;
  /** 조회 중. 시트 골격은 그대로 두고 본문만 안내 문구로 바꿉니다. */
  isLoading?: boolean;
  /** 조회 실패. `onRetry`가 있으면 다시 시도 버튼을 함께 그립니다. */
  isError?: boolean;
  onRetry?: () => void;
  onRequestClose: () => void;
  /**
   * "자세히 보기" — 그 날짜의 피부 결과 화면(S-18)으로 이동합니다.
   * REPORT-03(`GET /reports/daily`)이 이 경로 전용으로 백엔드에 이미 있습니다.
   *
   * ℹ️ 2026-08-18 — 이 시트에 있던 "수정" 버튼 2개(피부·제품)는 제거됐습니다.
   * 사유는 본문 렌더 부분의 주석을 참고하세요. 되살릴 때 `onEditSkin`·`onEditProduct`
   * prop을 여기 다시 추가하면 됩니다.
   */
  onViewSkinDetail?: () => void;
  /** 타이틀 우측 점 2개(모닝/나이트) — 캘린더 셀과 같은 상태를 보여줍니다(Figma
   * 210:1103 실측, 2026-08-15 추가). 부모가 캘린더 데이터에서 그 날짜를 찾아 넘깁니다. */
  dayStatus?: { morning: RecordDotStatus; night: RecordDotStatus };
};

const TIME_SLOT_META = {
  morning: { Icon: IconSunny, label: '모닝 루틴' },
  night: { Icon: IconMoon, label: '나이트 루틴' },
} as const;

const DISMISS_THRESHOLD = 120; // 이 이상 아래로 끌면 닫힘
const DISMISS_VELOCITY = 800; // 짧게 휙 내려도(속도만으로) 닫히는 기준
// 시트 카드가 화면 높이의 이 비율보다 작아지지 않게 고정합니다. 관리자님이 계속
// "아래가 비어있다/화면 아래가 보인다"고 지적하신 진짜 원인을 이제야 제대로
// 찾았습니다 — 콘텐츠가 짧은 날(예: 나이트 기록 없음)엔 시트가 내용물 높이만큼만
// 줄어들면서, 카드 아래로 어두워진 배경(달력 화면)이 그대로 비쳐 보였던 것입니다.
// "카드 안에 남는 흰 여백"이 문제인 줄 알고 패딩을 줄였다가 오히려 카드가 더
// 짧아져서 배경이 더 많이 드러나는 역효과가 났었습니다(2026-08-15). 최소 높이를
// 줘서 콘텐츠가 짧아도 카드가 화면 아래쪽을 계속 덮도록 고쳤습니다.
const SHEET_MIN_HEIGHT_RATIO = 0.62;

/**
 * 월간 기록 화면 날짜 탭 바텀시트. Figma Frame 10(210:1505) 실측 — "8월 5일 기록"
 * 타이틀 + 피부 기록(종합 점수, 수정 버튼) + 제품 기록(모닝/나이트 루틴 목록, 수정 버튼).
 *
 * ⚠️ 백엔드 API 없음(types/record.ts RecordDayDetailResponse 주석 참고) — 목업 데이터
 * 전용입니다.
 *
 * 2026-08-15 — 닫기 방식을 X 버튼 탭에서 아래로 드래그하는 제스처로 변경(관리자
 * 요청). RoutineEdit(Phase 11-B)에서 이미 쓰고 있는 react-native-gesture-handler +
 * react-native-reanimated 조합을 그대로 재사용했습니다 — 새 네이티브 의존성 추가
 * 없음, 이미 Dev Build 전환 완료된 상태라 바로 동작합니다.
 * RN Modal은 별도 네이티브 창(윈도우)이라 앱 최상단 GestureHandlerRootView(App.tsx)
 * 컨텍스트가 안 이어져서, 이 시트 안에 GestureHandlerRootView를 한 번 더 감쌌습니다
 * — 안 감싸면 제스처가 아예 안 잡힙니다.
 *
 * ⚠️ 호출부는 날짜가 바뀔 때마다 key={date}를 넘겨야 합니다 — 드래그 위치 리셋을
 * useEffect가 아니라 재마운트로 처리하기 때문입니다(아래 translateY 선언부 주석 참고).
 *
 * 2026-08-15 — 진입 애니메이션도 손봤습니다: 예전엔 Modal의 animationType="slide"라
 * 회색 배경과 카드가 한 몸처럼 같이 아래→위로 슬라이드했는데, 관리자 요청으로
 * "카드는 슬라이드, 배경은 서서히 어두워짐"으로 분리했습니다. Modal
 * animationType="none"으로 Modal 자체 애니메이션을 끄고 직접 애니메이션합니다.
 *
 * ⚠️ 처음엔 reanimated의 `entering`(레이아웃 애니메이션 — FadeIn/SlideInDown)으로
 * 만들었는데, 웹에서는 멀쩡한데 실기기에서만 카드가 화면을 다 못 채우는 문제가
 * 있었습니다(관리자님 리포트, 2026-08-15). 원인은 reanimated의 Layout Animation이
 * RN Modal(별도 네이티브 창)과 궁합이 안 좋다는 알려진 제약 — 웹의 Modal 구현은
 * 별도 네이티브 루트가 없어서 우연히 문제가 안 드러났던 것입니다. `entering` 대신
 * 일반 `useAnimatedStyle`(opacity/transform만 다루는, Layout Animation이 아닌
 * 순수 스타일 애니메이션)로 바꿔서 이 문제를 피했습니다 — entranceProgress
 * 하나만 마운트 시 0→1로 애니메이션하고, 배경 opacity·시트 위치 둘 다 이 값에서
 * 파생시킵니다.
 */
export function RecordDayDetailSheet({
  visible,
  detail,
  date,
  isLoading = false,
  isError = false,
  onRetry,
  onRequestClose,
  onViewSkinDetail,
  dayStatus,
}: RecordDayDetailSheetProps) {
  const translateY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // 열 때마다 드래그 위치가 0에서 시작해야 하는데, 같은 컴포넌트 인스턴스를 재사용하면
  // (visible만 토글) 지난번 드래그 값이 남아있을 수 있습니다. useEffect로 리셋하는
  // 방식은 reanimated의 useSharedValue와 react-hooks/immutability 규칙이 충돌해서
  // (같은 값을 effect와 제스처 양쪽에서 건드리면 안 됨) 대신 부모(RecordCalendarScreen)가
  // 날짜가 바뀔 때마다 key={date}로 이 컴포넌트를 통째로 새로 마운트하는 방식을
  // 씁니다 — 그러면 useSharedValue(0)이 항상 새로 0에서 시작합니다.

  // 진입 애니메이션 전용 값 — 드래그(translateY)와 달리 제스처에서 안 건드리고
  // 마운트 시 이 useEffect 한 곳에서만 설정하므로 react-hooks/immutability와 안
  // 부딪힙니다(위 translateY 리셋 관련 주석의 문제는 "같은 값을 effect와 제스처
  // 양쪽에서" 건드릴 때만 발생 — entranceProgress는 effect에서만 건드립니다).
  const entranceProgress = useSharedValue(0);
  useEffect(() => {
    entranceProgress.value = withTiming(1, { duration: 280 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // 위로는 못 끌게(음수 방지) — 시트는 아래로 내려서 닫는 용도만입니다.
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldDismiss = translateY.value > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        runOnJS(onRequestClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - entranceProgress.value) * windowHeight + translateY.value }],
  }));

  // 날짜조차 없으면 열 이유가 없습니다(부모가 visible=false로 두는 상태).
  if (!date) return null;

  const [, monthStr, dayStr] = date.split('-');
  const title = `${Number(monthStr)}월 ${Number(dayStr)}일 기록`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} accessibilityRole="button" />

          <Animated.View
            style={[
              styles.sheet,
              {
                minHeight: windowHeight * SHEET_MIN_HEIGHT_RATIO,
                paddingBottom: Math.max(insets.bottom, space[4]),
              },
              animatedSheetStyle,
            ]}
            onStartShouldSetResponder={() => true}
          >
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragArea}>
                <View style={styles.handle} />
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{title}</Text>
                  {dayStatus && (
                    <View style={styles.titleDots}>
                      <RecordDot slot="morning" status={dayStatus.morning} />
                      <RecordDot slot="night" status={dayStatus.night} />
                    </View>
                  )}
                </View>
              </View>
            </GestureDetector>

            {/* 2026-08-19(세션 20) — 실 API 전환에 따른 조회 상태 처리.
                시트 골격(핸들·타이틀)은 항상 그대로 두고 본문만 갈아 끼웁니다 — 시트가
                통째로 안 뜨면 사용자 입장에선 탭이 씹힌 것과 구분되지 않습니다. */}
            {isLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={color.brand500} />
                <Text style={styles.stateText}>기록을 불러오는 중이에요</Text>
              </View>
            ) : isError || !detail ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>기록을 불러오지 못했어요</Text>
                {onRetry && (
                  <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.retryLabel}>다시 시도</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
            {/* 2026-08-18 — Figma에는 여기에도 "수정" 버튼이 있지만 제거했습니다(관리자
                결정 A안). 지난 날짜 피부 기록은 **고칠 수 있는 방법이 없습니다** — 백엔드에
                수정 API가 없고, 다시 POST하면 슬롯당 1회 제약에 걸립니다
                (`ErrorCode.SKIN_ALREADY_RECORDED_IN_SLOT`, 409). 애초에 지난 날짜 피부를
                고치려면 그날 얼굴을 다시 찍어야 하는데 성립하지 않습니다. 누를 수 있어
                보이는 걸 눌렀다가 거절당하는 것보다 없는 편이 낫다는 판단입니다.
                되돌리려면 이 자리에 sectionHeader 행을 되살리면 됩니다. */}
            <Text style={styles.sectionTitle}>피부 기록</Text>
            <View style={styles.skinCard}>
              {detail.skinScore !== null ? (
                <View style={styles.skinCardRow}>
                  <LinearGradient
                    colors={gradient.brand}
                    start={gradientDirection.iconBox.start}
                    end={gradientDirection.iconBox.end}
                    style={styles.scoreCircle}
                  >
                    <Text style={styles.scoreText}>{detail.skinScore}</Text>
                  </LinearGradient>
                  <View style={styles.skinCardBody}>
                    <Text style={styles.skinCardTitle}>종합 점수 {detail.skinScore}</Text>
                    <Text style={styles.skinCardSubtitle}>트러블 · 홍조 · 색소잡티 · 모공 분석</Text>
                    <Pressable accessibilityRole="button" onPress={onViewSkinDetail} hitSlop={8}>
                      <Text style={styles.viewDetailLabel}>자세히 보기 →</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={styles.skinCardEmpty}>이 날은 피부 기록이 없어요</Text>
              )}
            </View>

            {/* 2026-08-18 — 제품 기록 "수정" 버튼도 제거했습니다(관리자 결정). 피부 쪽과
                달리 백엔드에는 `PATCH /product-records/{recordId}`(PRODUCT-06)가 있지만,
                이 시트가 쓰는 `RecordDayDetailResponse`에 `recordId`가 없어 어느 기록을
                고칠지 지정할 수가 없습니다. 목적지 없는 버튼을 남겨두면 눌렀다가 아무 일도
                안 일어나는 경험이라, 연결 준비가 될 때까지 감춥니다.
                되살리려면 recordId를 응답·목업에 싣고 이 자리에 sectionHeader 행을
                되돌린 뒤 onEditProduct를 연결하면 됩니다. */}
            <Text style={styles.sectionTitle}>제품 기록</Text>
            <View style={styles.productCard}>
              {(['morning', 'night'] as const).map((slot, index) => {
                const data = slot === 'morning' ? detail.morningProducts : detail.nightProducts;
                const meta = TIME_SLOT_META[slot];
                const SlotIcon = meta.Icon;
                const dotColor = slot === 'morning' ? color.calendarMorningDot : color.brand500;
                return (
                  <React.Fragment key={slot}>
                    {index > 0 && <View style={styles.slotDivider} />}
                    <View style={styles.slotSection}>
                      <View style={styles.slotHeader}>
                        <SlotIcon size={14} color={color.textInk} />
                        <Text style={styles.slotHeaderText}>{meta.label}</Text>
                        {data.completed && (
                          <LinearGradient
                            colors={gradient.brand}
                            start={gradientDirection.iconBox.start}
                            end={gradientDirection.iconBox.end}
                            style={styles.slotCheckBadge}
                          >
                            <IconCheck size={10} color={color.bg} />
                          </LinearGradient>
                        )}
                      </View>
                      {data.items.length > 0 ? (
                        data.items.map((item) => (
                          <View key={item.name} style={styles.itemRow}>
                            <View style={[styles.itemDot, { backgroundColor: dotColor }]} />
                            <Text style={styles.itemText}>{item.name}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.slotEmptyText}>기록 없음</Text>
                      )}
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim40,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    gap: space[3],
    // paddingBottom은 안전영역(홈 인디케이터)에 맞춰 동적으로 줍니다(아래 컴포넌트에서
    // 계산) — 고정 space[8](32)를 쓰던 예전엔 홈 인디케이터가 없는 기기에서도 늘
    // 큰 여백이 남아 "아래쪽이 비어 보인다"는 지적을 받았습니다(2026-08-15).
  },
  // 조회 중·실패 시 본문 자리. 시트 최소 높이가 이미 확보돼 있어 여기서는 여백만 줍니다.
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    paddingVertical: space[8],
  },
  stateText: {
    ...weightFamily('medium'),
    fontSize: 13,
    color: color.textSub,
  },
  retryLabel: {
    ...weightFamily('bold'),
    fontSize: 13,
    color: color.brand500,
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: space[3],
    paddingBottom: space[2],
    gap: space[2],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.border,
  },
  title: {
    ...weightFamily('bold'),
    fontSize: 16,
    color: color.textInk,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleDots: {
    flexDirection: 'row',
    gap: 4,
  },
  // sectionHeader/editLabel — "수정" 버튼 2개를 제거하면서 함께 삭제했습니다
  // (2026-08-18). 버튼을 되살리려면 이 두 스타일도 같이 되돌려야 합니다.
  sectionTitle: {
    ...weightFamily('bold'),
    fontSize: 13,
    color: color.textInk,
  },
  skinCard: {
    backgroundColor: color.surfaceLavenderPale,
    borderRadius: radius.lg,
    padding: space[4],
    gap: space[3],
  },
  skinCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...weightFamily('bold'),
    fontSize: 21,
    color: color.bg,
  },
  skinCardBody: {
    flex: 1,
    gap: 6,
  },
  skinCardTitle: {
    ...weightFamily('bold'),
    fontSize: 14,
    color: color.textInk,
  },
  skinCardSubtitle: {
    ...weightFamily('medium'),
    fontSize: 10,
    color: color.textSub,
  },
  skinCardEmpty: {
    ...weightFamily('medium'),
    fontSize: 12,
    color: color.textSub,
  },
  viewDetailLabel: {
    ...weightFamily('semibold'),
    fontSize: 12,
    color: color.brand700,
    marginTop: 2,
  },
  productCard: {
    backgroundColor: color.surfaceLavenderPale,
    borderRadius: radius.lg,
    padding: space[4],
    gap: space[4],
  },
  slotSection: {
    gap: space[2],
  },
  slotDivider: {
    height: 1,
    backgroundColor: color.borderDividerFaint,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  slotHeaderText: {
    ...weightFamily('bold'),
    fontSize: 13,
    color: color.textInk,
    flex: 1,
  },
  slotCheckBadge: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingLeft: space[2],
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  itemText: {
    ...weightFamily('medium'),
    fontSize: 11,
    color: color.textInk,
  },
  slotEmptyText: {
    ...weightFamily('medium'),
    fontSize: 12,
    color: color.textSub,
    paddingLeft: space[2],
  },
});